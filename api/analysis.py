"""On-demand asset analysis (master prompt F3) — the hero feature.

Computes the full technical read for one symbol/timeframe: candles,
EMA-50/200, Donchian(20), RSI-14, ATR-14, volume ratio, support/resistance
zones, and active signals from the five detectors. Cached in-process with a
short TTL so repeated views don't hammer providers.
"""

from __future__ import annotations

import time
from typing import Any

from api.indicators import (
    Candle,
    atr,
    donchian,
    ema,
    rsi,
    sma,
    support_resistance,
    volume_ratio,
)
from api.providers import fixture, provider_for
from api.signals import SIGNAL_LABELS, detect_signals

_CACHE: dict[tuple[str, str], tuple[float, dict]] = {}
_TTL_SECONDS = 300


def _trend(e50: float | None, e50_prev: float | None, e200: float | None) -> dict:
    if e50 is None or e200 is None:
        return {"direction": "unknown", "strength": "insufficient history"}
    spread_pct = (e50 - e200) / e200 * 100
    slope_up = e50_prev is not None and e50 > e50_prev
    if spread_pct > 0.5:
        direction = "uptrend"
        strength = "strong" if spread_pct > 3 and slope_up else "moderate"
    elif spread_pct < -0.5:
        direction = "downtrend"
        strength = "strong" if spread_pct < -3 and not slope_up else "moderate"
    else:
        direction, strength = "ranging", "flat EMAs"
    return {"direction": direction, "strength": strength, "ema_spread_pct": round(spread_pct, 2)}


def _momentum(r: float | None) -> dict:
    if r is None:
        return {"rsi": None, "state": "insufficient history"}
    state = "oversold" if r < 30 else "overbought" if r > 70 else "neutral"
    return {"rsi": round(r, 1), "state": state}


def _volatility(atr_series: list[float | None], closes: list[float]) -> dict:
    pairs = [
        (a / c * 100)
        for a, c in zip(atr_series, closes)
        if a is not None and c
    ]
    if not pairs:
        return {"atr": None, "atr_pct": None, "state": "insufficient history"}
    current = pairs[-1]
    lo, hi = min(pairs), max(pairs)
    pos = 0.5 if hi == lo else (current - lo) / (hi - lo)
    state = "low" if pos < 0.25 else "moderate" if pos < 0.5 else "elevated" if pos < 0.75 else "high"
    return {
        "atr": round(atr_series[-1] or 0, 6),
        "atr_pct": round(current, 2),
        "state": state,
    }


def _volume_state(ratio: float | None) -> dict:
    if ratio is None:
        return {"ratio": None, "state": "insufficient history"}
    state = "thin" if ratio < 0.7 else "average" if ratio < 1.3 else "heavy"
    return {"ratio": round(ratio, 2), "state": f"{state} participation"}


async def get_analysis(symbol_row: dict, timeframe: str) -> dict[str, Any]:
    key = (symbol_row["ticker"], timeframe)
    cached = _CACHE.get(key)
    if cached and time.time() - cached[0] < _TTL_SECONDS:
        return cached[1]

    provider, is_stub = provider_for(symbol_row["asset_class"])
    try:
        candles: list[Candle] = await provider.get_klines(symbol_row["ticker"], timeframe, 400)
        data_source = provider.name
    except Exception:
        # Provider down or symbol unavailable there — honest fallback to stub.
        candles = await fixture.get_klines(symbol_row["ticker"], timeframe, 400)
        data_source, is_stub = fixture.name, True

    closes = [c["close"] for c in candles]
    ema50 = ema(closes, 50)
    ema200 = ema(closes, 200)
    rsi14 = rsi(closes, 14)
    sma20 = sma(closes, 20)
    atr14 = atr(candles, 14)
    dc = donchian(candles, 20)
    vol_ratio = volume_ratio(candles, 20)
    levels = support_resistance(candles)

    close = closes[-1]
    nearest_support = levels["supports"][0] if levels["supports"] else None
    nearest_resistance = levels["resistances"][0] if levels["resistances"] else None

    payload: dict[str, Any] = {
        "symbol": symbol_row["ticker"],
        "name": symbol_row["name"],
        "asset_class": symbol_row["asset_class"],
        "timeframe": timeframe,
        "data_source": data_source,
        "stub": is_stub,
        "candles": candles,
        "series": {
            "ema50": ema50,
            "ema200": ema200,
            "donchian_upper": dc["upper"],
            "donchian_lower": dc["lower"],
            "donchian_mid": dc["mid"],
            "rsi": rsi14,
            "sma20": sma20,
        },
        "latest": {
            "close": close,
            "trend": _trend(ema50[-1], ema50[-2] if len(ema50) > 1 else None, ema200[-1]),
            "momentum": _momentum(rsi14[-1]),
            "volatility": _volatility(atr14, closes),
            "volume": _volume_state(vol_ratio),
            "support": (
                {
                    **nearest_support,
                    "distance_pct": round((close - nearest_support["level"]) / close * 100, 2),
                }
                if nearest_support
                else None
            ),
            "resistance": (
                {
                    **nearest_resistance,
                    "distance_pct": round((nearest_resistance["level"] - close) / close * 100, 2),
                }
                if nearest_resistance
                else None
            ),
        },
        "levels": levels,
        "signals": [
            {**s, "label": SIGNAL_LABELS[s["type"]]} for s in detect_signals(candles, timeframe)
        ],
    }
    _CACHE[key] = (time.time(), payload)
    return payload

