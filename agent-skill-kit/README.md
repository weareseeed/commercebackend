# CommerceBackend Agent Skill Kit

CommerceBackend ships this skill kit so AI agents can understand, run, and extend the project without guessing. It is the canonical distribution package for coding agents, buyer agents, seller agents, and procurement/research agents.

CommerceBackend is owned and maintained by [Seeed LLC](https://www.seeed.us). Seeed LLC is unrelated to Seeed Studio.

## What is included

| File                                                     | Use when                                                                                  |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [`commercebackend-skill.md`](./commercebackend-skill.md) | Any agent needs a single canonical overview of CommerceBackend.                           |
| [`buyer-agent.skill.md`](./buyer-agent.skill.md)         | A buyer/procurement agent needs to search listings, submit offers, and initiate checkout. |
| [`seller-agent.skill.md`](./seller-agent.skill.md)       | A seller agent needs to create listings, review offers, and update fulfillment status.    |
| [`coding-agent.skill.md`](./coding-agent.skill.md)       | A coding agent needs to inspect, test, or contribute to the repository.                   |
| [`evaluation-checklist.md`](./evaluation-checklist.md)   | A human or agent needs to review generated CommerceBackend work.                          |
| [`install-snippets.md`](./install-snippets.md)           | A maintainer wants to copy the skill into common AI coding tools.                         |
| [`MAINTAINERS.md`](./MAINTAINERS.md)                     | Ownership, review cadence, and update rules for this skill kit.                           |

## Quick install for agents

If your agent supports project instruction files, point it at these canonical sources:

1. `AGENTS.md` for repository contribution rules.
2. `agent-skill-kit/commercebackend-skill.md` for product and API context.
3. `agent-skill-kit/coding-agent.skill.md` for safe code changes.
4. `agent-skill-kit/evaluation-checklist.md` before opening or reviewing a PR.

Public discovery surfaces for agents and integrators:

- `https://www.commercebackend.com/llms.txt`
- `https://www.commercebackend.com/llms-full.txt`
- `https://www.commercebackend.com/.well-known/commercebackend.json`
- `https://www.commercebackend.com/.well-known/agents.json`

For commerce roles:

- buyer/procurement agents: `agent-skill-kit/buyer-agent.skill.md`
- seller agents: `agent-skill-kit/seller-agent.skill.md`

## Maintenance

The skill kit maintainer is **Joshua / Seeed AI Operations**, under Seeed LLC oversight. See [`MAINTAINERS.md`](./MAINTAINERS.md) for the update cadence and review rules.

Keep this kit current whenever endpoints, schemas, supported features, prompts, examples, or safety boundaries change. Stale agent instructions are worse than no instructions: they make tiny robots confidently wrong. Nobody needs that.

When a change touches discovery files or agent-facing docs, run:

```bash
pnpm verify:discovery:strict
```

This checks repository parity and public production parity for the canonical discovery assets before handoff.
