"""LangGraph state that flows through the four-agent loop.

`strategy` is the only field with an external contract -- it must always
validate against schemas/strategy.json (see validation.py). Everything else
here is internal pipeline bookkeeping and is free to evolve without a schema
migration.
"""

from __future__ import annotations

from typing import Any, Literal, NotRequired, TypedDict

Status = Literal[
    "scouting",
    "designing",
    "backtesting",
    "risk_review",
    "approved",
    "rejected",
]


class MarketContext(TypedDict):
    macro_notes: list[str]
    order_book_flow: dict[str, Any]
    sentiment: dict[str, Any]


class BacktestResults(TypedDict):
    expectancy: float
    sharpe: float
    sortino: float
    max_drawdown_pct: float
    profit_factor: float
    win_rate_pct: float
    distribution: list[dict[str, float]]


class RiskReport(TypedDict):
    breached: bool
    monte_carlo_iterations: int
    correction_notes: list[str]


class PipelineState(TypedDict):
    source_prompt: str
    market_context: NotRequired[MarketContext]
    strategy: NotRequired[dict[str, Any]]
    backtest_results: NotRequired[BacktestResults]
    risk_report: NotRequired[RiskReport]
    correction_history: NotRequired[list[str]]
    status: NotRequired[Status]

