# Real-time streaming dashboard (demo layer)

A FastAPI + WebSocket backend that runs the index/TOPSIS/entropy logic on a live
tick and streams it to a React (Recharts) frontend.

> **Honesty:** the per-tick **AQI is simulated** (no real 3-second sensor feed
> exists) — it random-walks around the *real* annual mean. Rent / commute /
> amenities are the *real* static indicators. Every packet is tagged
> `source:"simulated"`. **This is a presentation/demo layer; the paper's results
> come only from `run_pipeline.py` on real data.** For genuinely live AQI, repoint
> `ml_engine._simulate_aqi` at a real AQICN/OpenAQ API (needs a free token).

## Run the backend
```bash
.venv/bin/pip install fastapi "uvicorn[standard]"     # already installed here
.venv/bin/uvicorn realtime.main:app --reload --port 8000
```
- Built-in test page (no React needed): http://localhost:8000
- Health: http://localhost:8000/health
- WebSocket: `ws://localhost:8000/ws/live-metrics` (one packet immediately, then every 3 s)

## Run the React frontend
`Dashboard.jsx` is a standalone component. In a React project with Tailwind:
```bash
npm i recharts
```
Drop `Dashboard.jsx` into your app (it connects to `ws://localhost:8000`). When you
send the website template, I'll merge this into its layout/design system.

## Files
- `main.py` — FastAPI app, `ConnectionManager`, asyncio broadcast loop, `/ws/live-metrics`
- `ml_engine.py` — live inference (real static indicators + simulated AQI + entropy/TOPSIS + forecast)
- `static/index.html` — vanilla-JS test dashboard (dark/purple)
- `frontend/Dashboard.jsx` — React + Recharts streaming component

## Packet shape
```json
{ "t": "...", "step": 12, "source": "simulated",
  "aqi_now": 86.7, "aqi_forecast_next": 88.1,
  "top_locality": "Hinjewadi", "top_index": 72.9, "mean_index": 55.4,
  "entropy_weights": {...}, "ranking": [{"locality":"...","index":..,"topsis":..}] }
```
