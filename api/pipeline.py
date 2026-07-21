"""Executes one LangGraph pipeline run, persisting each agent status tag as
it happens and publishing it to SSE subscribers.

The tag strings are product contract — the Strategy Builder renders them
verbatim as the pipeline theater. Change them only together with the
frontend.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session, sessionmaker

from api.events import EventBus
from api.models import PipelineRunRow, StrategyRow
from cip.agents.graph import build_graph
from cip.validation import StrategyValidationError

AGENT_TAGS = {
    "market_scout": "[Market Scout complete]",
    "strategy_architect": "[Strategy Architect compiling]",
    "backtest_engine": "[Backtest Engine running]",
    "risk_cop": "[Risk Cop simulating]",
}
MAX_CORRECTION_ATTEMPTS = 3
TERMINAL_EVENT = "run_finished"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def execute_run(session_factory: sessionmaker, bus: EventBus, run_id: str) -> None:
    events: list[dict[str, Any]] = []

    def record(session: Session, run: PipelineRunRow, type_: str, **payload: Any) -> None:
        event = {"seq": len(events), "type": type_, "run_id": run_id, "ts": _now(), **payload}
        events.append(event)
        # Reassign (never mutate in place) so SQLAlchemy sees the JSON change.
        run.events = list(events)
        session.commit()
        bus.publish(event)

    with session_factory() as session:
        run = session.get(PipelineRunRow, run_id)
        if run is None:
            return
        run.status = "running"
        record(session, run, "run_started")

        state: dict[str, Any] = {"source_prompt": run.prompt}
        corrections = 0
        try:
            for update in build_graph().stream(state, stream_mode="updates"):
                for node, partial in update.items():
                    state.update(partial or {})
                    tag = AGENT_TAGS.get(node)
                    if tag:
                        record(session, run, "agent_tag", node=node, tag=tag)
                    if node == "risk_cop" and state.get("status") == "designing":
                        corrections += 1
                        record(
                            session,
                            run,
                            "agent_tag",
                            node="risk_cop",
                            tag=f"[Correction attempt {corrections} of {MAX_CORRECTION_ATTEMPTS}]",
                        )
        except StrategyValidationError as exc:
            run.status = "failed"
            run.finished_at = _now()
            record(session, run, TERMINAL_EVENT, status="failed", errors=exc.errors)
            return

        strategy = state.get("strategy")
        if strategy is not None:
            existing = session.get(StrategyRow, strategy["id"])
            if existing is None:
                session.add(StrategyRow(id=strategy["id"], spec=strategy, created_at=_now()))
            else:
                existing.spec = strategy
            run.strategy_id = strategy["id"]

        run.status = state.get("status", "failed")
        run.backtest_results = state.get("backtest_results")
        run.risk_report = state.get("risk_report")
        run.correction_history = state.get("correction_history", [])
        run.finished_at = _now()
        if run.status == "approved":
            verdict = "[Strategy approved]"
        else:
            breaches = len((state.get("risk_report") or {}).get("correction_notes", []))
            verdict = (
                f"[Strategy rejected — {breaches} gate breaches after "
                f"{MAX_CORRECTION_ATTEMPTS} correction attempts]"
            )
        record(session, run, "agent_tag", node="verdict", tag=verdict)
        record(session, run, TERMINAL_EVENT, status=run.status, strategy_id=run.strategy_id)
