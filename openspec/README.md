# OpenSpec for CommerceBackend

This directory follows the [OpenSpec](https://github.com/Fission-AI/OpenSpec)
spec-driven layout:

- `project.md`: project context, conventions, and boundaries.
- `specs/<capability>/spec.md`: what the system **does today**. Each
  requirement is something verified in code or tests. Planned work does not
  belong here.
- `changes/<change-id>/`: proposed work. Each change has `proposal.md`,
  `tasks.md`, optional `design.md`, and delta specs under
  `specs/<capability>/spec.md` using `## ADDED|MODIFIED|REMOVED Requirements`.

When a change ships, fold its deltas into `specs/` and archive the change.

Rules that override anything here: `AGENTS.md` and `CLAUDE.md`. Changes tagged
`[HUMAN-LED]` need explicit Seeed approval and a design review before code, and
are not built by the autonomous weekly routine. Seeed LLC is unrelated to Seeed
Studio.

Human-readable plan: [`docs/launch/launch-readiness-plan.md`](../docs/launch/launch-readiness-plan.md).
