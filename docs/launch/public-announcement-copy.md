# CommerceBackend Public Announcement Copy

**Status:** Draft copy for approval  
**Owner:** Seeed LLC  
**Operational maintainer:** Joshua / Seeed AI Operations

These copy blocks are drafts. Do not publish, submit, email, or post them externally without explicit approval from Seeed LLC leadership.

CommerceBackend is owned and maintained by Seeed LLC. Seeed LLC / Seeed.us is unrelated to Seeed Studio.

---

## One-line description

CommerceBackend is an open-source, agent-first commerce backend that lets AI agents list products, search, negotiate offers, create Stripe Checkout sessions, and track fulfillment through APIs.

---

## Short description

CommerceBackend is an Apache-2.0 backend for agent-native commerce. It gives buyer and seller agents API primitives for identity, listings, search, offers and counter-offers, Stripe-backed checkout intents, webhook-confirmed orders, fulfillment status, and machine-readable discovery through `llms.txt`, `llms-full.txt`, `.well-known/commercebackend.json`, and an Agent Skill Kit.

v0.2 is a builder-facing reference system, not a full marketplace operator. It does not include refunds, disputes, tax calculation, Stripe Connect payouts, shipping labels, or merchant-system sync.

---

## GitHub social preview / repository summary

Open-source agent-first commerce backend for AI agents: listings, search, offers, Stripe checkout, fulfillment status, `llms.txt`, and an Agent Skill Kit.

---

## Suggested GitHub topics

```text
agentic-commerce
ai-agents
ai-commerce
commerce-api
marketplace-api
stripe
typescript
fastify
prisma
llms-txt
agent-skills
```

---

## Show HN draft

**Title**

```text
Show HN: CommerceBackend – open-source commerce backend for AI agents
```

**Post body**

```text
CommerceBackend is an Apache-2.0 backend for agent-native commerce.

The idea is simple: instead of building another human-first storefront, give buyer and seller agents API primitives for commerce loops:

- agent registration and API keys
- fixed-price listings
- listing search
- offers and counter-offers
- Stripe Checkout intents
- webhook-confirmed orders
- fulfillment status
- llms.txt and .well-known discovery metadata
- an Agent Skill Kit for Claude Code, Copilot, Cursor, Windsurf, and other coding agents

Repo: https://github.com/weareseeed/commercebackend
Website: https://www.commercebackend.com
Full LLM context: https://www.commercebackend.com/llms-full.txt
Agent Skill Kit: https://github.com/weareseeed/commercebackend/tree/master/agent-skill-kit

v0.2 is intentionally narrow. It does not handle tax, refunds, disputes, Stripe Connect payouts, shipping labels, merchant system sync, auctions, or multi-seller carts yet.

We built it as a small, inspectable reference backend for agent-commerce workflows. I would value feedback from people working on buyer agents, seller agents, agent protocols, marketplace APIs, or payment flows for autonomous systems.
```

---

## LinkedIn / Seeed post draft

```text
We published CommerceBackend v0.2.0, an open-source backend for agent-native commerce.

CommerceBackend gives AI buyer and seller agents API primitives for:

- agent identity
- listings
- search
- offers and counter-offers
- Stripe Checkout intents
- webhook-confirmed orders
- fulfillment status
- machine-readable discovery with llms.txt and .well-known metadata
- a maintained Agent Skill Kit for common AI coding tools

The project is intentionally direct: no human storefront assumptions, no inflated claims, and clear v0.2 limits. It is a builder-facing reference system for teams exploring how agents might buy, sell, negotiate, and complete checkout through APIs.

Repo: https://github.com/weareseeed/commercebackend
Website: https://www.commercebackend.com
Agent Skill Kit: https://github.com/weareseeed/commercebackend/tree/master/agent-skill-kit

CommerceBackend is owned and maintained by Seeed LLC. Seeed LLC / Seeed.us is unrelated to Seeed Studio.
```

---

## Dev.to / technical article outline

**Working title**

```text
Building an Agent-First Commerce Backend: Listings, Offers, Checkout, and llms.txt
```

**Answer-first opening**

CommerceBackend is an open-source backend for agent-native commerce. It gives AI buyer and seller agents the API surfaces needed to register, publish listings, search, negotiate offers, create Stripe Checkout sessions, and track fulfillment without relying on a human storefront.

**Outline**

1. What changes when the buyer is an agent?
2. The atomic agent-commerce loop.
3. Why listings and offers need explicit state machines.
4. Why checkout should be hosted and idempotent first.
5. Why discovery files matter: `llms.txt`, `.well-known`, and Agent Skill Kits.
6. What v0.2 does not do yet.
7. How to run the buyer-agent walkthrough locally.

**Required proof links**

- Repository: `https://github.com/weareseeed/commercebackend`
- Website: `https://www.commercebackend.com`
- Full context: `https://www.commercebackend.com/llms-full.txt`
- Agent Skill Kit: `https://github.com/weareseeed/commercebackend/tree/master/agent-skill-kit`
- Native API docs: `https://github.com/weareseeed/commercebackend/blob/master/docs/api/native-api.md`

---

## Directory submission blurb

```text
CommerceBackend is an Apache-2.0, agent-first commerce backend for AI buyer and seller agents. It supports agent registration, fixed-price listings, search, offers and counter-offers, Stripe-backed checkout intents, webhook-confirmed orders, fulfillment status, and machine-readable discovery through llms.txt, llms-full.txt, .well-known/commercebackend.json, and a maintained Agent Skill Kit.

Repo: https://github.com/weareseeed/commercebackend
Website: https://www.commercebackend.com
llms.txt: https://www.commercebackend.com/llms.txt
Full LLM context: https://www.commercebackend.com/llms-full.txt
Agent Skill Kit: https://github.com/weareseeed/commercebackend/tree/master/agent-skill-kit
Owner: Seeed LLC, unrelated to Seeed Studio.
```

---

## Product Hunt draft

**Name**

```text
CommerceBackend
```

**Tagline**

```text
Open-source commerce backend for AI buyer and seller agents
```

**Description**

```text
CommerceBackend gives autonomous agents API primitives for commerce: identity, listings, search, offers, Stripe Checkout intents, webhook-confirmed orders, fulfillment status, and machine-readable discovery. It includes llms.txt, .well-known metadata, and an Agent Skill Kit for common AI coding tools.
```

**First comment draft**

```text
We built CommerceBackend as a small, inspectable reference backend for agent-native commerce.

Most commerce systems assume a human browsing a storefront. CommerceBackend starts from a different question: what API surfaces does a buyer or seller agent need to list, discover, negotiate, pay, and track fulfillment?

v0.2 supports agent identity, listings, search, offers and counter-offers, Stripe Checkout intents, webhook-confirmed orders, fulfillment status, llms.txt discovery, and a maintained Agent Skill Kit.

It is not a full marketplace operator yet. No tax, refunds, disputes, Stripe Connect payouts, shipping labels, merchant sync, auctions, or multi-seller carts in v0.2.

We would value feedback from agent builders, commerce API developers, protocol authors, and marketplace teams.
```

---

## Approval checklist for any copy block

- [ ] The exact target channel is named.
- [ ] The exact copy is approved.
- [ ] Links work.
- [ ] v0.2 limits remain visible.
- [ ] Seeed LLC ownership is correct.
- [ ] No Seeed Studio confusion.
- [ ] No unsupported ROI or adoption claims.
- [ ] No private deployment URLs, secrets, tokens, or internal Slack/GitHub details.
