# CIP

Natural-language to backtested, risk-managed algorithmic trading strategies.
Paper-trading sandbox and research tool — not a broker, not investment
advice. See [docs/exec-summary.md](docs/exec-summary.md) for the full product
vision and [docs/architecture.md](docs/architecture.md) for how the
four-agent pipeline fits together.

## Status

Scaffold stage. The strategy JSON schema ([schemas/strategy.json](schemas/strategy.json)),
its validator layer ([src/cip/validation.py](src/cip/validation.py)), and a
stub LangGraph four-agent pipeline ([src/cip/agents/](src/cip/agents/)) run
end to end under test. The agents are stubs — fixture-based strategy
selection and deterministic pseudo-metrics, no LLM calls, no real data
providers, no real backtests. The web platform (API, frontend, screener,
monitor) is being built next; see
[docs/decisions/0002-web-architecture.md](docs/decisions/0002-web-architecture.md).

To run what exists:

```sh
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
pytest
```

## Docs

- [docs/exec-summary.md](docs/exec-summary.md) — product vision, users, MVP
  scope
- [docs/architecture.md](docs/architecture.md) — the four-agent loop, data
  flow, stack
- [docs/decisions/](docs/decisions/) — ADRs, one per significant
  architecture decision
- [CLAUDE.md](CLAUDE.md) — constraints and rules for AI agents working in
  this repo (hard rules, backtest integrity requirements, scope boundaries)

## Contribute

Branch rules and how to run locally: [CONTRIBUTING.md](CONTRIBUTING.md).

If you're an AI agent working in this repo, read [CLAUDE.md](CLAUDE.md)
first — it encodes hard constraints (no live execution, no raw codegen,
backtest integrity rules) that override anything implied here.
