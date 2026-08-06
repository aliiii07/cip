"""Validates Strategy JSON against schemas/strategy.json plus rules that
plain JSON Schema cannot express (cross-field constraints, banned copy).

This is the boundary gate referenced throughout CLAUDE.md: every agent that
produces or consumes a strategy must call validate_strategy() on it before
passing it along.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator

# Strategy JSON emitted/consumed by agents must never carry this language,
# whether in Architect-authored `name`/`description` or anywhere else it
# might reach UI copy. See CLAUDE.md "Hard rules".
FORBIDDEN_TERMS = (
    "guaranteed",
    "wealth generation",
    "you will earn",
    "passive income",
    "risk-free",
    "market-neutral",
)

# Of the terms above, only "market-neutral" is banned conditionally — CLAUDE.md
# bans it "stated without qualification", and the funding-carry archetype is
# *required* to carry the negation ("Not market-neutral: exposed to ...").
# These qualified forms are stripped before scanning.
_QUALIFIED_FORMS = (
    "not market-neutral",
    "never market-neutral",
)

_SCHEMA_PATH = Path(__file__).resolve().parents[2] / "schemas" / "strategy.json"


class StrategyValidationError(ValueError):
    """Raised when a strategy fails schema or semantic validation.

    Carries every error found, not just the first, so a caller (or an
    Architect retry loop) can fix everything in one pass.
    """

    def __init__(self, errors: list[str]):
        self.errors = errors
        super().__init__("\n".join(errors))


def _load_schema() -> dict[str, Any]:
    with _SCHEMA_PATH.open() as f:
        return json.load(f)


_SCHEMA = _load_schema()
_VALIDATOR = Draft202012Validator(_SCHEMA)


def _schema_errors(strategy: dict[str, Any]) -> list[str]:
    errors = []
    for err in sorted(_VALIDATOR.iter_errors(strategy), key=lambda e: list(e.absolute_path)):
        path = "$" + "".join(
            f"[{p!r}]" if isinstance(p, str) else f"[{p}]" for p in err.absolute_path
        )
        errors.append(f"{path}: {err.message}")
    return errors


def _semantic_errors(strategy: dict[str, Any]) -> list[str]:
    """Cross-field and content rules JSON Schema can't express."""
    errors: list[str] = []

    universe = strategy.get("universe")
    per_asset = strategy.get("risk_management", {}).get("per_asset_parameters")
    if isinstance(universe, list) and isinstance(per_asset, dict):
        universe_set = set(universe)
        per_asset_set = set(per_asset.keys())
        missing = universe_set - per_asset_set
        extra = per_asset_set - universe_set
        if missing:
            errors.append(
                "$.risk_management.per_asset_parameters: missing entries for "
                f"universe symbols {sorted(missing)} -- every asset needs its own "
                "parameters, never a shared default (CLAUDE.md backtest integrity)."
            )
        if extra:
            errors.append(
                "$.risk_management.per_asset_parameters: entries for symbols not "
                f"in universe {sorted(extra)}."
            )

    for field in ("name", "description"):
        text = strategy.get(field)
        if not isinstance(text, str):
            continue
        lowered = text.lower()
        for qualified in _QUALIFIED_FORMS:
            lowered = lowered.replace(qualified, "")
        hits = [term for term in FORBIDDEN_TERMS if term in lowered]
        if hits:
            errors.append(
                f"$.{field}: contains forbidden profit/return language {hits} "
                "(CLAUDE.md: never use profit/return language in UI copy, docs, "
                "marketing, or comments)."
            )

    return errors


def validate_strategy(strategy: dict[str, Any]) -> None:
    """Raises StrategyValidationError with every problem found, if any."""
    errors = _schema_errors(strategy)
    # Semantic checks assume a structurally sane object; skip them if the
    # schema already rejected the shape they depend on.
    if not errors:
        errors = _semantic_errors(strategy)
    if errors:
        raise StrategyValidationError(errors)


def is_valid(strategy: dict[str, Any]) -> bool:
    try:
        validate_strategy(strategy)
    except StrategyValidationError:
        return False
    return True

