"""Module: recommend — transparent persona-based re-ranking (STEP 6).

Each persona is a different weight vector over the same six 0-100 scores. The
recommendation is therefore fully transparent: a locality ranks high for a
persona because the dimensions that persona cares about score high there.
"""
from __future__ import annotations

import pandas as pd

from .mcda import score_matrix
from .utils import get_logger, load_config, save_table

log = get_logger("recommend")


def persona_weights(cfg: dict, persona: str) -> pd.Series:
    return pd.Series(cfg["personas"][persona]["weights"])


def rank_for_weights(cfg: dict, weights: pd.Series, season: str = "Winter"):
    """Return (score matrix, index series sorted desc) for a weight vector."""
    M = score_matrix(cfg, season)
    weights = weights.reindex(M.columns).fillna(0.0)
    idx = (M * weights).sum(axis=1).sort_values(ascending=False)
    return M, idx


def recommend(cfg: dict, persona: str, season: str = "Winter", topn: int = 3) -> pd.DataFrame:
    """Top-N localities for a persona, with the reasons (top contributing dims)."""
    w = persona_weights(cfg, persona)
    M, idx = rank_for_weights(cfg, w, season)
    rows = []
    for loc in idx.head(topn).index:
        scores = M.loc[loc]
        contrib = (scores * w).sort_values(ascending=False)
        reasons = ", ".join(f"{d} {scores[d]:.0f}/100" for d in contrib.head(3).index)
        rows.append({"rank": len(rows) + 1, "locality": loc,
                     "persona_index": round(idx[loc], 1), "why": reasons})
    return pd.DataFrame(rows)


def all_personas(cfg: dict | None = None, season: str = "Winter") -> pd.DataFrame:
    """Top-3 for every persona — a single publishable recommender table."""
    cfg = cfg or load_config()
    frames = []
    for key, p in cfg["personas"].items():
        r = recommend(cfg, key, season)
        r.insert(0, "persona", p["label"])
        frames.append(r)
        log.info("%-24s -> %s", p["label"], list(r["locality"]))
    out = pd.concat(frames, ignore_index=True)
    save_table(out, "persona_recommendations")
    return out


def persona_season_matrix(cfg: dict | None = None) -> pd.DataFrame:
    """Top-1 locality for every persona x season (compact paper matrix)."""
    cfg = cfg or load_config()
    rows = []
    for season in cfg["seasons"]:
        for key, p in cfg["personas"].items():
            top = recommend(cfg, key, season, topn=1).iloc[0]
            rows.append({"persona": p["label"], "season": season,
                         "top_locality": top["locality"], "index": top["persona_index"]})
    mat = pd.DataFrame(rows)
    save_table(mat, "persona_season_matrix")
    return mat
