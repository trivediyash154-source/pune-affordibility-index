"""Module: features — OSM amenity counts -> lifestyle + safety indicators (STEP 4 prep).

For each locality centroid we count POIs within a fixed radius via osmnx/Overpass.
  lifestyle_raw : weighted amenity count (benefit; higher = better)
  safety_raw    : police-station count within radius (DOCUMENTED PROXY; weak,
                  possibly inverted — see methodology limitations)

Raw counts are cached with the OSM snapshot date so results are reproducible.
"""
from __future__ import annotations

from datetime import date

import pandas as pd

from .utils import get_logger, record_provenance, rel, save_table

log = get_logger("features")

RADIUS_M = 2000
POI_TAGS = {"amenity": ["hospital", "school", "police", "cafe"],
            "leisure": "park", "shop": "mall",
            "public_transport": ["station", "stop_position"],
            "highway": "bus_stop", "railway": ["station", "halt"]}
# Transparent lifestyle weighting (echoes the original project's intent)
LIFESTYLE_WEIGHTS = {"hospitals": 1.5, "schools": 1.2, "malls": 2.0,
                     "parks": 1.0, "cafes": 1.0, "transit": 1.0}


def _count_pois(lat: float, lon: float) -> dict[str, int]:
    import osmnx as ox
    counts = {k: 0 for k in ("hospitals", "schools", "police", "cafes", "parks", "malls", "transit")}
    try:
        g = ox.features_from_point((lat, lon), POI_TAGS, dist=RADIUS_M)
    except Exception as e:  # no features in radius -> osmnx may raise
        log.debug("no POIs near (%.4f,%.4f): %s", lat, lon, e)
        return counts
    if "amenity" in g.columns:
        vc = g["amenity"].value_counts()
        counts.update(hospitals=int(vc.get("hospital", 0)), schools=int(vc.get("school", 0)),
                      police=int(vc.get("police", 0)), cafes=int(vc.get("cafe", 0)))
    if "leisure" in g.columns:
        counts["parks"] = int((g["leisure"] == "park").sum())
    if "shop" in g.columns:
        counts["malls"] = int((g["shop"] == "mall").sum())
    # transit = bus stops + rail/metro stations + public-transport stations
    transit = 0
    if "highway" in g.columns:
        transit += int((g["highway"] == "bus_stop").sum())
    if "railway" in g.columns:
        transit += int(g["railway"].isin(["station", "halt"]).sum())
    if "public_transport" in g.columns:
        transit += int(g["public_transport"].isin(["station", "stop_position"]).sum())
    counts["transit"] = transit
    return counts


def amenities_table(study: pd.DataFrame,
                    cache: str = "data/processed/amenities.csv") -> pd.DataFrame:
    """Per-locality OSM amenity counts + lifestyle_raw + safety_raw (cached)."""
    path = rel(cache)
    if path.exists():
        log.info("amenities: using cached %s", path)
        return pd.read_csv(path)

    geo = pd.read_csv(rel("data/processed/geocoded.csv"))
    coords = {r.place: (r.lat, r.lon) for r in geo.itertuples()}

    rows = []
    for loc in study["locality"]:
        if loc not in coords:
            log.warning("no coords for %s; skipping amenities", loc)
            continue
        c = _count_pois(*coords[loc])
        c["locality"] = loc
        c["lifestyle_raw"] = round(sum(LIFESTYLE_WEIGHTS[k] * c[k] for k in LIFESTYLE_WEIGHTS), 1)
        c["safety_raw"] = c["police"]  # documented proxy
        rows.append(c)
        log.info("%-16s hosp=%d sch=%d pol=%d cafe=%d park=%d mall=%d transit=%d -> lifestyle=%.1f",
                 loc, c["hospitals"], c["schools"], c["police"], c["cafes"],
                 c["parks"], c["malls"], c["transit"], c["lifestyle_raw"])

    df = pd.DataFrame(rows)
    df["osm_snapshot"] = date.today().isoformat()
    df.to_csv(path, index=False)

    record_provenance([
        {"field": "lifestyle_raw", "table": "amenities", "dimension": "lifestyle",
         "source_name": "OpenStreetMap (osmnx/Overpass)", "source_url": "https://www.openstreetmap.org",
         "license": "ODbL", "transform": f"weighted POI count within {RADIUS_M} m of centroid",
         "is_proxy": False, "caveat": "OSM completeness varies by area; snapshot date recorded"},
        {"field": "safety_raw", "table": "amenities", "dimension": "safety",
         "source_name": "OpenStreetMap (osmnx/Overpass)", "source_url": "https://www.openstreetmap.org",
         "license": "ODbL", "transform": f"police-station count within {RADIUS_M} m of centroid",
         "is_proxy": True, "caveat": "PROXY for safety: weak and possibly inverted (police presence "
                                     "can track higher reported crime). No open locality crime data exists."},
    ])
    save_table(df, "amenities")
    log.info("amenities: %d localities", len(df))
    return df
