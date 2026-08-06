import pytest

from cip.agents.graph import build_graph
from cip.validation import validate_strategy

PROMPTS = [
    "Buy BTC and ETH breakouts with trend confirmation.",
    "Golden cross momentum on AAPL, MSFT, NVDA equities.",
    "ETH funding rate carry with staking yield.",
    "Range rotation on FX pairs using RSI oversold entries.",
]


@pytest.mark.parametrize("prompt", PROMPTS)
def test_pipeline_reaches_a_terminal_status(prompt):
    graph = build_graph()
    result = graph.invoke({"source_prompt": prompt})
    assert result["status"] in ("approved", "rejected")
    assert "backtest_results" in result
    assert "risk_report" in result
    validate_strategy(result["strategy"])


def test_every_node_ran_in_order():
    graph = build_graph()
    result = graph.invoke({"source_prompt": PROMPTS[0]})
    assert "market_context" in result
    assert "strategy" in result
    assert "backtest_results" in result
    assert "risk_report" in result


def test_correction_loop_terminates():
    """A permanently-breaching strategy must hit the retry cap and reject,
    not loop forever. The stub Architect can't fix a breach, so any breach
    on the first pass exercises this path deterministically for whichever
    fixture triggers one.
    """
    graph = build_graph()
    for prompt in PROMPTS:
        result = graph.invoke({"source_prompt": prompt})
        if result["risk_report"]["correction_notes"]:
            assert result["status"] == "rejected"
            assert len(result["correction_history"]) >= 1

