# Contributing

Two-dev shared repo. This doc is the canonical human-facing version of the
workflow rules; [CLAUDE.md](CLAUDE.md) restates the same rules as
constraints for AI agents working in this repo — if the two ever disagree,
fix the drift rather than picking one.

## Branching

- Branch as `feat/name/topic` (e.g. `feat/ali/risk-cop-monte-carlo`).
- Never commit directly to `main`.
- `git pull --rebase origin main` before starting work, to keep history
  linear.
- Never `git push --force` on a shared branch.
- Migrations are append-only — don't edit a migration once it's merged.

## Before opening a PR

- Lint and tests pass locally.
- Read the [pull request template](.github/pull_request_template.md)'s
  scope checklist — in particular, nothing that adds live brokerage
  execution, raw codegen, or profit-guarantee language (full list in
  [CLAUDE.md](CLAUDE.md#hard-rules---do-not-violate)).
- If you touched the strategy JSON schema, update validators on both the
  producing and consuming agent in the same PR.
- If you touched product scope or architecture, update the relevant file in
  [docs/](docs/) — don't let the docs drift from the code.

## Running locally

The Python scaffold (schema, validators, stub LangGraph pipeline) is real
and testable; the API and frontend are not yet built (see
[README.md](README.md#status)).

1. Copy `.env.example` to `.env` and fill in real API keys (data providers,
   per-agent LLM credentials). Never commit `.env`. The stub pipeline runs
   keyless — keys only matter once real providers land.
2. Backend: `python -m venv .venv && source .venv/bin/activate`, then
   `pip install -e ".[dev]"`.
3. Tests and lint: `pytest` and `ruff check .` — both run in CI on every
   PR via [.github/workflows/ci.yml](.github/workflows/ci.yml).
4. Frontend (Next.js): not yet in the repo. Add `npm install` /
   `npm run dev` instructions here in the same PR that adds
   `frontend/package.json` — don't leave this section aspirational once
   the files exist.

## Reporting issues

Use the [bug report](.github/ISSUE_TEMPLATE/bug_report.md) or
[feature request](.github/ISSUE_TEMPLATE/feature_request.md) templates.
