"""Strategy Architect: maps NL concepts to typed strategy JSON.

Stub. The real Architect is an LLM call, constrained to emit only strategy
JSON that validates against schemas/strategy.json -- never raw code (see
CLAUDE.md hard rules). Until that's wired up, this stub picks the closest
matching fixture by keyword so the graph is runnable end to end; replace
`_select_fixture` with the real generation call and keep the
validate_strategy() gate exactly where it is.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from cip.state import PipelineState
from cip.validation import validate_strategy

_FIXTURES_DIR = Path(__file__).resolve().parents[3] / "fixtures" / "strategies"

_KEYWORD_FIXTURES = (
    (("carry", "funding", "staking"), "funding_rate_carry_eth.json"),
    (("range", "rotation", "rsi", "oversold"), "range_rotation_forex.json"),
    (("equity", "aapl", "msft", "nvda", "golden cross"), "momentum_breakout_equity.json"),
)
_DEFAULT_FIXTURE = "momentum_breakout_crypto.json"


def _select_fixture(source_prompt: str) -> dict[str, Any]:
    lowered = source_prompt.lower()
    for keywords, filename in _KEYWORD_FIXTURES:
        if any(kw in lowered for kw in keywords):
            path = _FIXTURES_DIR / filename
            break
    else:
        path = _FIXTURES_DIR / _DEFAULT_FIXTURE
    with path.open() as f:
        return json.load(f)


def strategy_architect_node(state: PipelineState) -> dict[str, Any]:
    strategy = _select_fixture(state["source_prompt"])
    # A real Architect would incorporate state["market_context"] and, on a
    # loop-back from Risk Cop, state["correction_history"] to revise the
    # strategy. The stub can't revise, so a breach will loop until the Risk
    # Cop's retry cap forces a rejection -- that cap is load-bearing, not
    # optional, until real correction logic exists.
    validate_strategy(strategy)
    return {"strategy": strategy, "status": "backtesting"}
