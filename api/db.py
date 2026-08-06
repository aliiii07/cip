"""Engine and session helpers. SQLite for MVP, Postgres-ready (ADR-0002)."""

from __future__ import annotations

from pathlib import Path

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DEFAULT_DB_URL = "sqlite:///data/cip.db"


class Base(DeclarativeBase):
    pass


def make_engine(db_url: str = DEFAULT_DB_URL) -> Engine:
    if db_url == DEFAULT_DB_URL:
        Path("data").mkdir(exist_ok=True)
    connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}
    return create_engine(db_url, connect_args=connect_args)


def make_session_factory(engine: Engine) -> sessionmaker:
    return sessionmaker(bind=engine, expire_on_commit=False)
