"""Risk Cop: Monte Carlo over price/spread/slippage; enforces platform risk
gates. On breach it raises a correction report back to the Architect -- it
does not warn and pass (CLAUDE.md).

Stub. Real implementation runs the 5,000-permutation Monte Carlo declared in
strategy["backtest_config"]["monte_carlo"]. Gate thresholds below are
deterministic and hardcoded here, not derived from prompts or LLM output,
per CLAUDE.md: "Risk gates are deterministic and hardcoded in config, not
prompts. No agent may override them."
"""

from __future__ import annotations

from typing import Any, Literal

from cip.state import PipelineState

# Platform limits. Changing these is a product decision, not something an
# agent (or a user prompt) can influence at runtime.
RISK_GATES = {
    "max_drawdown_pct": 25.0,
    "min_expectancy": 0.0,
    "min_profit_factor": 1.0,
}

# Loop-back safety valve: without this, a strategy that keeps breaching (and
# an Architect stub/LLM that keeps re-emitting the same fix) would cycle
# forever. Three corrections is generous for a deterministic stub; revisit
# once the Architect can actually incorporate correction_notes.
MAX_CORRECTIONS = 3


def risk_cop_node(state: PipelineState) -> dict[str, Any]:
    results = state["backtest_results"]
    breaches = []
    if results["max_drawdown_pct"] > RISK_GATES["max_drawdown_pct"]:
        breaches.append(
            f"max_drawdown_pct {results['max_drawdown_pct']} exceeds platform limit "
            f"{RISK_GATES['max_drawdown_pct']}"
        )
    if results["expectancy"] <= RISK_GATES["min_expectancy"]:
        breaches.append(
            f"expectancy {results['expectancy']} is not positive "
            f"(minimum {RISK_GATES['min_expectancy']})"
        )
    if results["profit_factor"] < RISK_GATES["min_profit_factor"]:
        breaches.append(
            f"profit_factor {results['profit_factor']} below platform floor "
            f"{RISK_GATES['min_profit_factor']}"
        )

    strategy = state["strategy"]
    risk_report = {
        "breached": bool(breaches),
        "monte_carlo_iterations": strategy["backtest_config"]["monte_carlo"]["iterations"],
        "correction_notes": breaches,
    }

    correction_history = list(state.get("correction_history", []))
    if breaches:
        correction_history.extend(breaches)

    if not breaches:
        status: Literal["approved", "designing", "rejected"] = "approved"
    elif len(correction_history) > MAX_CORRECTIONS:
        status = "rejected"
    else:
        status = "designing"

    return {
        "risk_report": risk_report,
        "correction_history": correction_history,
        "status": status,
    }


def risk_gate_edge(state: PipelineState) -> Literal["approved", "corrected", "rejected"]:
    status = state["status"]
    if status == "approved":
        return "approved"
    if status == "rejected":
        return "rejected"
    return "corrected"

