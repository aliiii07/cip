# 0001. Record architecture decisions

Status: accepted
Date: 2026-07-17

## Context

CIP's architecture rules (the four-agent loop, hard constraints on live
execution, backtest integrity requirements) are enforced today as prose in
`CLAUDE.md`. That's the right place for AI-agent constraints, but it isn't
the right place for the reasoning behind past decisions, or for decisions
that are human-facing rather than agent-facing. Without a record, "why did
we choose X over Y" gets re-litigated or lost as the team changes.

## Decision

Use Architecture Decision Records (ADRs) under `docs/decisions/`, one file
per significant decision, following the format in
[decisions/README.md](README.md).

## Consequences

- Future contributors can see why a decision was made, not just what it is.
- `CLAUDE.md` stays focused on constraints the AI agent must follow; `docs/`
  stays the source of truth for humans, per the split described in the
  project's [README](../../README.md).
