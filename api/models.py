"""Persistence rows for P1: strategies and pipeline runs.

The `spec` column is the strategy JSON contract (schemas/strategy.json);
it is validated at every agent boundary before it gets here and the API
never invents fields on top of it. Timestamps are stored as ISO-8601 UTC
strings. Remaining ADR-0002 tables (variants, decisions, alerts, ...)
land with the phases that need them.
"""

from __future__ import annotations

from sqlalchemy import JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from api.db import Base


class StrategyRow(Base):
    __tablename__ = "strategies"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    spec: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[str] = mapped_column(String(40))


class PipelineRunRow(Base):
    __tablename__ = "pipeline_runs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    prompt: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(16), default="queued")
    strategy_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    events: Mapped[list] = mapped_column(JSON, default=list)
    backtest_results: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    risk_report: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    correction_history: Mapped[list | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[str] = mapped_column(String(40))
    finished_at: Mapped[str | None] = mapped_column(String(40), nullable=True)

    def as_dict(self) -> dict:
        return {
            "id": self.id,
            "prompt": self.prompt,
            "status": self.status,
            "strategy_id": self.strategy_id,
            "events": self.events or [],
            "backtest_results": self.backtest_results,
            "risk_report": self.risk_report,
            "correction_history": self.correction_history or [],
            "created_at": self.created_at,
            "finished_at": self.finished_at,
        }

