"""Module: fuzzy_topsis — Triangular Fuzzy Number (TFN) stochastic TOPSIS.

Persona weights are uncertain. We model each weight as a TFN (l, m, u), sample
crisp weights from a Triangular distribution 10,000 times, run standard TOPSIS each
time, and report a probability distribution over ranks (not a single point estimate).

References: Zadeh (1965) fuzzy sets; Chen (2000) fuzzy TOPSIS.

Honesty: TFN ranges are model-defined (l = 0.7m, u = 1.3m around the config weights),
not survey-derived — stated as a limitation. The decision matrix is the real 0-100
score matrix from the pipeline (composite_index.csv); only the weights are fuzzy.
"""
from __future__ import annotations

import numpy as np
import pandas as pd
import scipy.stats as st
from scipy.stats import spearmanr

from .utils import get_logger, rel, save_fig, save_table

log = get_logger("fuzzy_topsis")

DIMS = ["rent", "col", "commute", "aqi", "safety", "lifestyle"]
N_RUNS = 10_000
SEED = 42

# TFN weight vectors (l, m, u); m mirrors config.yaml, l=0.7m, u=1.3m.
TFN_WEIGHTS: dict[str, dict[str, tuple[float, float, float]]] = {
    "student_fresher": {
        "rent": (0.315, 0.45, 0.585), "col": (0.140, 0.20, 0.260),
        "commute": (0.070, 0.10, 0.130), "aqi": (0.035, 0.05, 0.065),
        "safety": (0.105, 0.15, 0.195), "lifestyle": (0.035, 0.05, 0.065),
    },
    "junior_it": {
        "rent": (0.210, 0.30, 0.390), "col": (0.105, 0.15, 0.195),
        "commute": (0.175, 0.25, 0.325), "aqi": (0.105, 0.15, 0.195),
        "safety": (0.070, 0.10, 0.130), "lifestyle": (0.035, 0.05, 0.065),
    },
    "senior_it": {
        "rent": (0.105, 0.15, 0.195), "col": (0.070, 0.10, 0.130),
        "commute": (0.105, 0.15, 0.195), "aqi": (0.070, 0.10, 0.130),
        "safety": (0.140, 0.20, 0.260), "lifestyle": (0.210, 0.30, 0.390),
    },
    "family_kids": {
        "rent": (0.070, 0.10, 0.130), "col": (0.070, 0.10, 0.130),
        "commute": (0.070, 0.10, 0.130), "aqi": (0.105, 0.15, 0.195),
        "safety": (0.175, 0.25, 0.325), "lifestyle": (0.210, 0.30, 0.390),
    },
    "remote_worker": {
        "rent": (0.140, 0.20, 0.260), "col": (0.105, 0.15, 0.195),
        "commute": (0.035, 0.05, 0.065), "aqi": (0.210, 0.30, 0.390),
        "safety": (0.070, 0.10, 0.130), "lifestyle": (0.140, 0.20, 0.260),
    },
}
PERSONA_LABELS = {
    "student_fresher": "Student / Fresher", "junior_it": "Junior IT Professional",
    "senior_it": "Senior IT Professional", "family_kids": "Family with Kids",
    "remote_worker": "Remote Worker",
}


def score_matrix(season: str) -> pd.DataFrame:
    """27 x 6 matrix of 0-100 scores for a season (already benefit-oriented)."""
    ci = pd.read_csv(rel("outputs/tables/composite_index.csv"))
    sub = ci[ci["season"] == season].drop_duplicates("locality").set_index("locality")
    M = sub[[f"{d}_score" for d in DIMS]].copy()
    M.columns = DIMS
    return M


def _vector_normalize(M: pd.DataFrame) -> np.ndarray:
    X = M.to_numpy(float)
    denom = np.sqrt((X ** 2).sum(axis=0))
    denom[denom == 0] = 1.0
    return X / denom


def _ranks_from_scores(C: np.ndarray, axis: int) -> np.ndarray:
    """Rank along axis, 1 = highest closeness."""
    return (-C).argsort(axis=axis).argsort(axis=axis) + 1


