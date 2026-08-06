"""In-process pub/sub bridging the sync pipeline thread to async SSE clients.

Replaced by Redis pub/sub + a worker process when live streaming lands
(ADR-0002); the ingestion side never does heavy work in the socket loop.
"""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator


class EventBus:
    def __init__(self) -> None:
        self._loop: asyncio.AbstractEventLoop | None = None
        self._queues: set[asyncio.Queue] = set()

    def bind(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop

    def publish(self, event: dict) -> None:
        """Thread-safe: called from the background pipeline thread."""
        loop = self._loop
        if loop is None:
            return
        for queue in list(self._queues):
            loop.call_soon_threadsafe(queue.put_nowait, event)

    async def stream(self) -> AsyncIterator[dict]:
        queue: asyncio.Queue = asyncio.Queue()
        self._queues.add(queue)
        try:
            while True:
                yield await queue.get()
        finally:
            self._queues.discard(queue)

