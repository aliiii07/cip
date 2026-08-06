"""Signal Engine: the five detectors (master prompt F6).

Every detector's logic is expressible in the schemas/strategy.json condition
language — no free-text conditions, no indicators the schema lacks. The
reversal detector is a simplified approximation (RSI extreme + price
reclaim), labeled as such: the schema has no divergence indicator and we do
not fake one.

Scores are deterministic measures of condition margin/consistency on this
bar — never probabilities of profit, and the UI must not describe them as
such.
"""

from __future__ import annotations

from api.indicators import Candle, donchian, ema, rsi, sma, volume_ratio


def _clamp(x: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, x))


def detect_signals(candles: list[Candle], timeframe: str) -> list[dict]:
    if len(candles) < 210:
        return []
    closes = [c["close"] for c in candles]
    ema50 = ema(closes, 50)
    ema200 = ema(closes, 200)
    rsi14 = rsi(closes, 14)
    sma20 = sma(closes, 20)
    dc = donchian(candles, 20)
    vol_ratio = volume_ratio(candles, 20)

    close, prev_close = closes[-1], closes[-2]
    e50, e200, r = ema50[-1], ema200[-1], rsi14[-1]
    s20, prev_s20 = sma20[-1], sma20[-2]
    dc_up, prev_dc_up = dc["upper"][-1], dc["upper"][-2]
    if None in (e50, e200, r, s20, prev_s20, dc_up, prev_dc_up) or vol_ratio is None:
        return []

    signals: list[dict] = []

    def add(sig_type: str, score: float, description: str) -> None:
        signals.append(
            {
                "type": sig_type,
                "timeframe": timeframe,
                "score": round(_clamp(score), 2),
                "description": description,
            }
        )

    # Breakout: close crosses above Donchian(20) upper with >=1.2x volume.
    crossed_up = close > dc_up and prev_close <= prev_dc_up
    if crossed_up and vol_ratio >= 1.2:
        margin = (close - dc_up) / dc_up * 100
        add(
            "breakout",
            0.5 + _clamp(margin / 2) * 0.25 + _clamp((vol_ratio - 1.2) / 1.0) * 0.25,
            "Close crossed above the 20-bar Donchian upper band on "
            f"{vol_ratio:.1f}× average volume.",
        )

    # Pullback: uptrend (EMA50 > EMA200), RSI(14) < 45, price above EMA50.
    if e50 > e200 and r < 45 and close > e50:
        add(
            "pullback",
            0.5 + _clamp((45 - r) / 20) * 0.3 + _clamp((e50 - e200) / e200 * 100 / 5) * 0.2,
            f"Pullback in an uptrend: RSI(14) at {r:.0f} with price holding above EMA-50.",
        )

    # Momentum: RSI(14) > 55 with >=1.3x volume.
    if r > 55 and vol_ratio >= 1.3:
        add(
            "momentum",
            0.5 + _clamp((r - 55) / 20) * 0.25 + _clamp((vol_ratio - 1.3) / 1.0) * 0.25,
            f"RSI(14) at {r:.0f} in momentum territory on {vol_ratio:.1f}× average volume.",
        )

    # Trend continuation: EMA50 > EMA200, price above EMA50, higher close.
    if e50 > e200 and close > e50 and close > prev_close:
        add(
            "trend_continuation",
            0.5
            + _clamp((e50 - e200) / e200 * 100 / 5) * 0.3
            + _clamp((close - e50) / e50 * 100 / 3) * 0.2,
            "Uptrend structure intact: price above EMA-50, EMA-50 above EMA-200, "
            "higher close than the previous bar.",
        )

    # Reversal (simplified — no divergence indicator in the schema):
    # RSI(14) < 30 recently with price crossing above SMA(20).
    reclaimed = close > s20 and prev_close <= prev_s20
    recent_rsi = [v for v in rsi14[-3:] if v is not None]
    oversold = any(v < 30 for v in recent_rsi)
    if oversold and reclaimed:
        low_rsi = min(recent_rsi)
        add(
            "reversal",
            0.5 + _clamp((30 - low_rsi) / 15) * 0.3 + 0.2,
            f"Simplified reversal signal: RSI(14) reached {low_rsi:.0f} and price "
            "reclaimed the 20-bar average.",
        )

    return signals


SIGNAL_LABELS = {
    "breakout": "Breakout",
    "pullback": "Pullback",
    "momentum": "Momentum",
    "trend_continuation": "Trend continuation",
    "reversal": "Reversal",
}

