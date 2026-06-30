"""Module: preprocess — locality normalisation + study-unit selection (STEP 1).

The study units are chosen from the data, not assumed: a locality qualifies if
it has at least `min_listings` Pune rent listings. Light, transparent name
normalisation only (whitespace + known spelling variants); we do NOT silently
merge distinct sub-areas, to keep provenance honest.
"""
from __future__ import annotations

import pandas as pd

from .utils import get_logger, load_config

log = get_logger("preprocess")

# Known spelling/format variants -> canonical name. Conservative on purpose.
LOCALITY_ALIASES: dict[str, str] = {
    "hinjawadi": "Hinjewadi",
    "hinjewadi phase 1": "Hinjewadi",
    "hinjewadi phase 2": "Hinjewadi",
    "hinjewadi phase 3": "Hinjewadi",
    "viman nagar central": "Viman Nagar",
    "magarpatta city": "Magarpatta",
}


def normalize_locality(name: str) -> str:
    """Collapse whitespace and map known spelling variants. No title-casing
    (it would mangle acronyms like 'NIBM Road'/'EON Free Zone')."""
    s = " ".join(str(name).split()).strip()
    return LOCALITY_ALIASES.get(s.lower(), s)


def select_study_localities(pune_df: pd.DataFrame,
                            min_listings: int = 15) -> pd.DataFrame:
    """Return localities with >= min_listings, with their listing counts.

    Columns: locality, n_listings (sorted descending).
    """
    df = pune_df.copy()
    df["locality"] = df["locality"].map(normalize_locality)
    counts = df["locality"].value_counts()
    sel = counts[counts >= min_listings]
    out = (sel.rename_axis("locality").reset_index(name="n_listings")
              .sort_values("n_listings", ascending=False).reset_index(drop=True))
    log.info("study units: %d/%d localities have >=%d listings (%d listings retained)",
             len(out), df["locality"].nunique(), min_listings, int(out["n_listings"].sum()))
    return out


def normalized_pune(pune_df: pd.DataFrame) -> pd.DataFrame:
    """Pune listings with the normalised locality column applied."""
    df = pune_df.copy()
    df["locality"] = df["locality"].map(normalize_locality)
    return df
