# Executive Summary

## Vision

CIP (Capital Investment Prospects) turns a natural-language trading idea
into a backtested, risk-managed strategy — without requiring the user to write code, wire up a broker, or
understand market microstructure themselves. Input is a plain-English
hypothesis ("buy the breakout when volume confirms"); output is a typed
strategy spec, a distribution of backtest results across realistic costs and
parameter ranges, and a risk report.

CIP is a research and simulation tool, not a way to trade automatically or a
promise of returns. See [CLAUDE.md](../CLAUDE.md) for the rules that enforce
that boundary in the product itself.

## Users

- **Retail investors** who have a trading idea but not the quant background
  to test it rigorously against realistic costs and slippage.
- **Mid-tier prop firms** prototyping strategy hypotheses before committing
  engineering time to a full build.

Both groups share the same failure mode CIP is built to prevent: a strategy
that looks great on a naive backtest and loses money the moment it meets a
real order book.

## What CIP is not

- Not a broker. No live brokerage or exchange execution is implemented.
- Not investment advice, and never described using return/profit language.
- Not an HFT or microstructure tool — target holding periods are
  hourly-to-daily, not sub-second.

## MVP scope (16 weeks)

**In scope**
- Natural-language to strategy JSON generation
- Simulated portfolios running against live market data feeds
- 3-4 data providers (equities/forex, crypto)
- Deterministic, hardcoded risk gates

**Out of scope (post-seed)**
- Raw code compilation/execution
- Brokerage integration
- 18+ native data/broker integrations
- Autonomous capital allocation
- HFT / order-book microstructure strategies

Any request that falls into "out of scope" should be flagged as a scope
conflict, not quietly implemented — see the Hard Rules in
[CLAUDE.md](../CLAUDE.md).

## How it works

A strategy idea passes through a fixed four-agent loop — Market Scout,
Strategy Architect, Backtest Engine, Risk Cop — with the Risk Cop able to
kick a strategy back to the Architect on a risk-gate breach. Full detail,
including the data flow, is in [architecture.md](architecture.md).
