# Agent Discovery and Integration Guide

CommerceBackend is an open-source, agent-first commerce infrastructure layer designed to let autonomous AI agents list, discover, negotiate, and purchase goods or services programmatically.

CommerceBackend is owned and maintained by Seeed LLC. Seeed LLC is unrelated to Seeed Studio.

---

## 1. What Agents Can Do Today

Autonomous AI agents can perform the following tasks via the Native API:

- **Manage Listings**: Sellers can create, update, activate, and pause listings with custom metadata attributes.
- **Discover Listings**: Buyers can search listings with paginated query inputs and filtering rules.
- **Negotiate with Offers**: Buyers and sellers can submit, accept, reject, counter, cancel, and inspect offers.
- **Purchase via Checkout Intents**: Buyers can create Stripe-backed checkout sessions using safe inventory checks and hardened webhook reconciliation.
- **Track Fulfillment**: Buyers and sellers can read orders, and sellers can update fulfillment status.

---

## 2. Agent Skill Kit

The canonical reusable instructions for AI agents live in [`agent-skill-kit/`](../agent-skill-kit/):

| File                       | Purpose                                       |
| -------------------------- | --------------------------------------------- |
| `commercebackend-skill.md` | Product/API context for any AI agent.         |
| `buyer-agent.skill.md`     | Buyer/procurement agent flow.                 |
| `seller-agent.skill.md`    | Seller/listing/fulfillment agent flow.        |
| `coding-agent.skill.md`    | Repository contribution and testing guidance. |
| `evaluation-checklist.md`  | Review checklist for generated output.        |
| `install-snippets.md`      | Copy/paste adapters for common AI tools.      |
| `MAINTAINERS.md`           | Maintainer policy and update triggers.        |

Tool-specific adapters are available in:

- `CLAUDE.md`
- `.github/copilot-instructions.md`
- `.cursor/rules/commercebackend.mdc`
- `.windsurf/rules/commercebackend.md`

Primary skill kit maintainer: **Joshua / Seeed AI Operations**, under Seeed LLC oversight.

---

## 3. Negotiating with Offers

The Offers feature introduces a structured state machine for price and quantity negotiation:

1. **Submit Offer**: A buyer creates an offer on a listing specifying price, quantity, expiration, and an optional note.
2. **Accept, Reject, or Counter**: The seller can accept the terms directly, reject them, or submit counter terms.
3. **Buyer Decision**: The buyer can accept counter terms or cancel their offer.
4. **Frozen Terms**: Once accepted, the final price and quantity are frozen and locked into the offer record.

---

## 4. High-Level Checkout Flow

1. **Initiate Checkout**: The buyer initiates a checkout session by providing `listingId` and, when using accepted negotiated terms, `offerId` to `POST /v1/checkout-intents`.
2. **Lock Offer**: The offer is transactionally transitioned to `checkout_pending` to prevent reuse or duplicate checkout intents.
3. **Stripe Session**: A Stripe checkout session is created.
   - If session creation fails, the offer reverts to `accepted`.
   - If the session succeeds but database persistence fails, the offer remains `checkout_pending` and logs a reconciliation alert.
4. **Payment Verification**: Once payment is completed, the Stripe webhook processes the event:
   - Inventory is decremented.
   - An order is created.
   - An `OFFER_CHECKOUT_COMPLETED` history record is logged.
   - If a concurrent conflict runs the listing out of stock, the order is cancelled, inventory is protected, and the offer transitions to `cancelled`.

---

## 5. Ownership and Disambiguation

- **Owner**: CommerceBackend is owned and maintained by Seeed LLC.
- **License**: Apache-2.0.
- **Disambiguation**: Seeed LLC (https://www.seeed.us) is a software engineering company focused on Square, commerce, and AI systems. It is completely unrelated to Seeed Studio.

---

## 6. Canonical Links

- **Homepage**: https://commercebackend.com
- **Repository**: https://github.com/weareseeed/commercebackend
- **llms.txt**: [/llms.txt](https://www.commercebackend.com/llms.txt)
- **llms-full.txt**: [/llms-full.txt](https://www.commercebackend.com/llms-full.txt)
- **commercebackend.json**: [/.well-known/commercebackend.json](https://www.commercebackend.com/.well-known/commercebackend.json)
- **agents.json**: [/.well-known/agents.json](https://www.commercebackend.com/.well-known/agents.json)
- **Agent Skill Kit**: [agent-skill-kit/](https://github.com/weareseeed/commercebackend/tree/master/agent-skill-kit)
- **Buyer Agent Flow Example**: [examples/agent-buyer-flow](https://github.com/weareseeed/commercebackend/tree/master/examples/agent-buyer-flow)
- **Prompt Pack**: [prompts/](https://github.com/weareseeed/commercebackend/tree/master/prompts)

---

## 7. Maintainer verification for discovery assets

When a change touches `llms.txt`, `llms-full.txt`, `/.well-known/commercebackend.json`, `/.well-known/agents.json`, or docs that describe those surfaces, run:

```bash
pnpm verify:discovery:strict
```

This verifier checks:

- repository parity between the repo-root discovery files and `apps/landing/public/`
- required discovery text/JSON fields
- public production parity at `https://www.commercebackend.com`

If strict parity fails, the script reports the first differing text line or the JSON field path that drifted, which helps distinguish stale repository artifacts from stale production deployment bytes.

---

Copyright ©️ 2026 Seeed LLC. Licensed under the Apache License 2.0.
