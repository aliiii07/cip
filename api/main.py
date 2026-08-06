"""FastAPI app wrapping the src/cip pipeline (ADR-0002).

Run locally: `uvicorn api.main:app --port 8000`.
"""

from __future__ import annotations

import asyncio
import json
import os
import secrets
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from api.analysis import get_analysis
from api.db import DEFAULT_DB_URL, Base, make_engine, make_session_factory
from api.events import EventBus
from api.models import PipelineRunRow, StrategyRow
from api.pipeline import TERMINAL_EVENT, execute_run
from api.symbols import SymbolRow, search_symbols, seed_static_symbols, sync_binance_symbols


class StrategyRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=2000)


def _sse(event: dict) -> str:
    return f"event: {event['type']}\ndata: {json.dumps(event)}\n\n"


def create_app(db_url: str = DEFAULT_DB_URL) -> FastAPI:
    engine = make_engine(db_url)
    Base.metadata.create_all(engine)
    session_factory = make_session_factory(engine)
    bus = EventBus()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        bus.bind(asyncio.get_running_loop())
        seed_static_symbols(session_factory)
        sync_task = None
        if not os.environ.get("CIP_SKIP_SYMBOL_SYNC"):
            sync_task = asyncio.create_task(sync_binance_symbols(session_factory))
        yield
        if sync_task is not None:
            sync_task.cancel()

    app = FastAPI(title="CIP API", lifespan=lifespan)
    app.state.session_factory = session_factory
    app.state.bus = bus
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.post("/strategies", status_code=202)
    def create_strategy(body: StrategyRequest, background: BackgroundTasks) -> dict:
        run_id = f"run_{secrets.token_hex(6)}"
        with session_factory() as session:
            session.add(
                PipelineRunRow(
                    id=run_id,
                    prompt=body.prompt,
                    status="queued",
                    events=[],
                    created_at=datetime.now(timezone.utc).isoformat(),
                )
            )
            session.commit()
        background.add_task(execute_run, session_factory, bus, run_id)
        return {"run_id": run_id, "status": "queued"}

    @app.get("/symbols")
    def symbols(q: str = "") -> list[dict]:
        with session_factory() as session:
            return search_symbols(session, q)

    @app.get("/assets/{symbol}/analysis")
    async def asset_analysis(symbol: str, timeframe: str = "4h") -> dict:
        if timeframe not in ("1h", "4h", "1d"):
            raise HTTPException(status_code=422, detail="timeframe must be 1h, 4h, or 1d")
        with session_factory() as session:
            row = session.get(SymbolRow, symbol.upper())
            if row is None or not row.active:
                raise HTTPException(
                    status_code=404,
                    detail="Unknown symbol — check the ticker spelling or search the directory.",
                )
            symbol_dict = row.as_dict()
        return await get_analysis(symbol_dict, timeframe)

    @app.get("/strategies")
    def list_strategies() -> list[dict]:
        with session_factory() as session:
            rows = session.query(StrategyRow).order_by(StrategyRow.created_at.desc()).all()
            return [
                {
                    "id": row.id,
                    "name": row.spec.get("name"),
                    "archetype": row.spec.get("archetype"),
                    "asset_class": row.spec.get("asset_class"),
                    "universe": row.spec.get("universe"),
                    "created_at": row.created_at,
                }
                for row in rows
            ]

    @app.get("/runs")
    def list_runs(strategy_id: str | None = None, limit: int = 50) -> list[dict]:
        with session_factory() as session:
            query = session.query(PipelineRunRow).order_by(PipelineRunRow.created_at.desc())
            if strategy_id is not None:
                query = query.filter(PipelineRunRow.strategy_id == strategy_id)
            return [run.as_dict() for run in query.limit(min(limit, 200)).all()]

    @app.get("/runs/{run_id}")
    def get_run(run_id: str) -> dict:
        with session_factory() as session:
            run = session.get(PipelineRunRow, run_id)
            if run is None:
                raise HTTPException(status_code=404, detail="unknown run")
            return run.as_dict()

    @app.get("/strategies/{strategy_id}")
    def get_strategy(strategy_id: str) -> dict:
        with session_factory() as session:
            row = session.get(StrategyRow, strategy_id)
            if row is None:
                raise HTTPException(status_code=404, detail="unknown strategy")
            return {"id": row.id, "spec": row.spec, "created_at": row.created_at}

    @app.get("/events")
    async def events(run_id: str | None = None) -> StreamingResponse:
        replay: list[dict] = []
        if run_id is not None:
            with session_factory() as session:
                run = session.get(PipelineRunRow, run_id)
                if run is None:
                    raise HTTPException(status_code=404, detail="unknown run")
                replay = list(run.events or [])

        async def stream():
            terminal_seen = False
            for event in replay:
                yield _sse(event)
                if event["type"] == TERMINAL_EVENT:
                    terminal_seen = True
            if terminal_seen:
                return
            async for event in bus.stream():
                if run_id is not None and event.get("run_id") != run_id:
                    continue
                yield _sse(event)
                if run_id is not None and event["type"] == TERMINAL_EVENT:
                    return

        return StreamingResponse(stream(), media_type="text/event-stream")

    @app.get("/runs/{run_id}/events")
    async def run_events(run_id: str) -> StreamingResponse:
        return await events(run_id=run_id)

    return app


app = create_app()

