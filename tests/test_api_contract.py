"""P1 contract tests: POST /strategies returns an id, SSE emits the four
agent tags in order, and the run/strategy payloads round-trip the schema.
"""

from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient

from api.main import create_app
from api.pipeline import AGENT_TAGS
from cip.validation import validate_strategy

# Deterministic via the stub Architect's keyword routing + seeded metrics:
# the equity fixture passes every risk gate; the forex fixture breaches the
# 25% drawdown gate and must exit through the correction loop as rejected.
APPROVING_PROMPT = "Golden cross momentum on AAPL, MSFT, NVDA equities."
BREACHING_PROMPT = "Range rotation on FX pairs using RSI oversold entries."

EXPECTED_TAG_ORDER = [
    AGENT_TAGS["market_scout"],
    AGENT_TAGS["strategy_architect"],
    AGENT_TAGS["backtest_engine"],
    AGENT_TAGS["risk_cop"],
]


@pytest.fixture()
def client(tmp_path):
    app = create_app(db_url=f"sqlite:///{tmp_path / 'test.db'}")
    with TestClient(app) as test_client:
        yield test_client


def _run_pipeline(client: TestClient, prompt: str) -> dict:
    response = client.post("/strategies", json={"prompt": prompt})
    assert response.status_code == 202
    run_id = response.json()["run_id"]
    assert run_id.startswith("run_")
    # TestClient executes background tasks before returning, so the run
    # is terminal by the time we read it back.
    run = client.get(f"/runs/{run_id}").json()
    return run


def test_post_strategies_returns_id_and_reaches_terminal_status(client):
    run = _run_pipeline(client, APPROVING_PROMPT)
    assert run["status"] == "approved"
    assert run["strategy_id"]
    assert run["backtest_results"] is not None
    assert run["risk_report"]["breached"] is False
    assert run["finished_at"] is not None


def test_agent_tags_emitted_in_order(client):
    run = _run_pipeline(client, APPROVING_PROMPT)
    tags = [e["tag"] for e in run["events"] if e["type"] == "agent_tag"]
    assert tags == EXPECTED_TAG_ORDER


def test_sse_replays_agent_tags_in_order(client):
    run = _run_pipeline(client, APPROVING_PROMPT)
    tags = []
    with client.stream("GET", f"/events?run_id={run['id']}") as response:
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/event-stream")
        for line in response.iter_lines():
            if line.startswith("event: agent_tag"):
                tags.append("pending")
            elif line.startswith("data: ") and tags and tags[-1] == "pending":
                tags[-1] = json.loads(line[len("data: ") :])["tag"]
    assert tags == EXPECTED_TAG_ORDER


def test_breaching_run_loops_and_rejects(client):
    run = _run_pipeline(client, BREACHING_PROMPT)
    assert run["status"] == "rejected"
    assert len(run["correction_history"]) >= 1
    tags = [e["tag"] for e in run["events"] if e["type"] == "agent_tag"]
    # The correction loop re-runs Architect -> Backtest -> Risk Cop, so the
    # Architect tag appears more than once before the retry cap rejects.
    assert tags.count(AGENT_TAGS["strategy_architect"]) > 1
    assert run["events"][-1]["type"] == "run_finished"


def test_strategy_payload_validates_against_schema(client):
    run = _run_pipeline(client, APPROVING_PROMPT)
    strategy = client.get(f"/strategies/{run['strategy_id']}").json()
    validate_strategy(strategy["spec"])  # must not raise
    # Paper invariant: live execution is unrepresentable end to end.
    assert strategy["spec"]["execution"]["mode"] == "paper"
    assert strategy["spec"]["execution"]["requires_user_approval"] is True


def test_empty_prompt_is_rejected(client):
    assert client.post("/strategies", json={"prompt": ""}).status_code == 422


def test_list_endpoints_return_recent_items(client):
    approved = _run_pipeline(client, APPROVING_PROMPT)
    _run_pipeline(client, BREACHING_PROMPT)

    strategies = client.get("/strategies").json()
    assert {s["id"] for s in strategies} >= {approved["strategy_id"]}
    assert all("name" in s and "archetype" in s for s in strategies)

    runs = client.get("/runs").json()
    assert len(runs) == 2
    filtered = client.get(f"/runs?strategy_id={approved['strategy_id']}").json()
    assert [r["id"] for r in filtered] == [approved["id"]]


def test_unknown_ids_return_404(client):
    assert client.get("/runs/run_nope").status_code == 404
    assert client.get("/strategies/strat_nope").status_code == 404
    assert client.get("/events?run_id=run_nope").status_code == 404
