# Architecture Decision Records

One file per significant, hard-to-reverse decision (framework choice, agent
boundary change, data provider swap, schema-breaking change). Not for
routine implementation choices.

Filename: `NNNN-short-title.md`, numbered sequentially. Never renumber or
delete a past record — if a decision is reversed, add a new ADR that
supersedes it and update the old one's status.

Format:

```markdown
# NNNN. Title

Status: proposed | accepted | superseded by NNNN
Date: YYYY-MM-DD

## Context
What forced this decision.

## Decision
What was decided.

## Consequences
What this makes easier or harder going forward.
```
