# 0002. Web platform architecture

Status: proposed
Date: 2026-07-21

## Context

The repo has the strategy JSON schema, its validator layer, and a stub
LangGraph four-agent pipeline that runs end to end under test. The next
phase is the full web product: a frontend, an API layer around the
pipeline, a market-wide screener, a bar-close monitor loop, and the
technical-drawing visual system — all inside the hard rules in
[CLAUDE.md](../../CLAUDE.md) (paper only, typed JSON only, hardcoded risk
gates, banned profit language, the four backtest-integrity death traps).

These are framework-level, hard-to-reverse choices, so they get an ADR
before implementation.

## Decision

- **Backend: FastAPI in `api/`**, wrapping `src/cip` directly. Endpoints:
  `POST /strategies` (NL → pipeline run), `GET /strategies/{id}`,
  `POST /strategies/{id}/variants`, `GET /runs/{id}`,
  `POST /decisions/{id}/(approve|watchlist|reject)`, `GET /screener`,
  `GET /assets/{symbol}/brief`, `GET /alerts`, `GET /events` (SSE).
- **Realtime: Server-Sent Events**, not WebSockets, for MVP. The event
  stream is one-way (agent status tags, monitor stages, alerts), SSE is
  simpler to operate, and pipeline runs execute as FastAPI background
  tasks. Move to Redis pub/sub + a worker process when live streaming
  lands; ingestion never does heavy work in the socket loop.
- **Backtesting: vectorbt** replaces the stub engine, compiling strategy
  JSON → vectorized signals and enforcing the schema's fee model and
  order-book-depth slippage model. The 5,000-iteration Monte Carlo is
  vectorized NumPy with a perf test asserting < 10s, treated as a
  regression gate per CLAUDE.md.
- **Persistence: SQLite via SQLAlchemy** for MVP (`data/cip.db`,
  gitignored), Postgres-ready; Alembic migrations, append-only. Tables:
  strategies, pipeline_runs, backtest_runs, variants (base_id,
  params_delta, stage, reject_reason), decisions, watchlists,
  watchlist_symbols, signals, alerts, scan_snapshots, action_log.
- **Data providers behind a `DataProvider` protocol**: Binance first
  (24h tickers + klines, keyless), Polygon second (US equities/FX, env
  key), CoinGecko Pro optional. Backtest results are never cached across
  a data-provider change (repo rule).
- **Frontend: Next.js (App Router, TypeScript) + Tailwind in
  `frontend/`.** Candlestick charts: TradingView Lightweight Charts
  (Apache-2.0), installed from npm rather than a CDN script tag — same
  library and license, but versioned by the lockfile and compatible with
  SSR/bundling; pinned to v4 for the stable series API.
  Distribution/funnel charts: Recharts (declarative, React-native fit,
  small API surface) when they land in P5/P6. TanStack Query + server
  components; an SSE client hook. A demo-seed mode runs the whole site
  keyless off the fixture strategies and a deterministic seeded fixture
  candle provider, with visible `Stub data` notices on anything not
  real.
- **Design system as tokens, not vibes**: two user-switchable themes,
  `blueprint` (cream technical-drawing, default) and `terminal` (dark
  phosphor green), encoded as CSS custom properties with shared
  apparatus components (MetaHeader, registration marks, stamp, ruler
  footer). WCAG AA; `prefers-reduced-motion` renders animated pieces as
  static frames.
- **Auth: single-user token** for MVP; NextAuth deferred post-seed.
- **Compliance is structural**: the layout enforces the schema-pinned
  disclaimer on all results routes; a `SIMULATED`/`PAPER` badge component
  marks every simulation-derived number; CI greps UI copy for the banned
  terms in CLAUDE.md and fails the build on a hit.

## Consequences

- The repo becomes a monorepo: `api/` and `frontend/` beside `src/cip`;
  the existing Python and Node CI jobs pick both up as they land.
- SQLite keeps MVP setup zero-config; the SQLAlchemy + Alembic layer is
  the escape hatch to Postgres without schema rework.
- SSE-over-background-tasks is deliberately boring; the known cost is a
  later migration to Redis pub/sub + worker when live streaming arrives.
- The UI renders `schemas/strategy.json` and never invents fields, so
  schema changes remain the single contract — validators and UI update
  together in the same PR.
- Risk gates (`src/cip/agents/risk_cop.py: RISK_GATES`) are displayed by
  the UI but not editable through any endpoint; a gate-immutability test
  asserts any API attempt to modify them returns 4xx.

