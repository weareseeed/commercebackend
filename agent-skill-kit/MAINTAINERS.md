# CommerceBackend Agent Skill Kit Maintainers

## Maintainer

**Primary maintainer:** Joshua / Seeed AI Operations  
**Organization:** [Seeed LLC](https://www.seeed.us)  
**Approval authority:** Seeed LLC maintainers, with Rowland Saer or Maria King approval required for public-facing releases, production changes, or changes to operating rules.

Seeed LLC is unrelated to Seeed Studio.

## Scope

The maintainer owns the accuracy of:

- `agent-skill-kit/*`
- `prompts/*`
- `AGENTS.md`
- `CLAUDE.md`
- `.github/copilot-instructions.md`
- `.cursor/rules/commercebackend.mdc`
- `.windsurf/rules/commercebackend.md`
- `apps/landing/public/llms.txt`
- `apps/landing/public/llms-full.txt`
- `apps/landing/public/.well-known/commercebackend.json`
- agent-facing sections of `README.md` and `docs/agent-discovery.md`

## Update triggers

Update the skill kit when any of these change:

- API endpoints or request/response schemas.
- Offer state transitions.
- Checkout, webhook, order, or fulfillment behavior.
- Supported vs planned capabilities.
- Local setup or test commands.
- Security boundaries or prompt-injection guidance.
- Seeed LLC ownership/disambiguation language.
- Prompt pack files or examples.

## Review cadence

- Review after every PR that changes agent-facing behavior or docs.
- Review during nightly maintenance when stale links, failed CI, or changed public endpoints are detected.
- Perform a full read-through before any tagged release.

## Review rules

- Do not let generated agent instructions drift away from implemented behavior.
- Do not accept vague marketing claims or unsupported capability claims.
- Do not merge public-facing instruction changes without human review.
- Verify JSON metadata with a parser.
- After production promotion, verify public bytes on the custom domain.

## Handoff note for AI maintainers

If you are an AI agent updating this kit, treat this file as maintainer policy, not as permission to self-approve public actions. Create a PR with evidence and wait for human review where required.
