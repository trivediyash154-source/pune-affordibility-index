"""Module: rent — clean the Pune rentals and aggregate per locality / BHK (STEP 2).

Cleaning is conservative and documented:
  * keep only the study localities (>= min_listings),
  * drop physically implausible rows (tiny area, absurd bed counts),
  * remove rent outliers with the 1.5*IQR rule applied WITHIN each BHK class
    (a luxury 4BHK is not an "outlier" relative to 1BHKs, so we bucket first).
"""
from __future__ import annotations

import pandas as pd

from .preprocess import normalized_pune
from .utils import get_logger, save_table

log = get_logger("rent")

# Physical sanity bounds (data-entry errors, not market outliers)
MIN_AREA_SQFT = 100
MAX_BEDS = 5
MIN_RENT = 2000


def clean_rentals(pune_df: pd.DataFrame, study: pd.DataFrame) -> pd.DataFrame:
    """Return cleaned listings restricted to the study localities."""
    df = normalized_pune(pune_df)
    df = df[df["locality"].isin(study["locality"])].copy()
    n0 = len(df)

    # 1) physical sanity filter (drops the 4-sqft / 10-bed data errors)
    df = df[(df["area"] >= MIN_AREA_SQFT) & (df["beds"] <= MAX_BEDS) & (df["rent"] >= MIN_RENT)]
    n1 = len(df)

    # 2) per-BHK IQR rent filter
    keep = []
    for beds, g in df.groupby("beds"):
        q1, q3 = g["rent"].quantile([0.25, 0.75])
        iqr = q3 - q1
        lo, hi = q1 - 1.5 * iqr, q3 + 1.5 * iqr
        keep.append(g[(g["rent"] >= lo) & (g["rent"] <= hi)])
    out = pd.concat(keep).reset_index(drop=True)

    log.info("clean_rentals: %d -> %d (sanity) -> %d (IQR per BHK)  [removed %d]",
             n0, n1, len(out), n0 - len(out))
    out["rent_per_sqft"] = (out["rent"] / out["area"]).round(2)
    return out


def locality_rent_table(clean_df: pd.DataFrame) -> pd.DataFrame:
    """Per-locality rent summary used by the index: median rent (overall &
    per BHK), median rent/sqft, listing count, and an IQR-based spread."""
    g = clean_df.groupby("locality")
    tbl = pd.DataFrame({
        "n_listings": g.size(),
        "median_rent": g["rent"].median().round(0),
        "median_rent_per_sqft": g["rent_per_sqft"].median().round(2),
        "rent_iqr": (g["rent"].quantile(0.75) - g["rent"].quantile(0.25)).round(0),
        "median_area": g["area"].median().round(0),
    })
    # per-BHK median rent (wide), useful for persona BHK selection
    bhk = (clean_df.pivot_table(index="locality", columns="beds",
                                values="rent", aggfunc="median")
           .add_prefix("median_rent_").round(0))
    tbl = tbl.join(bhk).reset_index().sort_values("median_rent").reset_index(drop=True)
    save_table(tbl, "locality_rent")
    return tbl
