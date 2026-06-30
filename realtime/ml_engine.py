"""ml_engine.py — fault-tolerant live inference for the streaming dashboard.

HONESTY: rent / commute / safety / lifestyle are the REAL static indicators from
the research pipeline. The per-tick AQI is a **simulated** stream (no real 3-second
sensor exists) that random-walks around the REAL annual mean. We then **inject
controlled corruption** (done in main.py) and recover it here with an **online EMA
imputation layer** — motivated by the fact that the REAL Katraj feed already has
~25-30% missing pollutant readings (see Step 3). Every packet is tagged
``source="simulated"``; this is a systems/fault-tolerance demo, not real data.

Online imputation layer:
  * a fixed-length history buffer ``deque(maxlen=50)`` of last VALID AQI values;
  * a packet is "corrupt" if AQI is None / NaN / out of [0, 500];
  * a corrupt value is replaced by the EMA of the buffer (alpha = 2/(span+1))
    BEFORE the dynamic index / TOPSIS are computed.
Because the simulator knows the true value, we also report the imputation error.
"""
from __future__ import annotations

import math
import random
import sys
from collections import deque
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from src.index import minmax            # noqa: E402
from src.mcda import entropy_weights, topsis  # noqa: E402
from src.utils import load_config       # noqa: E402

CFG = load_config()
DIMS = list(CFG["dimensions"])
random.seed(CFG["project"]["seed"])
np.random.seed(CFG["project"]["seed"])

EMA_SPAN = 10
AQI_VALID_RANGE = (0.0, 500.0)


def _load_static() -> pd.DataFrame:
    rent = pd.read_csv(ROOT / "outputs/tables/locality_rent.csv")[["locality", "median_rent"]]
    commute = pd.read_csv(ROOT / "data/processed/commute.csv")[["locality", "commute_min"]]
    amen = pd.read_csv(ROOT / "data/processed/amenities.csv")[["locality", "safety_raw", "lifestyle_raw"]]
    df = rent.merge(commute, on="locality").merge(amen, on="locality")
    df["col"] = CFG["cost_of_living"]["city_baseline_inr"]
    return df.set_index("locality")


STATIC = _load_static()
_BASE_AQI = float(pd.read_csv(ROOT / "outputs/tables/aqi_seasonal.csv")["mean_aqi"].mean())

_RAW = {"rent": "median_rent", "col": "col", "commute": "commute_min",
        "safety": "safety_raw", "lifestyle": "lifestyle_raw"}
_STATIC_SCORES = pd.DataFrame(
    {d: minmax(STATIC[_RAW[d]], CFG["dimensions"][d]["direction"]) for d in _RAW},
    index=STATIC.index,
)
_SUBJECTIVE_W = pd.Series({d: CFG["dimensions"][d]["weight"] for d in DIMS})

# --- streaming state (fault-tolerance layer) ---
_HISTORY: deque[float] = deque(maxlen=50)   # last VALID AQI values
_TRUE = {"aqi": _BASE_AQI}                   # the simulator's true (clean) signal
_STATS = {"total": 0, "corrupt": 0, "abs_err_sum": 0.0}


def ingest_true(step: int) -> float:
    """Advance the (clean) simulated AQI signal — the ground truth before chaos."""
    _TRUE["aqi"] += random.uniform(-4, 4)
    _TRUE["aqi"] = float(np.clip(_TRUE["aqi"], 25, 175))
    return float(np.clip(_TRUE["aqi"] + 12 * math.sin(step / 10.0), 20, 200))


def is_corrupt(value) -> bool:
    """A streamed AQI reading is corrupt if missing, NaN, or out of bounds."""
    if value is None:
        return True
    try:
        v = float(value)
    except (TypeError, ValueError):
        return True
    if math.isnan(v) or math.isinf(v):
        return True
    return not (AQI_VALID_RANGE[0] <= v <= AQI_VALID_RANGE[1])


def _ema_impute() -> float:
    """Exponential-moving-average estimate from the valid-history buffer."""
    if not _HISTORY:
        return _BASE_AQI
    return float(pd.Series(list(_HISTORY)).ewm(span=EMA_SPAN).mean().iloc[-1])


def _aqi_score_absolute(aqi: float) -> float:
    return float(100 * (1 - np.clip(aqi, 0, 200) / 200))


def _forecast(aqi: float) -> float:
    if len(_HISTORY) < 3:
        return aqi
    ewma = pd.Series(list(_HISTORY)).ewm(span=5).mean().iloc[-1]
    return float(np.clip(ewma + 0.5 * (_HISTORY[-1] - _HISTORY[-2]), 20, 200))


def process(observed_aqi, true_aqi: float, step: int,
            weights: pd.Series | None = None) -> dict:
    """Detect+impute a (possibly corrupt) AQI reading, then run the dynamic index."""
    _STATS["total"] += 1
    corrupt = is_corrupt(observed_aqi)
    if corrupt:
        aqi = _ema_impute()                       # <-- online imputation
        _STATS["corrupt"] += 1
        _STATS["abs_err_sum"] += abs(aqi - true_aqi)
    else:
        aqi = float(observed_aqi)
        _HISTORY.append(aqi)                       # only VALID values enter history

    w = (weights if weights is not None else _SUBJECTIVE_W).reindex(DIMS).fillna(0.0)
    scores = _STATIC_SCORES.copy()
    scores["aqi"] = _aqi_score_absolute(aqi)
    scores = scores[DIMS]
    composite = (scores * w).sum(axis=1)
    ent_w = entropy_weights(scores)
    tps = topsis(scores, w)
    ranked = composite.sort_values(ascending=False)
    mae = (_STATS["abs_err_sum"] / _STATS["corrupt"]) if _STATS["corrupt"] else 0.0

    return {
        "t": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "step": step,
        "source": "simulated",
        "raw_observed": None if corrupt else round(aqi, 1),
        "aqi_now": round(aqi, 1),                  # clean or imputed
        "aqi_forecast_next": round(_forecast(aqi), 1),
        "imputed": corrupt,                        # was THIS packet imputed?
        "imputation_active": corrupt,
        "total_imputed": _STATS["corrupt"],
        "corruption_rate": round(_STATS["corrupt"] / _STATS["total"], 3),
        "imputation_mae": round(mae, 2),           # |imputed - true| over corrupt packets
        "top_locality": ranked.index[0],
        "top_index": round(float(ranked.iloc[0]), 1),
        "mean_index": round(float(composite.mean()), 1),
        "entropy_weights": {k: round(float(v), 3) for k, v in ent_w.items()},
        "ranking": [
            {"locality": loc, "index": round(float(composite[loc]), 1),
             "topsis": round(float(tps[loc]), 3)}
            for loc in ranked.head(10).index
        ],
    }
