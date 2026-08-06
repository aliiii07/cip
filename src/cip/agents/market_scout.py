"""Market Scout: macro data, order-book flow, news/social sentiment.

Stub. Real implementation wires up the data providers in
docs/architecture.md (Polygon.io, Binance/CoinGecko Pro) plus a news/social
sentiment source. For now it returns a fixed, clearly-fake context so the
rest of the loop is exercisable end to end.
"""

from __future__ import annotations

from typing import Any

from cip.state import PipelineState


def market_scout_node(state: PipelineState) -> dict[str, Any]:
    return {
        "market_context": {
            "macro_notes": ["stub: no live macro feed wired up yet"],
            "order_book_flow": {"stub": True},
            "sentiment": {"stub": True},
        },
        "status": "designing",
    }

