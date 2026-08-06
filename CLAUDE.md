# CIP — Capital Investment Prospects

CIP (Capital Investment Prospects): natural-language to backtested,
risk-managed algorithmic trading strategies.
Multi-agent LLM pipeline. Retail investors and mid-tier prop firms; stocks,
crypto, forex. Paper-trading sandbox only.

Full product context: docs/exec-summary.md

## Architecture

LangGraph orchestrates a four-agent loop. Every strategy passes all four in
order; none may be skipped.

1. Market Scout - macro data, order-book flow, news/social sentiment.
2. Strategy Architect - maps NL concepts to typed params.
3. Backtest Engine - expectancy, Sharpe, Sortino, max drawdown, profit factor.
4. Risk Cop - 5,000-permutation Monte Carlo over price/spread/slippage.
   On breach of platform limits, raises an exception and returns a correction
   report to the Architect. It does not warn and pass.

## Hard rules - do not violate

- YOU MUST NOT wire up live brokerage or exchange execution endpoints. Paper
  only, on real-time data. Live execution has no implementation compiled in.
- The Architect emits strictly-typed JSON only. Never raw Python. Raw codegen
  is a code-injection vector and is permanently out of scope.
- Risk gates are deterministic and hardcoded in config, not prompts. No agent
  may override them.
- No AI control of real funds. Capital actions require explicit user approval.
- Never use profit/return language in UI copy, docs, marketing, or comments.
  No "guaranteed," "wealth generation," "you will earn," "passive income,"
  "risk-free," "market-neutral" stated without qualification. The product is a
  no-code quantitative sandbox and analytical research suite. Every results
  view carries: "For educational and simulation purposes only. Past
  performance does not guarantee future results."

## Backtest integrity - the death traps

These are how retail algo traders lose money. The engine must make them
structurally impossible, not merely discouraged.

- NEVER backtest on Heikin-Ashi candles or synthetic/smoothed price series.
  HA averages prices and shows entry fills that never existed. A +200%
  backtest becomes a -30% live result. Reject HA at the data layer.
- NEVER assume mid-spread fills. Market orders sweep the book. Model:
  order-book depth consumption, maker/taker fees (0.12% round trip default),
  and realistic slippage. A strategy that survives only at zero cost is a
  losing strategy.
- NEVER reuse a parameter set across assets. BTC params do not transfer to SOL
  or high-beta alts. Different microstructure, liquidity, participant mix.
  Optimize per asset; block cross-asset defaults.
- NEVER show a metric derived from in-sample data alone. 70/30 train/validate
  split, chronological, no overlap. All history point-in-time adjusted. No
  look-ahead, no survivorship-cleaned universes.

## Validation doctrine

- Rank by EXPECTANCY, not win rate. A 90% win-rate strategy is usually a
  ticking time bomb: wins pennies, loses everything on one outlier. Surface
  expectancy as the headline metric; win rate is secondary and never shown
  alone.
- A 35-45% win rate with asymmetric payoff is a valid, healthy result. The UI
  must not treat low win rate as failure.
- Parameter robustness is mandatory. A strategy must stay profitable when
  every parameter shifts +/-10-20%. Test the cluster, not the point. If the
  edge exists only at RSI-14 exactly, it is curve-fit noise - fail it.
- Report the full distribution, not the best run.

## Strategy archetypes

Templates the Architect may compose. Each is a hypothesis to be tested, never
a default and never a recommendation.

- Asymmetric momentum: MA/Donchian breakouts, tight stops. Low win rate, long
  right tail. Expectancy-positive or reject.
- Funding-rate carry: spot long + perp short, capturing staking yield plus
  funding. NOT risk-free. Must model basis risk, short-leg liquidation
  distance, staking unbonding lockups, and negative-funding regimes. Never
  described to users as market-neutral without those qualifiers.
- Range/swing rotation: bounded entries on a small watchlist, multi-day holds.

Out of scope: order-book imbalance scalping and any microstructure strategy.
Requires sub-second latency. Incompatible with this pipeline by design.

## Scope - MVP (16 weeks)

In: JSON strategy generation, simulated portfolios on live feeds, 3-4 data
providers, deterministic risk gates.

Out (post-seed): raw code compilation, brokerage integration, 18+ native
integrations, autonomous capital allocation, HFT/microstructure.

If a request implies anything in "out", flag the scope conflict before coding.

## Stack

- Orchestration: LangGraph
- Backtesting: vectorbt or LEAN. 5,000-iteration Monte Carlo under 10s. This
  is a perf regression test, not an aspiration - it must stay vectorized.
- Data: Polygon.io (equities/forex), Binance or CoinGecko Pro (crypto)
- Frontend: Next.js + Tailwind
- LLM endpoints: configurable per agent. No model name hardcoded outside config.

## Non-goals

HFT. 15-30s LLM latency is a design property. Target swing trading,
medium-term rebalancing, daily/hourly trends. Do not propose architecture
changes justified by execution speed.

## Conventions

- Strategy JSON schema is the contract between agents. Schema changes update
  validators on both sides in the same PR.
- Backtest results never cached across a data-provider change.
- Fee and slippage models live in config, versioned, never in prompts.
- Agent outputs surface to the UI as tagged events.

## Team workflow

- Two devs, shared repo. Branch as feat/name/topic. Never commit to main.
- Never git push --force on a shared branch.
- git pull --rebase origin main before starting work.
- Migrations are append-only.
- Lint and tests pass before commit.
