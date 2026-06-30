"""Module: mcda — objective weighting (entropy) + TOPSIS cross-validation (STEP 5).

All methods operate on the 0-100 score matrix from the composite index (already
direction-adjusted so higher = better on every dimension). We then check whether
different, independent methods AGREE — this is convergent validity, the honest
claim available when there is no ground-truth "true affordability".
"""
from __future__ import annotations

import numpy as np
import pandas as pd
from scipy.stats import spearmanr

from .index import assemble_indicators, composite_for_season
from .utils import get_logger, load_config, rel, save_fig, save_table

log = get_logger("mcda")


def score_matrix(cfg: dict, season: str = "Winter") -> pd.DataFrame:
    """Localities x dimensions matrix of 0-100 scores for one season."""
    base = assemble_indicators(cfg)
    aqi = pd.read_csv(rel("outputs/tables/aqi_seasonal.csv"))
    res = composite_for_season(base, aqi, season, cfg)
    dims = list(cfg["dimensions"])
    M = res.set_index("locality")[[f"score_{d}" for d in dims]]
    M.columns = dims
    return M


def entropy_weights(M: pd.DataFrame) -> pd.Series:
    """Shannon-entropy objective weights. Flat columns (no dispersion) -> ~0."""
    X = M.to_numpy(float)
    col_sums = X.sum(axis=0)
    col_sums[col_sums == 0] = 1.0
    P = X / col_sums
    m = X.shape[0]
    k = 1.0 / np.log(m)
    with np.errstate(divide="ignore", invalid="ignore"):
        terms = np.where(P > 0, P * np.log(P), 0.0)
    E = -k * terms.sum(axis=0)
    d = 1.0 - E                      # divergence (information content)
    w = d / d.sum() if d.sum() > 0 else np.full_like(d, 1 / len(d))
    return pd.Series(w, index=M.columns)


def topsis(M: pd.DataFrame, weights: pd.Series) -> pd.Series:
    """TOPSIS closeness coefficient (0-1, higher = better). Inputs are benefit-oriented."""
    X = M.to_numpy(float)
    denom = np.sqrt((X ** 2).sum(axis=0))
    denom[denom == 0] = 1.0
    v = (X / denom) * weights.to_numpy()
    best, worst = v.max(axis=0), v.min(axis=0)
    s_best = np.sqrt(((v - best) ** 2).sum(axis=1))
    s_worst = np.sqrt(((v - worst) ** 2).sum(axis=1))
    total = s_best + s_worst
    total[total == 0] = 1.0
    return pd.Series(s_worst / total, index=M.index)


def run_mcda(cfg: dict | None = None, season: str = "Winter") -> pd.DataFrame:
    """Compare subjective vs entropy weights and composite vs TOPSIS rankings."""
    cfg = cfg or load_config()
    M = score_matrix(cfg, season)
    dims = list(cfg["dimensions"])
    w_subj = pd.Series({d: cfg["dimensions"][d]["weight"] for d in dims})
    w_entr = entropy_weights(M)

    # weight comparison table
    wtab = pd.DataFrame({"subjective": w_subj, "entropy": w_entr.round(3)})
    save_table(wtab.reset_index().rename(columns={"index": "dimension"}), "weights_comparison")
    log.info("entropy weights: %s", {k: round(v, 3) for k, v in w_entr.items()})

    # rankings under each scheme
    idx_subj = (M * w_subj).sum(axis=1)
    idx_entr = (M * w_entr).sum(axis=1)
    tps = topsis(M, w_subj)

    out = pd.DataFrame({
        "composite_subjective": idx_subj.round(1),
        "composite_entropy": idx_entr.round(1),
        "topsis": tps.round(4),
    })
    out["rank_subjective"] = out["composite_subjective"].rank(ascending=False, method="min").astype(int)
    out["rank_entropy"] = out["composite_entropy"].rank(ascending=False, method="min").astype(int)
    out["rank_topsis"] = out["topsis"].rank(ascending=False, method="min").astype(int)
    out = out.sort_values("rank_subjective")
    save_table(out.reset_index(), "mcda_rankings")

    # split-out deliverables matching the spec's exact filenames
    save_table(out.reset_index()[["locality", "composite_entropy", "rank_entropy"]]
               .sort_values("rank_entropy"), "composite_index_entropy")
    save_table(out.reset_index()[["locality", "composite_subjective", "rank_subjective",
                                  "topsis", "rank_topsis"]], "topsis_comparison")

    rho_te, _ = spearmanr(out["rank_subjective"], out["rank_topsis"])
    rho_se, _ = spearmanr(out["rank_subjective"], out["rank_entropy"])
    log.info("Spearman composite-vs-TOPSIS rho=%.4f | composite-vs-entropy rho=%.4f", rho_te, rho_se)

    _plot_weights(wtab)
    _plot_index_vs_topsis(out, rho_te)
    _plot_pareto(M, cfg)
    return out


