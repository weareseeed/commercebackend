# Change: Define and instrument the Launch 1 success metric

## Why
There is no agreed measure of whether outside builders succeed with the
sandbox, so connector and MCP breadth cannot be judged.

## What Changes
- Maintainers choose one primary metric (candidates in
  `docs/launch/launch-readiness-plan.md`) and set a target and review date.
- Extend the read-only operator metrics with the counters the chosen metric
  needs (for example distinct agents registered, paid test checkouts).
- No tracking of personal data; counters only.

## Impact
- Affected specs: `operator-visibility`.
- The metric and target are a maintainer decision, not set by this change.
