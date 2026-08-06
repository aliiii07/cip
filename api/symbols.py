"""Symbol directory (master prompt F2): local `symbols` table + sync.

Search is served from this table, never from live provider calls, so it is
fast and immune to rate limits. A static seed guarantees the directory works
keyless and offline (demo mode); the Binance sync enriches it with every
active USDT spot pair; Polygon sync runs only when POLYGON_API_KEY is set.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy import String, or_
from sqlalchemy.orm import Mapped, Session, mapped_column, sessionmaker

from api.db import Base
from api.providers import binance, polygon

log = logging.getLogger("cip.symbols")

_KNOWN_CRYPTO_NAMES = {
    "BTC": "Bitcoin", "ETH": "Ethereum", "SOL": "Solana", "BNB": "BNB", "XRP": "XRP",
    "DOGE": "Dogecoin", "ADA": "Cardano", "AVAX": "Avalanche", "LINK": "Chainlink",
    "DOT": "Polkadot", "LTC": "Litecoin", "MATIC": "Polygon", "TON": "Toncoin",
    "SHIB": "Shiba Inu", "TRX": "TRON", "UNI": "Uniswap", "ATOM": "Cosmos",
    "XLM": "Stellar", "NEAR": "NEAR Protocol", "APT": "Aptos",
}

# Static seed: core equities, top crypto pairs, and ~30 FX majors/minors.
# Guarantees search works with zero keys and zero network.
STATIC_SYMBOLS: list[tuple[str, str, str, str, str]] = [
    # ticker, name, asset_class, exchange, provider
    ("AAPL", "Apple Inc.", "equity", "NASDAQ", "polygon"),
    ("TSLA", "Tesla Inc.", "equity", "NASDAQ", "polygon"),
    ("NVDA", "NVIDIA Corporation", "equity", "NASDAQ", "polygon"),
    ("MSFT", "Microsoft Corporation", "equity", "NASDAQ", "polygon"),
    ("GOOGL", "Alphabet Inc.", "equity", "NASDAQ", "polygon"),
    ("AMZN", "Amazon.com Inc.", "equity", "NASDAQ", "polygon"),
    ("META", "Meta Platforms Inc.", "equity", "NASDAQ", "polygon"),
    ("BTCUSDT", "Bitcoin", "crypto", "Binance", "binance"),
    ("ETHUSDT", "Ethereum", "crypto", "Binance", "binance"),
    ("SOLUSDT", "Solana", "crypto", "Binance", "binance"),
    ("BNBUSDT", "BNB", "crypto", "Binance", "binance"),
    ("XRPUSDT", "XRP", "crypto", "Binance", "binance"),
    ("DOGEUSDT", "Dogecoin", "crypto", "Binance", "binance"),
    ("ADAUSDT", "Cardano", "crypto", "Binance", "binance"),
    ("EURUSD", "Euro / US Dollar", "fx", "FX", "static"),
    ("GBPUSD", "British Pound / US Dollar", "fx", "FX", "static"),
    ("USDJPY", "US Dollar / Japanese Yen", "fx", "FX", "static"),
    ("AUDUSD", "Australian Dollar / US Dollar", "fx", "FX", "static"),
    ("USDCAD", "US Dollar / Canadian Dollar", "fx", "FX", "static"),
    ("USDCHF", "US Dollar / Swiss Franc", "fx", "FX", "static"),
    ("NZDUSD", "New Zealand Dollar / US Dollar", "fx", "FX", "static"),
    ("EURGBP", "Euro / British Pound", "fx", "FX", "static"),
    ("EURJPY", "Euro / Japanese Yen", "fx", "FX", "static"),
    ("GBPJPY", "British Pound / Japanese Yen", "fx", "FX", "static"),
    ("AUDJPY", "Australian Dollar / Japanese Yen", "fx", "FX", "static"),
    ("EURCHF", "Euro / Swiss Franc", "fx", "FX", "static"),
    ("EURAUD", "Euro / Australian Dollar", "fx", "FX", "static"),
    ("GBPCHF", "British Pound / Swiss Franc", "fx", "FX", "static"),
    ("AUDNZD", "Australian Dollar / New Zealand Dollar", "fx", "FX", "static"),
    ("USDMXN", "US Dollar / Mexican Peso", "fx", "FX", "static"),
    ("USDSEK", "US Dollar / Swedish Krona", "fx", "FX", "static"),
    ("USDNOK", "US Dollar / Norwegian Krone", "fx", "FX", "static"),
    ("USDSGD", "US Dollar / Singapore Dollar", "fx", "FX", "static"),
    ("USDZAR", "US Dollar / South African Rand", "fx", "FX", "static"),
    ("EURCAD", "Euro / Canadian Dollar", "fx", "FX", "static"),
    ("GBPAUD", "British Pound / Australian Dollar", "fx", "FX", "static"),
    ("CADJPY", "Canadian Dollar / Japanese Yen", "fx", "FX", "static"),
    ("CHFJPY", "Swiss Franc / Japanese Yen", "fx", "FX", "static"),
    ("NZDJPY", "New Zealand Dollar / Japanese Yen", "fx", "FX", "static"),
    ("EURNZD", "Euro / New Zealand Dollar", "fx", "FX", "static"),
    ("GBPCAD", "British Pound / Canadian Dollar", "fx", "FX", "static"),
    ("GBPNZD", "British Pound / New Zealand Dollar", "fx", "FX", "static"),
    ("AUDCAD", "Australian Dollar / Canadian Dollar", "fx", "FX", "static"),
]


class SymbolRow(Base):
    __tablename__ = "symbols"

    ticker: Mapped[str] = mapped_column(String(24), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    asset_class: Mapped[str] = mapped_column(String(12))
    exchange: Mapped[str] = mapped_column(String(24))
    provider: Mapped[str] = mapped_column(String(12))
    active: Mapped[bool] = mapped_column(default=True)
    logo_url: Mapped[str | None] = mapped_column(String(300), nullable=True)
    synced_at: Mapped[str] = mapped_column(String(40))

    def as_dict(self) -> dict:
        return {
            "ticker": self.ticker,
            "name": self.name,
            "asset_class": self.asset_class,
            "exchange": self.exchange,
            "provider": self.provider,
        }


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _upsert(session: Session, ticker: str, name: str, asset_class: str,
            exchange: str, provider: str) -> None:
    row = session.get(SymbolRow, ticker)
    if row is None:
        session.add(
            SymbolRow(
                ticker=ticker, name=name, asset_class=asset_class,
                exchange=exchange, provider=provider, active=True, synced_at=_now(),
            )
        )
    else:
        row.name, row.asset_class = name, asset_class
        row.exchange, row.provider = exchange, provider
        row.active, row.synced_at = True, _now()


def seed_static_symbols(session_factory: sessionmaker) -> None:
    with session_factory() as session:
        for ticker, name, asset_class, exchange, provider in STATIC_SYMBOLS:
            _upsert(session, ticker, name, asset_class, exchange, provider)
        session.commit()


async def sync_binance_symbols(session_factory: sessionmaker) -> None:
    """Upsert every active Binance USDT spot pair. Failure is non-fatal —
    the static seed already covers the majors."""
    try:
        info = await binance.exchange_info()
    except Exception as exc:  # network down, rate limit — demo still works
        log.warning("Binance symbol sync skipped: %s", exc)
        return
    added = 0
    with session_factory() as session:
        for entry in info:
            if entry.get("status") != "TRADING" or entry.get("quoteAsset") != "USDT":
                continue
            if not entry.get("isSpotTradingAllowed", True):
                continue
            base = entry["baseAsset"]
            name = _KNOWN_CRYPTO_NAMES.get(base, f"{base} / USDT")
            _upsert(session, entry["symbol"], name, "crypto", "Binance", "binance")
            added += 1
        session.commit()
    log.info("Binance symbol sync: %d pairs upserted", added)
    if polygon.available:
        log.info("POLYGON_API_KEY present — equity sync will use live Polygon data")


def search_symbols(session: Session, query: str, limit: int = 20) -> list[dict]:
    q = query.strip().lower()
    if not q:
        return []
    like_any = f"%{q}%"
    rows = (
        session.query(SymbolRow)
        .filter(SymbolRow.active.is_(True))
        .filter(
            or_(
                SymbolRow.ticker.ilike(like_any),
                SymbolRow.name.ilike(like_any),
            )
        )
        .limit(200)
        .all()
    )

    def rank(row: SymbolRow) -> tuple:
        ticker, name = row.ticker.lower(), row.name.lower()
        return (
            0 if ticker == q else 1,
            0 if ticker.startswith(q) else 1,
            0 if name.startswith(q) else 1,
            len(row.ticker),
            row.ticker,
        )

    return [row.as_dict() for row in sorted(rows, key=rank)[:limit]]

