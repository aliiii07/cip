"""FastAPI app wrapping the src/cip pipeline (ADR-0002).

Run locally: `uvicorn api.main:app --port 8000`.
"""

from __future__ import annotations

import asyncio
import json
import secrets
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from api.db import DEFAULT_DB_URL, Base, make_engine, make_session_factory
from api.events import EventBus
from api.models import PipelineRunRow, StrategyRow
from api.pipeline import TERMINAL_EVENT, execute_run


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
        yield

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

    return app


app = create_app()
