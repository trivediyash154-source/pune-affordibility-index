"""Module: viz — exploratory paper figures (STEP: EDA).

Two reviewer-friendly figures the rest of the pipeline doesn't already produce:
  1. rent distribution by BHK (shows the cleaned rent structure + why per-BHK IQR)
  2. monthly AQI cycle (the seasonal story as a continuous within-year curve)
"""
from __future__ import annotations

import pandas as pd

from .aqi import compute_daily_aqi
from .ingest import load_aqi_station, load_rentals_pune
from .preprocess import select_study_localities
from .rent import clean_rentals
from .utils import get_logger, load_config, save_fig

log = get_logger("viz")


def eda_rent_by_bhk(cfg: dict | None = None) -> None:
    import matplotlib.pyplot as plt
    cfg = cfg or load_config()
    pune = load_rentals_pune(cfg)
    study = select_study_localities(pune, cfg["study"]["min_listings"])
    clean = clean_rentals(pune, study)

    groups = sorted(clean["beds"].unique())
    data = [clean.loc[clean["beds"] == b, "rent"] for b in groups]
    fig, ax = plt.subplots(figsize=(7, 4.4))
    ax.boxplot(data, tick_labels=[f"{b}BHK" for b in groups], showfliers=False)
    ax.set_ylabel("Monthly rent (INR)")
    ax.set_title("Rent distribution by BHK (post-cleaning, outliers hidden)")
    ax.yaxis.grid(True, ls=":", alpha=0.5)
    save_fig(fig, "eda_rent_by_bhk"); plt.close(fig)
    log.info("rent-by-BHK medians: %s",
             {f"{b}BHK": int(clean.loc[clean.beds == b, 'rent'].median()) for b in groups})


def eda_aqi_monthly(cfg: dict | None = None, station: str = "Katraj Dairy") -> None:
    import matplotlib.pyplot as plt
    cfg = cfg or load_config()
    raw = load_aqi_station(station, cfg)
    ts = cfg["aqi"]["stations"][station].get("timestamp_col", "Timestamp")
    daily = compute_daily_aqi(raw, ts)
    monthly = daily["AQI"].resample("1ME").mean()

    fig, ax = plt.subplots(figsize=(8.5, 4.2))
    ax.plot(monthly.index, monthly.values, "o-", color="#cc0033")
    ax.axhline(100, ls="--", c="grey", lw=0.8)
    ax.fill_between(monthly.index, 0, 50, color="#009966", alpha=0.08)
    ax.fill_between(monthly.index, 50, 100, color="#a3c853", alpha=0.08)
    ax.fill_between(monthly.index, 100, 200, color="#ffde33", alpha=0.10)
    ax.set_ylabel("Monthly mean CPCB AQI")
    ax.set_title(f"Monthly AQI cycle — {station} (2024–2025)")
    save_fig(fig, "eda_aqi_monthly"); plt.close(fig)
    log.info("monthly AQI: worst=%s (%.0f), best=%s (%.0f)",
             monthly.idxmax().date(), monthly.max(), monthly.idxmin().date(), monthly.min())


def run_eda(cfg: dict | None = None) -> None:
    eda_rent_by_bhk(cfg)
    eda_aqi_monthly(cfg)
