"""F2/F3 contract tests: symbol directory search and asset analysis.

Runs entirely offline: the static seed covers the directory, and the
analysis endpoint falls back to the deterministic fixture provider (marked
stub) when no real provider is reachable/configured.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from api.main import create_app


@pytest.fixture()
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("CIP_SKIP_SYMBOL_SYNC", "1")
    monkeypatch.delenv("POLYGON_API_KEY", raising=False)
    app = create_app(db_url=f"sqlite:///{tmp_path / 'test.db'}")
    with TestClient(app) as test_client:
        yield test_client


def test_search_apple_returns_aapl(client):
    results = client.get("/symbols?q=apple").json()
    assert results, "expected at least one result for 'apple'"
    assert results[0]["ticker"] == "AAPL"


def test_search_bitcoin_returns_btcusdt(client):
    results = client.get("/symbols?q=bitcoin").json()
    assert any(r["ticker"] == "BTCUSDT" for r in results)


def test_search_exact_ticker_ranks_first(client):
    results = client.get("/symbols?q=BTCUSDT").json()
    assert results[0]["ticker"] == "BTCUSDT"


def test_search_unknown_returns_empty_list_not_error(client):
    response = client.get("/symbols?q=zzzznotreal")
    assert response.status_code == 200
    assert response.json() == []


def test_analysis_renders_for_fx_symbol_offline(client):
    analysis = client.get("/assets/EURUSD/analysis?timeframe=4h").json()
    assert analysis["symbol"] == "EURUSD"
    assert analysis["stub"] is True  # no POLYGON_API_KEY -> fixture data, badged
    assert len(analysis["candles"]) == 400
    latest = analysis["latest"]
    assert latest["trend"]["direction"] in ("uptrend", "downtrend", "ranging")
    assert latest["momentum"]["rsi"] is not None
    assert latest["volatility"]["atr_pct"] is not None
    assert latest["volume"]["ratio"] is not None
    for signal in analysis["signals"]:
        assert signal["type"] in (
            "breakout",
            "pullback",
            "momentum",
            "trend_continuation",
            "reversal",
        )
        assert 0.0 <= signal["score"] <= 1.0


def test_analysis_equity_offline_is_stub_badged(client):
    analysis = client.get("/assets/AAPL/analysis?timeframe=1d").json()
    assert analysis["stub"] is True
    assert analysis["data_source"] == "fixture"


def test_analysis_unknown_symbol_is_honest_404(client):
    response = client.get("/assets/ZZZZNOTREAL/analysis")
    assert response.status_code == 404
    assert "spelling" in response.json()["detail"]


def test_analysis_rejects_subhour_timeframe(client):
    # Sub-hour timeframes are structurally excluded (CLAUDE.md non-goals).
    assert client.get("/assets/EURUSD/analysis?timeframe=15m").status_code == 422
