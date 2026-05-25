# CommerceBackend Directory Submission Copy

Use this file for low-risk directory submissions, `llms.txt` registries, agent-tool catalogs, and external PRs. Keep the wording factual and bounded to current v0.2 behavior.

## Canonical fields

| Field            | Value                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------- |
| Project name     | CommerceBackend                                                                          |
| Owner            | Seeed LLC                                                                                |
| Website          | https://www.commercebackend.com                                                          |
| Repository       | https://github.com/weareseeed/commercebackend                                            |
| License          | Apache-2.0                                                                               |
| Category         | Agent-first commerce backend / marketplace API                                           |
| Primary audience | AI agent builders, marketplace API developers, coding agents, agent-commerce researchers |
| Contact          | Joshua / Seeed AI Operations via Seeed LLC                                               |
| Disambiguation   | Seeed LLC / Seeed.us is unrelated to Seeed Studio.                                       |

## Short description

Open-source agent-first commerce backend for AI agents: listings, offers, Stripe Checkout intents, fulfillment status, llms.txt discovery, and reusable agent skills.

## Medium description

CommerceBackend is an Apache-2.0 commerce backend from Seeed LLC built for AI agents instead of human storefronts. It provides structured APIs for agent identity, listings, search, offers, Stripe Checkout intents, webhook-confirmed orders, and fulfillment status, plus `llms.txt`, `llms-full.txt`, `AGENTS.md`, prompt packs, and an Agent Skill Kit so coding, buyer, and seller agents can understand and operate the project.

## Long description

CommerceBackend is open-source commerce infrastructure for AI agents. It is designed for agents that need API-native marketplace primitives rather than human-first storefront screens. The current v0.2 surface includes agent registration, listing CRUD, listing search, offer/counteroffer flows, Stripe Checkout intent creation, webhook-confirmed orders, and fulfillment status updates.

The project also includes agent-native discovery and onboarding assets: live `llms.txt` and `llms-full.txt` files, a `.well-known/commercebackend.json` metadata file, a repository `AGENTS.md`, reusable buyer/seller/coding-agent skills, prompt packs, and a runnable buyer-agent flow example. It is owned and maintained by Seeed LLC and licensed under Apache-2.0.

## Proof links

- Website: https://www.commercebackend.com
- GitHub: https://github.com/weareseeed/commercebackend
- `llms.txt`: https://www.commercebackend.com/llms.txt
- Full LLM context: https://www.commercebackend.com/llms-full.txt
- Well-known metadata: https://www.commercebackend.com/.well-known/commercebackend.json
- Agent guide: https://github.com/weareseeed/commercebackend/blob/master/AGENTS.md
- Agent Skill Kit: https://github.com/weareseeed/commercebackend/tree/master/agent-skill-kit
- Buyer-agent example: https://github.com/weareseeed/commercebackend/tree/master/examples/agent-buyer-flow
- Prompt pack: https://github.com/weareseeed/commercebackend/tree/master/prompts

## Tags / keywords

```text
agentic-commerce, ai-agents, ai-commerce, agent-commerce, marketplace-api, commerce-api, headless-commerce, stripe, checkout, llms-txt, agent-skills, typescript, fastify, prisma, open-source
```

## GitHub list PR snippet

```markdown
- [CommerceBackend](https://github.com/weareseeed/commercebackend) — Apache-2.0 agent-first commerce backend for AI agents, with APIs for listings, offers, Stripe Checkout intents, fulfillment status, `llms.txt`, prompt packs, and an Agent Skill Kit.
```

## llms.txt directory snippet

```markdown
- **CommerceBackend** — open-source agent-first commerce backend for AI agents.  
  `llms.txt`: https://www.commercebackend.com/llms.txt  
  Full context: https://www.commercebackend.com/llms-full.txt  
  Repo: https://github.com/weareseeed/commercebackend
```

## Social-safe copy for humans

```text
CommerceBackend is open-source commerce infrastructure for AI agents: listings, offers, Stripe Checkout intents, fulfillment status, live llms.txt files, and a reusable Agent Skill Kit.

Repo: https://github.com/weareseeed/commercebackend
Docs for agents: https://www.commercebackend.com/llms-full.txt
```

## Current v0.2 limits to disclose when relevant

CommerceBackend v0.2 is not a complete production marketplace platform. It does not yet include Stripe Connect seller payouts, refunds, disputes, platform fees, tax calculation, shipping labels, merchant connectors, or a human storefront UI.
