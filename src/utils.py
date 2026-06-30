"""Shared utilities: config, logging, reproducibility, provenance, and IO.

Every module imports from here so behaviour (random seeds, figure DPI, the
data-dictionary format) is identical across the whole pipeline. Keeping these
in one place is what makes the project reproducible and auditable.
"""
from __future__ import annotations

import logging
import os
import random
from datetime import date
from pathlib import Path
from typing import Any

import yaml

# Repo root = parent of the src/ directory that holds this file.
PROJECT_ROOT: Path = Path(__file__).resolve().parents[1]

FIG_DPI = 300  # publication quality everywhere


# --------------------------------------------------------------------------- #
# Config
# --------------------------------------------------------------------------- #
def load_config(path: str | Path = "config.yaml") -> dict[str, Any]:
    """Load the YAML config. Relative paths resolve against the repo root."""
    cfg_path = Path(path)
    if not cfg_path.is_absolute():
        cfg_path = PROJECT_ROOT / cfg_path
    with open(cfg_path, "r", encoding="utf-8") as fh:
        return yaml.safe_load(fh)


def rel(*parts: str) -> Path:
    """Absolute path built from repo-root-relative parts (creates nothing)."""
    return PROJECT_ROOT.joinpath(*parts)


# --------------------------------------------------------------------------- #
# Logging
# --------------------------------------------------------------------------- #
def get_logger(name: str) -> logging.Logger:
    """Module-level logger with a consistent one-line format (idempotent)."""
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(
            logging.Formatter(
                "%(asctime)s | %(levelname)-7s | %(name)-12s | %(message)s",
                datefmt="%H:%M:%S",
            )
        )
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
        logger.propagate = False
    return logger


# --------------------------------------------------------------------------- #
# Reproducibility
# --------------------------------------------------------------------------- #
def set_seed(seed: int = 42) -> None:
    """Seed every RNG we touch so results are bit-for-bit reproducible."""
    os.environ["PYTHONHASHSEED"] = str(seed)
    random.seed(seed)
    try:
        import numpy as np

        np.random.seed(seed)
    except ImportError:  # numpy always present in practice; guard anyway
        pass


# --------------------------------------------------------------------------- #
# IO helpers (consistent output locations + DPI)
# --------------------------------------------------------------------------- #
def save_table(df, name: str, *, index: bool = False) -> Path:
    """Write a DataFrame to outputs/tables/<name>.csv and return the path."""
    out = rel("outputs", "tables", name if name.endswith(".csv") else f"{name}.csv")
    out.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(out, index=index)
    return out


def save_fig(fig, name: str) -> Path:
    """Save a Matplotlib figure to outputs/figures/<name>.png at 300 dpi."""
    out = rel("outputs", "figures", name if name.endswith(".png") else f"{name}.png")
    out.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out, dpi=FIG_DPI, bbox_inches="tight")
    return out


# --------------------------------------------------------------------------- #
# Provenance / data dictionary
# --------------------------------------------------------------------------- #
DATA_DICT_COLUMNS = [
    "field",        # column name produced
    "table",        # processed table it lives in
    "dimension",    # which of the six dimensions (or 'meta'/'ml')
    "source_name",  # human-readable source
    "source_url",   # citable URL
    "license",      # usage terms
    "transform",    # how the raw value became this field
    "is_proxy",     # True if a documented proxy, not a direct measurement
    "caveat",       # honest limitation
    "accessed",     # ISO date
]


def record_provenance(rows: list[dict[str, Any]],
                      dict_path: str | Path = "data/processed/data_dictionary.csv") -> Path:
    """Append rows to the data dictionary CSV (creates it with headers if new).

    Each row documents the provenance of one produced field. This is what lets
    a reviewer trace every number in the paper back to a real, licensed source.
    """
    import csv

    out = Path(dict_path)
    if not out.is_absolute():
        out = PROJECT_ROOT / out
    out.parent.mkdir(parents=True, exist_ok=True)
    today = date.today().isoformat()

    existing_keys: set[tuple[str, str]] = set()
    write_header = not out.exists()
    if out.exists():
        with open(out, newline="", encoding="utf-8") as fh:
            for r in csv.DictReader(fh):
                existing_keys.add((r.get("field", ""), r.get("table", "")))

    with open(out, "a", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=DATA_DICT_COLUMNS)
        if write_header:
            writer.writeheader()
        for row in rows:
            key = (row.get("field", ""), row.get("table", ""))
            if key in existing_keys:
                continue  # idempotent: don't duplicate on re-runs
            row.setdefault("accessed", today)
            writer.writerow({c: row.get(c, "") for c in DATA_DICT_COLUMNS})
            existing_keys.add(key)
    return out
