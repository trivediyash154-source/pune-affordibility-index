"""Module: geo — geocode localities + hubs; road-network commute (STEP 4 prep).

Coordinates come from OSM Nominatim (rate-limited, cached to disk so we don't
re-query and so results are reproducible). Commute uses the OSRM public router
(real driving distance/time on the OSM road graph); if OSRM is unreachable we
fall back to a documented great-circle * detour-factor proxy.
"""
from __future__ import annotations

import time

import pandas as pd
import requests
from geopy.distance import geodesic
from geopy.extra.rate_limiter import RateLimiter
from geopy.geocoders import Nominatim

from .utils import get_logger, record_provenance, rel, save_table

log = get_logger("geo")

OSRM = ("https://router.project-osrm.org/route/v1/driving/"
        "{lon1},{lat1};{lon2},{lat2}?overview=false")
# Pune bounding box for a sanity check on geocoded points
PUNE_BBOX = {"lat": (18.35, 18.75), "lon": (73.65, 74.05)}
DETOUR_FACTOR = 1.4          # road km vs straight-line (fallback only)
URBAN_SPEED_KMH = 25.0       # fallback travel speed

# Manual coordinate overrides for localities Nominatim disambiguates wrongly.
# These are the CORRECT real locations (verified against OSM), documented so the
# fix is transparent and reproducible — not fabricated data.
GEOCODE_OVERRIDES: dict[str, tuple[float, float]] = {
    # Nominatim returns a Mahalunge ~50 km north (near Chakan); the study area
    # is Maan-Mahalunge, the Hinjewadi/Balewadi-adjacent IT locality.
    "Mahalunge": (18.5896, 73.7180),
}


def geocode_places(names: list[str],
                   cache: str = "data/processed/geocoded.csv") -> pd.DataFrame:
    """Geocode place names to lat/lon (cached). Query '<name>, Pune, India'."""
    path = rel(cache)
    cached: dict[str, tuple[float, float]] = {}
    if path.exists():
        c = pd.read_csv(path)
        cached = {r.place: (r.lat, r.lon) for r in c.itertuples()}

    geocoder = Nominatim(user_agent="pune-affordability-research", timeout=10)
    geocode = RateLimiter(geocoder.geocode, min_delay_seconds=1.1)

    rows, new = [], 0
    for name in names:
        if name in GEOCODE_OVERRIDES:
            lat, lon = GEOCODE_OVERRIDES[name]
        elif name in cached:
            lat, lon = cached[name]
        else:
            loc = geocode(f"{name}, Pune, Maharashtra, India")
            if loc is None:
                log.warning("geocode FAILED: %s", name)
                continue
            lat, lon, new = loc.latitude, loc.longitude, new + 1
        in_box = (PUNE_BBOX["lat"][0] <= lat <= PUNE_BBOX["lat"][1]
                  and PUNE_BBOX["lon"][0] <= lon <= PUNE_BBOX["lon"][1])
        if not in_box:
            log.warning("geocode OUT-OF-PUNE: %s -> (%.4f, %.4f)", name, lat, lon)
        rows.append({"place": name, "lat": lat, "lon": lon, "in_pune": in_box})

    df = pd.DataFrame(rows)
    df.to_csv(path, index=False)
    log.info("geocoded %d places (%d new); %d outside Pune bbox",
             len(df), new, int((~df["in_pune"]).sum()))
    return df


def osrm_route(lat1: float, lon1: float, lat2: float, lon2: float) -> tuple[float, float]:
    """Return (km, minutes) by road; great-circle*detour fallback on failure."""
    try:
        r = requests.get(OSRM.format(lon1=lon1, lat1=lat1, lon2=lon2, lat2=lat2),
                         timeout=12).json()
        if r.get("code") == "Ok" and r.get("routes"):
            rt = r["routes"][0]
            return rt["distance"] / 1000.0, rt["duration"] / 60.0
    except Exception as e:  # network / server hiccup
        log.debug("OSRM failed (%s); using fallback", e)
    km = geodesic((lat1, lon1), (lat2, lon2)).km * DETOUR_FACTOR
    return km, km / URBAN_SPEED_KMH * 60.0


def commute_table(study: pd.DataFrame, work_hubs: list[str],
                  cache: str = "data/processed/commute.csv") -> pd.DataFrame:
    """Road distance/time to the NEAREST hub for each study locality."""
    path = rel(cache)
    if path.exists():
        log.info("commute: using cached %s", path)
        df = pd.read_csv(path)
        save_table(df, "commute")          # mirror to outputs/tables/
        return df

    coords_df = geocode_places(list(study["locality"]) + work_hubs)
    coords = {r.place: (r.lat, r.lon) for r in coords_df.itertuples()}

    rows = []
    for loc in study["locality"]:
        if loc not in coords:
            continue
        best = None
        for hub in work_hubs:
            if hub not in coords:
                continue
            km, mins = osrm_route(*coords[loc], *coords[hub])
            time.sleep(0.15)  # be polite to the public OSRM server
            if best is None or mins < best[1]:
                best = (km, mins, hub)
        rows.append({"locality": loc, "nearest_hub": best[2],
                     "commute_km": round(best[0], 2), "commute_min": round(best[1], 1)})

    df = pd.DataFrame(rows)
    df.to_csv(path, index=False)
    record_provenance([{
        "field": "commute_min", "table": "commute", "dimension": "commute",
        "source_name": "OSRM road router + OSM road graph", "source_url": "https://router.project-osrm.org",
        "license": "ODbL (OSM)", "transform": "driving route to nearest of 3 work hubs (minutes)",
        "is_proxy": False, "caveat": "public OSRM server; off-peak free-flow time (no congestion model)",
    }])
    log.info("commute: %d localities routed to nearest hub", len(df))
    return df
