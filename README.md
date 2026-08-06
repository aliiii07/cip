# CIP — Capital Investment Prospects

CIP (Capital Investment Prospects) turns natural language into backtested,
risk-managed algorithmic trading strategies.
Paper-trading sandbox and research tool — not a broker, not investment
advice. See [docs/exec-summary.md](docs/exec-summary.md) for the full product
vision and [docs/architecture.md](docs/architecture.md) for how the
four-agent pipeline fits together.

## Status

The strategy JSON schema ([schemas/strategy.json](schemas/strategy.json)),
its validator layer ([src/cip/validation.py](src/cip/validation.py)), and a
stub LangGraph four-agent pipeline ([src/cip/agents/](src/cip/agents/)) run
end to end under test, wrapped by a FastAPI layer ([api/](api/)) with SQLite
persistence and SSE, and a Next.js frontend ([frontend/](frontend/)) with
symbol search and per-asset technical analysis.

Real: the schema and validators, the Risk Cop's hardcoded gates and
correction loop, and live crypto market data from Binance. Stub: the four
agents' reasoning (fixture-based selection, deterministic pseudo-metrics, no
LLM calls), the backtest numbers, and equities/forex candles until
`POLYGON_API_KEY` is set — anything stubbed is badged as such in the UI.
Screener, variant lab, decision memos, and the monitor are not built yet;
see [docs/decisions/0002-web-architecture.md](docs/decisions/0002-web-architecture.md).

To run what exists:

```sh
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
pytest                              # 33 tests, no keys or network needed
uvicorn api.main:app --port 8000    # API
npm install --prefix frontend && npm run dev --prefix frontend  # UI on :3000
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

