"""Market data providers behind one protocol (ADR-0002).

- BinanceProvider: real klines, keyless public endpoint. Crypto.
- PolygonProvider: equities/FX aggregates; requires POLYGON_API_KEY. Absent
  key -> provider unavailable, callers fall back to FixtureProvider.
- FixtureProvider: deterministic seeded random-walk candles so the whole
  site works keyless/offline. Anything it serves is stub data and the API
  marks it as such; the UI must badge it.

Native candles only — no Heikin-Ashi, no smoothing, anywhere (CLAUDE.md).
"""

from __future__ import annotations

import hashlib
import math
import os
import random
import time

import httpx

from api.indicators import Candle

INTERVAL_SECONDS = {"1h": 3600, "4h": 14400, "1d": 86400}

_BINANCE_BASE = "https://api.binance.com"
_POLYGON_BASE = "https://api.polygon.io"


class ProviderError(Exception):
    pass


class BinanceProvider:
    name = "binance"

    async def get_klines(self, symbol: str, timeframe: str, limit: int = 400) -> list[Candle]:
        params = {"symbol": symbol.upper(), "interval": timeframe, "limit": min(limit, 1000)}
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(f"{_BINANCE_BASE}/api/v3/klines", params=params)
        if resp.status_code != 200:
            raise ProviderError(f"binance {resp.status_code}: {resp.text[:200]}")
        return [
            {
                "time": int(row[0] // 1000),
                "open": float(row[1]),
                "high": float(row[2]),
                "low": float(row[3]),
                "close": float(row[4]),
                "volume": float(row[5]),
            }
            for row in resp.json()
        ]

    async def exchange_info(self) -> list[dict]:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(f"{_BINANCE_BASE}/api/v3/exchangeInfo")
        if resp.status_code != 200:
            raise ProviderError(f"binance exchangeInfo {resp.status_code}")
        return resp.json().get("symbols", [])


class PolygonProvider:
    name = "polygon"

    def __init__(self) -> None:
        self.api_key = os.environ.get("POLYGON_API_KEY", "")

    @property
    def available(self) -> bool:
        return bool(self.api_key)

    async def get_klines(self, symbol: str, timeframe: str, limit: int = 400) -> list[Candle]:
        if not self.available:
            raise ProviderError("POLYGON_API_KEY not set")
        multiplier, span = {"1h": (1, "hour"), "4h": (4, "hour"), "1d": (1, "day")}[timeframe]
        now_ms = int(time.time() * 1000)
        frm = now_ms - INTERVAL_SECONDS[timeframe] * 1000 * (limit + 10)
        url = (
            f"{_POLYGON_BASE}/v2/aggs/ticker/{symbol.upper()}/range/"
            f"{multiplier}/{span}/{frm}/{now_ms}"
        )
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                url, params={"adjusted": "true", "sort": "asc", "limit": 50000,
                             "apiKey": self.api_key}
            )
        if resp.status_code != 200:
            raise ProviderError(f"polygon {resp.status_code}: {resp.text[:200]}")
        rows = resp.json().get("results") or []
        return [
            {
                "time": int(r["t"] // 1000),
                "open": float(r["o"]),
                "high": float(r["h"]),
                "low": float(r["l"]),
                "close": float(r["c"]),
                "volume": float(r.get("v", 0)),
            }
            for r in rows
        ][-limit:]


_FIXTURE_BASE_PRICES = {
    "AAPL": 232.0, "TSLA": 318.0, "NVDA": 172.0, "MSFT": 452.0, "GOOGL": 186.0,
    "AMZN": 224.0, "META": 712.0, "EURUSD": 1.086, "GBPUSD": 1.28, "USDJPY": 155.4,
    "AUDUSD": 0.664, "USDCAD": 1.372, "USDCHF": 0.892, "NZDUSD": 0.598,
}


class FixtureProvider:
    """Deterministic synthetic candles. STUB DATA — badge it in the UI."""

    name = "fixture"

    async def get_klines(self, symbol: str, timeframe: str, limit: int = 400) -> list[Candle]:
        seed = int(hashlib.sha256(f"{symbol}:{timeframe}".encode()).hexdigest(), 16) % (2**32)
        rng = random.Random(seed)
        base = _FIXTURE_BASE_PRICES.get(symbol.upper(), 100.0)
        step = INTERVAL_SECONDS[timeframe]
        now = int(time.time()) // step * step
        candles: list[Candle] = []
        price = base * rng.uniform(0.85, 0.95)
        drift = rng.uniform(-0.0004, 0.0009)
        for i in range(limit):
            t = now - step * (limit - i)
            vol_regime = 0.006 + 0.004 * math.sin(i / 37) ** 2
            change = rng.gauss(drift, vol_regime)
            open_p = price
            close_p = price * (1 + change)
            hi = max(open_p, close_p) * (1 + abs(rng.gauss(0, vol_regime / 2)))
            lo = min(open_p, close_p) * (1 - abs(rng.gauss(0, vol_regime / 2)))
            volume = base * rng.uniform(8_000, 22_000) * (1 + 2 * abs(change) / vol_regime * 0.1)
            candles.append(
                {
                    "time": t,
                    "open": round(open_p, 6),
                    "high": round(hi, 6),
                    "low": round(lo, 6),
                    "close": round(close_p, 6),
                    "volume": round(volume, 2),
                }
            )
            price = close_p
        return candles


binance = BinanceProvider()
polygon = PolygonProvider()
fixture = FixtureProvider()


def provider_for(asset_class: str) -> tuple[BinanceProvider | PolygonProvider | FixtureProvider, bool]:
    """Returns (provider, is_stub) for an asset class."""
    if asset_class == "crypto":
        return binance, False
    if polygon.available:
        return polygon, False
    return fixture, True