def _plot_weights(wtab: pd.DataFrame) -> None:
    import matplotlib.pyplot as plt
    ax = wtab.plot(kind="bar", figsize=(7, 4.2), color=["#2c7fb8", "#d95f02"])
    ax.set_ylabel("weight"); ax.set_title("Subjective vs entropy (objective) weights")
    ax.set_xticklabels(wtab.index, rotation=30, ha="right")
    save_fig(ax.figure, "weights_subjective_vs_entropy"); plt.close(ax.figure)


def _plot_index_vs_topsis(out: pd.DataFrame, rho: float) -> None:
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots(figsize=(5.2, 5))
    ax.scatter(out["rank_subjective"], out["rank_topsis"], c="#2c7fb8")
    lim = [0, out["rank_subjective"].max() + 1]
    ax.plot(lim, lim, ls="--", c="grey")
    ax.set_xlabel("Composite rank"); ax.set_ylabel("TOPSIS rank")
    ax.set_title(f"Composite vs TOPSIS  (Spearman rho = {rho:.3f})")
    save_fig(fig, "index_vs_topsis"); plt.close(fig)


def _plot_pareto(M: pd.DataFrame, cfg: dict) -> None:
    """Affordability vs livability Pareto frontier; mark non-dominated localities."""
    import matplotlib.pyplot as plt
    aff = M["rent"]
    liv = M[["commute", "aqi", "safety", "lifestyle"]].mean(axis=1)
    df = pd.DataFrame({"affordability": aff, "livability": liv})

    nd = []
    for loc in df.index:
        dominated = ((df["affordability"] >= df.loc[loc, "affordability"]) &
                     (df["livability"] >= df.loc[loc, "livability"]) &
                     ((df["affordability"] > df.loc[loc, "affordability"]) |
                      (df["livability"] > df.loc[loc, "livability"]))).any()
        nd.append(not dominated)
    df["pareto_optimal"] = nd
    save_table(df.reset_index(), "pareto_frontier")

    fig, ax = plt.subplots(figsize=(6.5, 5))
    ax.scatter(df.loc[~df.pareto_optimal, "affordability"], df.loc[~df.pareto_optimal, "livability"],
               c="#999", label="dominated")
    front = df[df.pareto_optimal].sort_values("affordability")
    ax.scatter(front["affordability"], front["livability"], c="#d95f02", s=70, label="Pareto-optimal")
    ax.plot(front["affordability"], front["livability"], c="#d95f02", ls="--", lw=1)
    for loc, r in df.iterrows():
        ax.annotate(loc, (r["affordability"], r["livability"]), fontsize=7,
                    xytext=(3, 3), textcoords="offset points")
    ax.set_xlabel("Affordability (rent score, higher = cheaper)")
    ax.set_ylabel("Livability (commute/AQI/safety/lifestyle)")
    ax.set_title("Affordability vs livability — Pareto frontier")
    ax.legend()
    save_fig(fig, "pareto_frontier"); plt.close(fig)
    log.info("Pareto-optimal localities: %s", list(front.index))
