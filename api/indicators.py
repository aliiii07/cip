"""Technical indicators computed over native OHLCV candles.

Pure Python, no third-party deps. Series are aligned to the candle list;
warm-up positions are None. Donchian bands exclude the current bar (prior-N
window) so "close crosses above the upper band" is actually detectable —
a close can never exceed the high of its own bar.
"""

from __future__ import annotations

from typing import TypedDict


class Candle(TypedDict):
    time: int  # unix seconds, bar open
    open: float
    high: float
    low: float
    close: float
    volume: float


def ema(values: list[float], period: int) -> list[float | None]:
    out: list[float | None] = [None] * len(values)
    if len(values) < period:
        return out
    k = 2 / (period + 1)
    seed = sum(values[:period]) / period
    out[period - 1] = seed
    prev = seed
    for i in range(period, len(values)):
        prev = values[i] * k + prev * (1 - k)
        out[i] = prev
    return out


def sma(values: list[float], period: int) -> list[float | None]:
    out: list[float | None] = [None] * len(values)
    if len(values) < period:
        return out
    total = sum(values[:period])
    out[period - 1] = total / period
    for i in range(period, len(values)):
        total += values[i] - values[i - period]
        out[i] = total / period
    return out


def rsi(closes: list[float], period: int = 14) -> list[float | None]:
    out: list[float | None] = [None] * len(closes)
    if len(closes) <= period:
        return out
    gains = losses = 0.0
    for i in range(1, period + 1):
        delta = closes[i] - closes[i - 1]
        gains += max(delta, 0.0)
        losses += max(-delta, 0.0)
    avg_gain = gains / period
    avg_loss = losses / period

    def value(g: float, loss: float) -> float:
        if loss == 0:
            return 100.0
        rs = g / loss
        return 100.0 - 100.0 / (1.0 + rs)

    out[period] = value(avg_gain, avg_loss)
    for i in range(period + 1, len(closes)):
        delta = closes[i] - closes[i - 1]
        avg_gain = (avg_gain * (period - 1) + max(delta, 0.0)) / period
        avg_loss = (avg_loss * (period - 1) + max(-delta, 0.0)) / period
        out[i] = value(avg_gain, avg_loss)
    return out


def atr(candles: list[Candle], period: int = 14) -> list[float | None]:
    out: list[float | None] = [None] * len(candles)
    if len(candles) <= period:
        return out
    trs: list[float] = []
    for i in range(1, len(candles)):
        c, prev_close = candles[i], candles[i - 1]["close"]
        trs.append(
            max(c["high"] - c["low"], abs(c["high"] - prev_close), abs(c["low"] - prev_close))
        )
    prev = sum(trs[:period]) / period
    out[period] = prev
    for i in range(period + 1, len(candles)):
        prev = (prev * (period - 1) + trs[i - 1]) / period
        out[i] = prev
    return out


def donchian(candles: list[Candle], period: int = 20) -> dict[str, list[float | None]]:
    """Prior-N-bar channel (excludes the current bar)."""
    n = len(candles)
    upper: list[float | None] = [None] * n
    lower: list[float | None] = [None] * n
    mid: list[float | None] = [None] * n
    for i in range(period, n):
        window = candles[i - period : i]
        hi = max(c["high"] for c in window)
        lo = min(c["low"] for c in window)
        upper[i], lower[i], mid[i] = hi, lo, (hi + lo) / 2
    return {"upper": upper, "lower": lower, "mid": mid}


def volume_ratio(candles: list[Candle], period: int = 20) -> float | None:
    """Latest bar volume vs the average of the prior `period` bars."""
    if len(candles) < period + 1:
        return None
    prior = candles[-period - 1 : -1]
    avg = sum(c["volume"] for c in prior) / period
    if avg == 0:
        return None
    return candles[-1]["volume"] / avg


def support_resistance(
    candles: list[Candle], lookback: int = 100, tolerance_pct: float = 0.5
) -> dict[str, list[dict]]:
    """Swing-point clustering: local highs/lows (2-bar wings) over the last
    `lookback` bars, clustered within `tolerance_pct` of price."""
    window = candles[-lookback:]
    swings: list[tuple[float, str]] = []
    for i in range(2, len(window) - 2):
        highs = [window[j]["high"] for j in (i - 2, i - 1, i + 1, i + 2)]
        lows = [window[j]["low"] for j in (i - 2, i - 1, i + 1, i + 2)]
        if window[i]["high"] > max(highs):
            swings.append((window[i]["high"], "resistance"))
        if window[i]["low"] < min(lows):
            swings.append((window[i]["low"], "support"))

    clusters: list[dict] = []
    for price, kind in sorted(swings):
        placed = False
        for cluster in clusters:
            ref = cluster["level"]
            if ref and abs(price - ref) / ref * 100 <= tolerance_pct:
                cluster["prices"].append(price)
                cluster["level"] = sum(cluster["prices"]) / len(cluster["prices"])
                cluster["touches"] += 1
                placed = True
                break
        if not placed:
            clusters.append({"level": price, "prices": [price], "touches": 1, "kind": kind})

    last_close = candles[-1]["close"]
    supports = sorted(
        (
            {"level": round(c["level"], 6), "touches": c["touches"]}
            for c in clusters
            if c["level"] < last_close
        ),
        key=lambda c: -c["level"],
    )[:4]
    resistances = sorted(
        (
            {"level": round(c["level"], 6), "touches": c["touches"]}
            for c in clusters
            if c["level"] > last_close
        ),
        key=lambda c: c["level"],
    )[:4]
    return {"supports": supports, "resistances": resistances}

