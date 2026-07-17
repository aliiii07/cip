import json
from pathlib import Path

import pytest

from cip.validation import StrategyValidationError, validate_strategy

FIXTURES_DIR = Path(__file__).resolve().parents[1] / "fixtures" / "strategies"
VALID_FIXTURES = sorted(FIXTURES_DIR.glob("*.json"))
INVALID_FIXTURES = sorted((FIXTURES_DIR / "invalid").glob("*.json"))


@pytest.mark.parametrize("path", VALID_FIXTURES, ids=lambda p: p.name)
def test_valid_fixtures_pass(path):
    strategy = json.loads(path.read_text())
    validate_strategy(strategy)  # must not raise


@pytest.mark.parametrize("path", INVALID_FIXTURES, ids=lambda p: p.name)
def test_invalid_fixtures_are_rejected(path):
    strategy = json.loads(path.read_text())
    with pytest.raises(StrategyValidationError):
        validate_strategy(strategy)


def test_fixtures_cover_all_three_archetypes():
    archetypes = {json.loads(path.read_text())["archetype"] for path in VALID_FIXTURES}
    assert archetypes == {
        "asymmetric_momentum",
        "funding_rate_carry",
        "range_swing_rotation",
    }


def test_forbidden_language_is_rejected():
    strategy = json.loads((FIXTURES_DIR / "momentum_breakout_crypto.json").read_text())
    strategy["description"] = "This is a risk-free way to guarantee wealth generation."
    with pytest.raises(StrategyValidationError) as exc_info:
        validate_strategy(strategy)
    assert "forbidden profit/return language" in str(exc_info.value)


def test_live_execution_mode_is_schema_invalid():
    strategy = json.loads(
        (FIXTURES_DIR / "invalid" / "live_execution_mode.json").read_text()
    )
    with pytest.raises(StrategyValidationError) as exc_info:
        validate_strategy(strategy)
    assert "execution" in str(exc_info.value)


def test_missing_per_asset_params_is_semantic_error():
    strategy = json.loads(
        (FIXTURES_DIR / "invalid" / "missing_per_asset_params.json").read_text()
    )
    with pytest.raises(StrategyValidationError) as exc_info:
        validate_strategy(strategy)
    assert "NVDA" in str(exc_info.value)
