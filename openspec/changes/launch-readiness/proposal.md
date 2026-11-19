# Change: Launch 1 readiness (public OSS + test-mode sandbox)

## Why
The sandbox is live but the project has no agreed definition of "launch", no
success metric, and several gaps between shipped behavior and what an outside
agent-framework builder needs (unpublished packages, no contributor docs, no
evaluation fixtures, unverified production parity). See
`docs/launch/launch-readiness-plan.md`.

## What Changes
- Track Launch 1 readiness as the umbrella over the changes below.
- Add contributor/release docs and a v0.3 release-notes draft.
- Add agent evaluation fixtures.
- Verify production discovery parity and sandbox migration state before any
  announcement.

## Out of scope
Real-money processing, refunds, disputes, tax, payouts, the Cloud.

## Impact
- Affected specs: none directly (docs/process); depends on
  `approval-hardening`, `inventory-conflict-operator-refund`,
  `publish-agent-packages`, `sandbox-success-metric`.
- Approval: public announcement, tags, and releases need Seeed approval.
