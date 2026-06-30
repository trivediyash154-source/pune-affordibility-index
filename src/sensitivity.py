"""Module: sensitivity — Monte-Carlo weight perturbation (STEP 5).

We resample the six weights ~10,000 times from a Dirichlet distribution centred
on the subjective weights, recompute the index each time, and measure how stable
each locality's rank is. A ranking that survives weight perturbation is one a
reviewer can trust; one that flips on small changes is not robust.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from .index import composite_for_season, assemble_indicators
from .mcda import score_matrix
from .utils import get_logger, load_config, rel, save_fig, save_table

log = get_logger("sensitivity")


def monte_carlo(cfg: dict | None = None, season: str = "Winter",
                n: int = 10000, concentration: float = 50.0) -> pd.DataFrame:
    """Rank stability under Dirichlet-perturbed weights."""
    cfg = cfg or load_config()
    M = score_matrix(cfg, season)
    dims = list(cfg["dimensions"])
    base = np.array([cfg["dimensions"][d]["weight"] for d in dims])

    rng = np.random.default_rng(cfg["project"]["seed"])
    W = rng.dirichlet(base * concentration, size=n)        # n x dims, mean ~ base
    S = M.to_numpy(float)                                   # localities x dims
    idx = S @ W.T                                           # localities x n
    # rank 1 = best (highest index) per simulation
    ranks = (-idx).argsort(axis=0).argsort(axis=0) + 1

    out = pd.DataFrame({
        "locality": M.index,
        "mean_rank": ranks.mean(axis=1).round(2),
        "rank_std": ranks.std(axis=1).round(2),
        "rank_ci_lower": np.percentile(ranks, 2.5, axis=1),    # 95% CI
        "rank_ci_upper": np.percentile(ranks, 97.5, axis=1),
        "best_rank": ranks.min(axis=1),
        "worst_rank": ranks.max(axis=1),
        "p_top1": (ranks == 1).mean(axis=1).round(3),
        "p_top3": (ranks <= 3).mean(axis=1).round(3),
        "p_top5": (ranks <= 5).mean(axis=1).round(3),
    }).sort_values("mean_rank").reset_index(drop=True)
    save_table(out, "sensitivity_ranks")
    log.info("MC %d runs | most stable top-3: %s", n,
             list(out.loc[out.p_top3 > 0.5, "locality"]))

    _plot_top3(out)
    _plot_rank_box(ranks, M.index, out)
    _plot_ci(out)
    return out


def _plot_ci(out: pd.DataFrame) -> None:
    """Top-10 localities: mean rank with 95% CI error bars."""
    import matplotlib.pyplot as plt
    d = out.head(10).iloc[::-1]
    lower = (d["mean_rank"] - d["rank_ci_lower"]).clip(lower=0)
    upper = (d["rank_ci_upper"] - d["mean_rank"]).clip(lower=0)
    fig, ax = plt.subplots(figsize=(7.5, 5))
    ax.errorbar(d["mean_rank"], d["locality"], xerr=[lower, upper],
                fmt="o", color="#2c7fb8", ecolor="#888", capsize=4)
    ax.set_xlabel("Rank (1 = best) — mean with 95% CI over 10,000 weight perturbations")
    ax.set_title("Ranking stability under weight perturbation")
    ax.invert_xaxis()
    save_fig(fig, "sensitivity_ci_plot"); plt.close(fig)


def _plot_top3(out: pd.DataFrame) -> None:
    import matplotlib.pyplot as plt
    d = out.sort_values("p_top3", ascending=True).tail(12)
    fig, ax = plt.subplots(figsize=(7, 5))
    ax.barh(d["locality"], d["p_top3"], color="#2c7fb8")
    ax.set_xlabel("P(rank ≤ 3) over 10,000 weight perturbations")
    ax.set_title("Ranking robustness — top-3 stability")
    save_fig(fig, "sensitivity_top3"); plt.close(fig)


def _plot_rank_box(ranks: np.ndarray, localities, out: pd.DataFrame) -> None:
    import matplotlib.pyplot as plt
    top = out.head(12)["locality"].tolist()
    pos = {loc: i for i, loc in enumerate(localities)}
    data = [ranks[pos[loc]] for loc in top]
    fig, ax = plt.subplots(figsize=(8, 5))
    ax.boxplot(data, tick_labels=top, showfliers=False)
    ax.set_ylabel("rank distribution (1 = best)")
    ax.set_title("Rank distribution under weight perturbation (top 12)")
    ax.invert_yaxis()
    plt.setp(ax.get_xticklabels(), rotation=40, ha="right")
    save_fig(fig, "sensitivity_rank_box"); plt.close(fig)
