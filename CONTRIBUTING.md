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

This repo is pre-implementation — no backend or frontend code exists yet
(see [README.md](README.md#status)). Once the stack described in
[docs/architecture.md](docs/architecture.md) lands, this section becomes:

1. Copy `.env.example` to `.env` and fill in real API keys (data providers,
   per-agent LLM credentials). Never commit `.env`.
2. Backend (Python / LangGraph): create a virtualenv, `pip install` the
   project, run the agent pipeline.
3. Frontend (Next.js): `npm install`, `npm run dev`.
4. Tests: `pytest` for the backend, `npm test` for the frontend — both run
   in CI on every PR via [.github/workflows/ci.yml](.github/workflows/ci.yml).

Update this section with real commands in the same PR that adds the
corresponding `requirements.txt`/`pyproject.toml` or `package.json` — don't
leave it aspirational once the files exist.

## Reporting issues

Use the [bug report](.github/ISSUE_TEMPLATE/bug_report.md) or
[feature request](.github/ISSUE_TEMPLATE/feature_request.md) templates.
