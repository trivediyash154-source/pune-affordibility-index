"""main.py — FastAPI streaming backend for the live demo dashboard.

Run:  .venv/bin/uvicorn realtime.main:app --reload --port 8000
Then: open http://localhost:8000  (built-in test page) or point Dashboard.jsx at
      ws://localhost:8000/ws/live-metrics

A single asyncio background task produces one inference packet every PERIOD
seconds (via realtime.ml_engine) and broadcasts it to every connected client.
"""
from __future__ import annotations

import asyncio
import json
import logging
import math
import random
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

from realtime import ml_engine

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
log = logging.getLogger("stream")

PERIOD_SECONDS = 3
CHAOS_RATE = 0.15            # probability a streamed packet is corrupted (fault injection)
_LAST_PACKET: dict | None = None


def apply_chaos(true_value: float) -> float | None:
    """Inject real-world data chaos: with prob CHAOS_RATE return a corrupt reading
    (missing None, NaN, or an out-of-bounds spike); otherwise the clean value."""
    if random.random() >= CHAOS_RATE:
        return true_value
    return random.choice([None, float("nan"), true_value + random.uniform(400, 900)])
app = FastAPI(title="Pune Live Index Stream")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


class ConnectionManager:
    """Tracks active WebSocket clients and broadcasts packets to all of them."""

    def __init__(self) -> None:
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self.active.append(ws)
        log.info("client connected (%d total)", len(self.active))

    def disconnect(self, ws: WebSocket) -> None:
        if ws in self.active:
            self.active.remove(ws)
        log.info("client disconnected (%d total)", len(self.active))

    async def broadcast(self, message: dict) -> None:
        dead = []
        for ws in self.active:
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


manager = ConnectionManager()


async def _stream_loop() -> None:
    """Background producer: ingest -> inject chaos -> impute+infer -> broadcast."""
    global _LAST_PACKET
    step = 0
    while True:
        step += 1
        try:
            true_aqi = ml_engine.ingest_true(step)        # clean ground-truth tick
            observed = apply_chaos(true_aqi)              # 15% corruption injected here
            packet = ml_engine.process(observed, true_aqi, step)  # detect + impute + infer
            _LAST_PACKET = packet
            if packet["imputed"]:
                log.info("step %d: corrupt packet (%r) -> imputed %.1f (MAE %.2f)",
                         step, observed, packet["aqi_now"], packet["imputation_mae"])
            await manager.broadcast(packet)
        except Exception as exc:  # keep the loop alive
            log.exception("inference/broadcast failed: %s", exc)
        await asyncio.sleep(PERIOD_SECONDS)


@app.on_event("startup")
async def _startup() -> None:
    asyncio.create_task(_stream_loop())
    log.info("stream loop started (every %ds)", PERIOD_SECONDS)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "clients": len(manager.active), "period_s": PERIOD_SECONDS}


@app.websocket("/ws/live-metrics")
async def ws_live_metrics(ws: WebSocket) -> None:
    await manager.connect(ws)
    try:
        # send the latest packet immediately so a new client isn't blank for 3s
        if _LAST_PACKET is not None:
            await ws.send_text(json.dumps(_LAST_PACKET))
        while True:
            await ws.receive_text()  # keep-alive; clients may send pings
    except WebSocketDisconnect:
        manager.disconnect(ws)
    except Exception:
        manager.disconnect(ws)


@app.get("/", response_class=HTMLResponse)
async def index() -> str:
    page = Path(__file__).parent / "static" / "index.html"
    return page.read_text(encoding="utf-8") if page.exists() else "<h1>Stream up. Connect to /ws/live-metrics</h1>"
