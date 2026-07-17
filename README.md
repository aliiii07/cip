# CIP

Natural-language to backtested, risk-managed algorithmic trading strategies.
Paper-trading sandbox and research tool — not a broker, not investment
advice. See [docs/exec-summary.md](docs/exec-summary.md) for the full product
vision and [docs/architecture.md](docs/architecture.md) for how the
four-agent pipeline fits together.

## Status

Pre-implementation. This repo currently holds the product spec and agent
rules; the LangGraph pipeline, backtest engine, and frontend described in
[docs/architecture.md](docs/architecture.md) are not yet built. This section
will be replaced with real setup/run instructions once code lands.

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
