"""Backtest Engine: expectancy, Sharpe, Sortino, max drawdown, profit factor.

Stub. Real implementation runs vectorbt/LEAN over point-in-time-adjusted
data with a chronological 70/30 split and the fee/slippage model declared in
strategy["backtest_config"] (see docs/architecture.md and the backtest
integrity rules in CLAUDE.md). This stub derives deterministic pseudo-metrics
from the strategy id so results are reproducible in tests, and returns a
small distribution array rather than a single best run -- matching the real
contract shape even though the numbers are fake.
"""

from __future__ import annotations

import hashlib
import random
from typing import Any

from cip.state import PipelineState
from cip.validation import validate_strategy


def _seeded_rng(strategy_id: str) -> random.Random:
    seed = int(hashlib.sha256(strategy_id.encode()).hexdigest(), 16) % (2**32)
    return random.Random(seed)


def backtest_engine_node(state: PipelineState) -> dict[str, Any]:
    strategy = state["strategy"]
    # Defense in depth: re-validate at this boundary too, in case a caller
    # ever reaches this node without going through the Architect.
    validate_strategy(strategy)

    rng = _seeded_rng(strategy["id"])
    expectancy = round(rng.uniform(0.05, 0.6), 4)
    distribution = [
        {"run": i, "expectancy": round(expectancy + rng.uniform(-0.15, 0.15), 4)}
        for i in range(5)
    ]
    results = {
        "expectancy": expectancy,
        "sharpe": round(rng.uniform(0.4, 1.6), 2),
        "sortino": round(rng.uniform(0.5, 2.2), 2),
        "max_drawdown_pct": round(rng.uniform(8, 30), 2),
        "profit_factor": round(rng.uniform(1.0, 1.8), 2),
        "win_rate_pct": round(rng.uniform(35, 45), 1),
        "distribution": distribution,
    }
    return {"backtest_results": results, "status": "risk_review"}
