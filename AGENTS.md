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

## Shared handoff (Cursor + Claude Code)

Session chats do not sync. Before coding, read `docs/handoff.md`. Before switching tools, update that file (branch, what finished, what is next). Local SQLite is `data/cip.db`.

## Team workflow

- Two devs, shared repo. Branch as feat/name/topic. Never commit to main.
- Never git push --force on a shared branch.
- git pull --rebase origin main before starting work.
- Migrations are append-only.
- Lint and tests pass before commit.


## Design rules

These govern any UI work in this repo. They exist because the default output
of an AI coding tool has a recognisable look, and that look reads as
assembled rather than designed. Nothing here overrides the product rules
above: the honesty constraints, the paper-only constraint, and the banned
language rules win every time.

### The generic look, banned

- Never default to Inter as the display face. Pick a face with a point of
  view and pair it with a plainer body face.
- No purple or blue-violet gradient as a hero background.
- No row of three identical rounded cards with soft shadows as the answer to
  a section. If three things must be listed, find a form that says something
  about them.
- No stock glassmorphism, no neon glow on dark, no floating blurred orbs.
- Do not scatter effects. Motion that appears in several unrelated places for
  no reason is the clearest tell of a generated page.

### Direction

- Commit to one aesthetic direction per project and hold it. Half a direction
  reads as indecision.
- The hero is a thesis. Open with the most characteristic thing the product
  does, not a large number over a gradient.
- One dominant accent colour. Everything else is neutral. In this repo the
  accent is the CIP signal red on the deck, titanium on the landing surface.
  Never introduce a second accent to make something stand out; use size,
  weight, or space instead.
- Generous negative space. Crowding is the cheapest way to look amateur.
- Short body copy. If a paragraph runs past four lines, it is doing a job a
  visual should be doing.
- Build with real content. Never lorem ipsum, never placeholder names,
  never invented numbers.

### Components

- shadcn/ui is the component foundation where a component library is wanted.
- Pull current props from the shadcn MCP rather than recalling an API.
  Guessing a component's props produces code that compiles and misbehaves.
- Style it distinctively afterwards. Shipping shadcn defaults unchanged is
  how every AI-built site ends up looking like every other one.

### Motion

- Motion needs a reason. It should explain a relationship, show a state
  change, or direct attention. If it does none of those, cut it.
- Use `components/motion`. One easing curve, `cubic-bezier(0.22, 1, 0.36, 1)`,
  across the whole page, so scrolling and element transitions share a
  character.
- Animate `opacity` and `transform` only. Animating layout properties such as
  width, height, top, or font-size triggers layout on every frame.
- 60fps or cut it. No jank, no layout shift, nothing that moves the page while
  a person is reading it.
- Amplitude has a floor. A 3.5% scale pulse is below the threshold where the
  eye registers movement, so it reads as a frozen image while still costing a
  frame budget. Either make it visible or remove it.
- Every loop and transition respects `prefers-reduced-motion`, and the reduced
  state is the settled end state, not a faster animation.

### Responsive and accessible

- Mobile-first. Verify at 390px and at 1440px before calling anything done.
- Visible keyboard focus states. Never remove the outline without replacing it.
- Real alt text on meaningful images, empty alt on decorative ones.
- Measure contrast against the actual background rather than judging by eye.
  Body text clears 4.5:1, large text clears 3:1.

### Copy

- Do not use dashes in copy. No em dashes, no en dashes, in headings, body,
  labels, or microcopy. Use commas, colons, or full stops.
- Avoid the generated-prose tells: "unlock", "seamless", "elevate",
  "empower", "in today's fast-paced world", and rhetorical questions as
  headings.
- Sentence case for headings unless the design calls for something else.

### Before calling it done

Ask whether a designer would wince at this. Specifically: is the type face
doing any work, is there one accent or several, is anything animated for
decoration alone, is any number or name invented, does it hold up at 390px.
If the answer is bad on any of them, fix it before showing it.
