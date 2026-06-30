"""Module: ingest — load the real raw datasets, with provenance.

Rent : MagicBricks listings (filtered to Pune)  -> the ONLY rent source.
AQI  : MPCB 15-min station CSVs (Katraj now; more plug in via config).
"""
from __future__ import annotations

import pandas as pd

from .utils import get_logger, load_config, record_provenance, rel

log = get_logger("ingest")


def load_rentals_pune(cfg: dict | None = None) -> pd.DataFrame:
    """Load MagicBricks listings and return only the Pune rows (stripped)."""
    cfg = cfg or load_config()
    src = cfg["sources"]["magicbricks"]
    path = rel(src["file"])
    df = pd.read_excel(path, engine="openpyxl")
    df.columns = [c.strip() for c in df.columns]
    for col in df.select_dtypes(include="object").columns:
        df[col] = df[col].astype(str).str.strip()
    pune = df[df["city"].str.lower() == "pune"].copy()
    log.info("rentals: %d total rows -> %d Pune rows", len(df), len(pune))

    record_provenance([{
        "field": "rent", "table": "rentals_pune", "dimension": "rent",
        "source_name": src["name"], "source_url": src["url"], "license": src["license"],
        "transform": "filter city==Pune; per-listing monthly rent (INR)",
        "is_proxy": False, "caveat": src["caveat"],
    }])
    return pune


def load_aqi_station(name: str, cfg: dict | None = None) -> pd.DataFrame:
    """Load one MPCB station CSV; parse timestamp, drop fully-empty columns."""
    cfg = cfg or load_config()
    st = cfg["aqi"]["stations"][name]
    df = pd.read_csv(rel(st["file"]))
    df = df.dropna(axis=1, how="all")  # drop columns that are entirely NaN
    ts = st.get("timestamp_col", "Timestamp")
    df[ts] = pd.to_datetime(df[ts], utc=True, errors="coerce")
    df = df.dropna(subset=[ts]).sort_values(ts).reset_index(drop=True)
    log.info("aqi[%s]: %d rows, %s -> %s", name, len(df),
             df[ts].min().date(), df[ts].max().date())
    return df


def available_stations(cfg: dict | None = None) -> list[str]:
    """Names of AQI stations whose CSV file is actually present on disk."""
    cfg = cfg or load_config()
    return [n for n, s in cfg["aqi"]["stations"].items() if rel(s["file"]).exists()]
