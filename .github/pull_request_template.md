## What

<!-- What does this PR change, in one or two sentences. -->

## Why

<!-- The problem or decision that motivated this. Link an issue or ADR if one exists. -->

## Scope check

- [ ] This does not add live brokerage/exchange execution (see `CLAUDE.md` hard rules)
- [ ] This does not have the Architect emit raw code instead of strategy JSON
- [ ] Risk gates, if touched, stay hardcoded in config — not in prompts
- [ ] No profit/return-guarantee language added to UI copy, docs, or comments
- [ ] If this touches the strategy JSON schema, validators on both producing and consuming agent are updated in this PR

## How to verify

<!-- Commands to run, or steps to reproduce, that show this works. -->

## Checklist

- [ ] Lint and tests pass locally
- [ ] Docs updated (`docs/`) if this changes product behavior or architecture
- [ ] No secrets, API keys, or `.env` values committed