def topsis_deterministic(R: np.ndarray, weights: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Crisp TOPSIS (all criteria benefit-oriented). Returns (closeness, ranks)."""
    v = R * weights
    best, worst = v.max(axis=0), v.min(axis=0)
    s_best = np.sqrt(((v - best) ** 2).sum(axis=1))
    s_worst = np.sqrt(((v - worst) ** 2).sum(axis=1))
    total = s_best + s_worst
    total[total == 0] = 1.0
    C = s_worst / total
    return C, _ranks_from_scores(C, axis=0)


def fuzzy_ranks(R: np.ndarray, tfn: dict, n: int = N_RUNS, seed: int = SEED) -> np.ndarray:
    """Monte-Carlo TFN-TOPSIS. Returns rank matrix (n_runs x n_localities)."""
    rng = np.random.default_rng(seed)
    W = np.empty((n, len(DIMS)))
    for j, d in enumerate(DIMS):
        l, m, u = tfn[d]
        c = (m - l) / (u - l)
        W[:, j] = st.triang.rvs(c, loc=l, scale=u - l, size=n, random_state=rng)
    W /= W.sum(axis=1, keepdims=True)                     # renormalize each run to sum 1

    v = R[None, :, :] * W[:, None, :]                    # n x localities x dims
    best = v.max(axis=1, keepdims=True)
    worst = v.min(axis=1, keepdims=True)
    s_best = np.sqrt(((v - best) ** 2).sum(axis=2))
    s_worst = np.sqrt(((v - worst) ** 2).sum(axis=2))
    total = s_best + s_worst
    total[total == 0] = 1.0
    C = s_worst / total                                  # n x localities
    return _ranks_from_scores(C, axis=1)


def _summarize(ranks: np.ndarray, localities: list[str], persona: str, season: str) -> pd.DataFrame:
    return pd.DataFrame({
        "persona": persona, "season": season, "locality": localities,
        "rank_mean": ranks.mean(0).round(2), "rank_std": ranks.std(0).round(2),
        "rank_median": np.median(ranks, 0),
        "p_rank1": (ranks == 1).mean(0).round(3),
        "p_top3": (ranks <= 3).mean(0).round(3),
        "p_top5": (ranks <= 5).mean(0).round(3),
        "p_top10": (ranks <= 10).mean(0).round(3),
        "rank_95_lo": np.percentile(ranks, 2.5, axis=0),
        "rank_95_hi": np.percentile(ranks, 97.5, axis=0),
    }).sort_values("rank_mean").reset_index(drop=True)


def spearman_monsoon_vs_winter() -> float:
    """EXACT Spearman rho between deterministic Monsoon and Winter ranks."""
    long = pd.read_csv(rel("outputs/tables/index_by_season_long.csv"))
    piv = long.pivot(index="locality", columns="season", values="rank")
    rho, _ = spearmanr(piv["Monsoon"], piv["Winter"])
    return float(rho)


def main(headline_persona: str = "student_fresher", season: str = "Winter") -> dict:
    M = score_matrix(season)
    localities = list(M.index)
    R = _vector_normalize(M)

    # fuzzy results for ALL personas (this season)
    all_summ = []
    headline_ranks = None
    for p, tfn in TFN_WEIGHTS.items():
        ranks = fuzzy_ranks(R, tfn)
        all_summ.append(_summarize(ranks, localities, p, season))
        if p == headline_persona:
            headline_ranks = ranks
    results = pd.concat(all_summ, ignore_index=True)
    save_table(results, "fuzzy_topsis_results")

    # deterministic vs fuzzy (headline persona)
    m_w = np.array([TFN_WEIGHTS[headline_persona][d][1] for d in DIMS])
    m_w = m_w / m_w.sum()
    _, det_ranks = topsis_deterministic(R, m_w)
    h = results[results["persona"] == headline_persona].set_index("locality").reindex(localities)
    cmp = pd.DataFrame({
        "locality": localities,
        "det_rank": det_ranks,
        "fuzzy_mean_rank": h["rank_mean"].to_numpy(),
        "fuzzy_rank_std": h["rank_std"].to_numpy(),
        "p_top3": h["p_top3"].to_numpy(),
    }).sort_values("det_rank").reset_index(drop=True)
    save_table(cmp, "deterministic_vs_fuzzy")
    n_changed = int((np.abs(cmp["det_rank"] - cmp["fuzzy_mean_rank"]) > 2).sum())

    rho = spearman_monsoon_vs_winter()

    # figures
    _plot_probabilistic(headline_ranks, localities, headline_persona, season)
    _plot_det_vs_fuzzy(cmp, headline_persona, season)

    # ---- prints ----
    hp = results[results["persona"] == headline_persona].sort_values("p_top3", ascending=False)
    print(f"\n=== TFN-TOPSIS — {PERSONA_LABELS[headline_persona]}, {season} ===")
    print("Top 5 by P(Top 3):  Locality | P(Rank1) | P(Top3) | P(Top5) | Mean±Std")
    for _, r in hp.head(5).iterrows():
        print(f"  {r['locality']:<16} {r['p_rank1']:.3f}   {r['p_top3']:.3f}   {r['p_top5']:.3f}   {r['rank_mean']:.2f}±{r['rank_std']:.2f}")
    hin = hp[hp["locality"] == "Hinjewadi"]
    if not hin.empty:
        r = hin.iloc[0]
        print(f"  >> Hinjewadi: P(Rank1)={r['p_rank1']:.3f}  P(Top3)={r['p_top3']:.3f}  P(Top5)={r['p_top5']:.3f}  mean rank={r['rank_mean']:.2f}")

    print(f"\nSpearman rho (Monsoon vs Winter, deterministic ranks): {rho:.6f}")
    print(f"Localities with |det_rank - fuzzy_mean_rank| > 2: {n_changed}")

    p_hin_top3 = float(hin.iloc[0]["p_top3"]) if not hin.empty else float("nan")
    return {"spearman_monsoon_winter": rho, "rank_changed_gt2": n_changed,
            "p_hinjewadi_top3": p_hin_top3, "season": season, "persona": headline_persona}


def _plot_probabilistic(ranks, localities, persona, season) -> None:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    p1 = (ranks == 1).mean(0)
    p23 = ((ranks >= 2) & (ranks <= 3)).mean(0)
    p45 = ((ranks >= 4) & (ranks <= 5)).mean(0)
    p610 = ((ranks >= 6) & (ranks <= 10)).mean(0)
    p11 = (ranks >= 11).mean(0)
    df = pd.DataFrame({"loc": localities, "p1": p1, "p23": p23, "p45": p45, "p610": p610, "p11": p11})
    df["ptop3"] = df["p1"] + df["p23"]
    df = df.sort_values("ptop3").tail(15)

    fig, ax = plt.subplots(figsize=(9, 7))
    left = np.zeros(len(df))
    segs = [("p1", "P(Rank 1)", "#2DD4BF"), ("p23", "P(Rank 2-3)", "#22C55E"),
            ("p45", "P(Rank 4-5)", "#F0A500"), ("p610", "P(Rank 6-10)", "#F97316"),
            ("p11", "P(Rank 11+)", "#9A9A9A")]
    for col, label, color in segs:
        ax.barh(df["loc"], df[col], left=left, color=color, label=label)
        left += df[col].to_numpy()
    ax.set_xlabel("Probability")
    ax.set_xlim(0, 1)
    ax.set_title(f"Rank Probability Distribution — {PERSONA_LABELS[persona]}, {season}")
    ax.legend(loc="lower right", fontsize=8)
    save_fig(fig, "probabilistic_rankings")
    plt.close(fig)


def _plot_det_vs_fuzzy(cmp: pd.DataFrame, persona, season) -> None:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    fig, ax = plt.subplots(figsize=(7, 6.5))
    sc = ax.scatter(cmp["det_rank"], cmp["fuzzy_mean_rank"], c=cmp["fuzzy_rank_std"],
                    cmap="YlOrRd", s=60, edgecolor="black", linewidth=0.4)
    lim = [0, len(cmp) + 1]
    ax.plot(lim, lim, ls="--", c="grey", lw=1, label="perfect agreement")
    for _, r in cmp.iterrows():
        ax.annotate(r["locality"], (r["det_rank"], r["fuzzy_mean_rank"]), fontsize=7,
                    xytext=(3, 3), textcoords="offset points")
    ax.set_xlabel("Deterministic rank (crisp m weights)")
    ax.set_ylabel("Fuzzy mean rank (10,000 runs)")
    ax.set_title(f"Deterministic vs Fuzzy — {PERSONA_LABELS[persona]}, {season}")
    fig.colorbar(sc, ax=ax, label="fuzzy rank std (uncertainty)")
    ax.legend(loc="upper left", fontsize=8)
    save_fig(fig, "deterministic_vs_fuzzy_comparison")
    plt.close(fig)
