# Official launch article package: CommerceBackend

**Status:** Ready for Content Studio polish and Builder staging. Do not publish without Seeed LLC approval.  
**Prepared:** 2026-05-25  
**Owner:** Seeed LLC  
**Operational maintainer:** Joshua / Seeed AI Operations

CommerceBackend is owned and maintained by Seeed LLC. Seeed LLC / Seeed.us is unrelated to Seeed Studio.

---

## Planning metadata

- Working title: CommerceBackend: An Open-Source Backend for Agent-First Commerce
- Target publish window: After Content Studio review and Rowland/Maria final publish approval
- Primary audience: AI agent builders, commerce API developers, protocol authors, marketplace infrastructure teams
- Funnel role: Awareness / Technical proof
- Topic cluster: Agent-native commerce, AI discovery, commerce infrastructure
- Related service/product: CommerceBackend / Rogue Commerce infrastructure research
- Source material provided: CommerceBackend repository, v0.2 release notes, Agent Skill Kit, API docs, live discovery assets, approved PR #28 article draft
- Claims requiring verification: Adoption, traffic, usage, revenue, conversion, or performance claims are not included and must not be added without measured evidence.

---

## Builder fields

- title: CommerceBackend: An Open-Source Backend for Agent-First Commerce
- subTitle: Listings, offers, Stripe Checkout, fulfillment status, and LLM-readable discovery for buyer and seller agents.
- shortDescription: CommerceBackend gives AI buyer and seller agents an API-first commerce loop: listings, offers, checkout, fulfillment status, and discovery through llms.txt.
- handle: commercebackend-agent-first-commerce
- eyebrow: Agent-First Commerce
- author: Seeed
- date: 2026-05-25
- image: `docs/launch/assets/commercebackend-blog-cover.png`
- imagePost: `docs/launch/assets/commercebackend-blog-cover.png`
- buttonText: Read More

---

## Image direction

- Cover concept: A modular commerce engine with buyer-agent and seller-agent paths feeding listings, offers, checkout, and fulfillment through an API core.
- Style: Seeed orga-meca editorial blog visual: engineered outer structure, adaptive internal signal paths, off-white background, graphite forms, controlled Seeed red highlights.
- Must include: API flow metaphor, listing/search/offer/checkout/fulfillment nodes, crop-safe negative space.
- Must avoid: stock people, humanoid robots, fake dashboards, circuit-board wallpaper, Seeed Studio or hardware references, text rendered inside the image.
- Prompt draft:

```text
Create a branded abstract blog cover for Seeed.us, a Miami digital transformation agency focused on headless commerce and Square integrations. Topic: CommerceBackend, an open-source agent-first commerce backend. Visual metaphor: a precise modular commerce engine with seller-agent and buyer-agent pathways feeding into an API core, offer negotiation chamber, hosted checkout node, and fulfillment status loop. Style: Seeed orga-meca editorial blog visual system; engineered outer structure with adaptive signal paths inside; premium product-render feel; white/off-white background, graphite and light gray forms, Seeed red #d01039 as the anchor, very restrained cyan/amber signal accents. One clear focal object, crop-safe negative space, 16:9 blog hero composition. No text, no logos, no stock people, no humanoid robots, no circuit-board wallpaper, no fake unreadable UI, no hardware-company references.
```

- Alt text: Abstract commerce engine showing buyer and seller agent pathways connected through listings, offers, checkout, and fulfillment status.

---

# Article body

CommerceBackend is an open-source backend for agent-first commerce. It gives AI buyer and seller agents the API surfaces needed to register, publish listings, search, negotiate offers, create Stripe Checkout sessions, and track fulfillment without depending on a human storefront.

## What changes when the buyer is software?

Most commerce systems assume a human is browsing product cards, reading product pages, clicking checkout buttons, and resolving ambiguity in the interface. That assumption weakens when the buyer is an agent.

A buyer agent needs structured answers:

- What can I buy?
- Who is allowed to sell it?
- What does it cost?
- Can I negotiate terms?
- How do I pay safely?
- What happened after checkout?

A seller agent needs the matching surface:

- How do I publish inventory?
- How do I expose attributes another agent can search?
- How do I accept, reject, or counter an offer?
- How do I know payment cleared?
- How do I update fulfillment status?

CommerceBackend starts from those questions. It is not a storefront with agent features added later. It is an API-first commerce loop that treats buyer and seller agents as first-class users.

## What does CommerceBackend support now?

CommerceBackend focuses on the smallest useful agent-commerce loop: identity, listings, search, offers, checkout, webhook-confirmed orders, and fulfillment status.

| Capability              | What it does                                                                           | Why agents need it                                                                    |
| ----------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Agent identity          | Registers buyer and seller agents with bearer API keys.                                | Agents need scoped credentials and stable identity.                                   |
| Listings                | Lets sellers create, pause, activate, and update fixed-price listings.                 | Seller agents need an API-native catalog surface.                                     |
| Search                  | Scores listing matches across titles, descriptions, and attributes.                    | Buyer agents need structured discovery without scraping.                              |
| Offers                  | Supports offer, accept, reject, counter, accept-counter, and cancel flows.             | Agents often need negotiation, not only listed-price checkout.                        |
| Checkout intents        | Creates Stripe-backed hosted checkout sessions.                                        | Payment should use a known hosted flow before deeper marketplace payout logic exists. |
| Stripe webhook handling | Confirms checkout completion and creates orders.                                       | Agents need server-side payment confirmation.                                         |
| Fulfillment status      | Lets sellers update order fulfillment and buyers read status.                          | The commerce loop needs post-payment state.                                           |
| Agent discovery         | Publishes `llms.txt`, `llms-full.txt`, `.well-known` metadata, and an Agent Skill Kit. | Agents need reliable project context before making calls or proposing code.           |

This is enough to test the shape of agent-native commerce without presenting the system as a full marketplace operator.

## Why are offers part of the core loop?

Agent commerce is not only “find item, buy item.” Some purchases need negotiation before checkout: price, quantity, expiration, or seller confirmation.

CommerceBackend models that directly. A buyer can submit an offer on a listing. A seller can accept it, reject it, or submit a counter-offer. A buyer can accept the counter-offer or cancel while the offer is still pending or countered.

Every state transition creates an audit record. That matters because agent actions need traceability. If a buyer agent accepts a counter-offer, the system should be able to show when it happened and what terms were accepted.

## Why use Stripe Checkout first?

CommerceBackend uses Stripe Checkout because hosted checkout keeps the payment surface narrow. The system creates checkout intents, persists state, and relies on Stripe webhook confirmation before creating orders.

The API also guards against a common failure mode: accepted offers should not be reused after checkout begins. Once a checkout intent is created for an accepted offer, the offer moves to `checkout_pending`. If the Stripe session fails before a session exists, the offer can return to `accepted` so the buyer can retry. If a Stripe session exists but the database update fails afterward, the system keeps the offer in a safer pending state and logs a reconciliation alert.

That is not glamorous. It is the kind of boring edge case that prevents duplicate checkout paths. Boring wins a surprising number of games.

## Why publish `llms.txt` and an Agent Skill Kit?

If agents are going to integrate with a system, they need a trustworthy starting point. Scraping a landing page and guessing behavior is not enough.

CommerceBackend publishes several agent-facing discovery surfaces:

- `https://www.commercebackend.com/llms.txt` for compact project context.
- `https://www.commercebackend.com/llms-full.txt` for deeper context.
- `https://www.commercebackend.com/.well-known/commercebackend.json` for machine-readable metadata.
- `agent-skill-kit/` for reusable buyer, seller, and coding-agent instructions.
- Platform adapters for Claude Code, GitHub Copilot, Cursor, and Windsurf.

The point is not to overload agents with prompts. The point is to make the canonical instructions easy to find and keep them maintained in one place.

## What does CommerceBackend not handle yet?

CommerceBackend is intentionally narrow. It does not include:

- refunds or disputes
- tax calculation
- Stripe Connect seller payouts
- shipping labels or carrier tracking
- Shopify, WooCommerce, BigCommerce, or Square merchant sync
- auctions
- multi-seller carts
- a human-first storefront marketplace UI

Those omissions are not hidden. They are part of the current system boundary. A small system with clear limits is more useful to builders than a large system with vague promises.

## How can developers try it?

Start from the repository:

```bash
git clone https://github.com/weareseeed/commercebackend.git
cd commercebackend
pnpm install
cp .env.example .env
NODE_ENV=test pnpm test
pnpm build
```

Run the local API and seed data:

```bash
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Then run the buyer-agent walkthrough after the API is available at `http://localhost:4000`:

```bash
node examples/agent-buyer-flow/buyer-offer-flow.mjs
```

Useful links:

- Repository: `https://github.com/weareseeed/commercebackend`
- Website: `https://www.commercebackend.com`
- Full LLM context: `https://www.commercebackend.com/llms-full.txt`
- Agent Skill Kit: `https://github.com/weareseeed/commercebackend/tree/master/agent-skill-kit`
- Native API docs: `https://github.com/weareseeed/commercebackend/blob/master/docs/api/native-api.md`

## Where does this go next?

The next useful work is not a louder launch. It is more protocol coverage, more examples, and sharper operational boundaries.

Potential next steps include:

- deeper ACP and UCP adapters
- seller payout planning with Stripe Connect
- refund and dispute flows
- merchant connector research
- richer buyer-agent examples
- clearer evals for agent-generated commerce actions

CommerceBackend is a starting point for builders exploring agent-native commerce. It is small enough to inspect and direct enough to test. That is the point.

---

## FAQ block

### Is CommerceBackend a storefront?

No. CommerceBackend is an API-first backend for agent-first commerce. It does not provide a human-first marketplace browsing UI in the current release.

### Does CommerceBackend process real payments?

CommerceBackend creates Stripe Checkout sessions and uses Stripe webhook events to confirm checkout completion. Production use still requires correct Stripe configuration, operational review, and missing marketplace features such as payouts, refunds, disputes, and tax handling.

### Does CommerceBackend support seller payouts?

No. CommerceBackend does not include Stripe Connect seller payouts yet. Seller payout handling is a future work area and should not be implied in public copy.

### Why include `llms.txt`?

Agents need stable project context. `llms.txt`, `llms-full.txt`, `.well-known` metadata, and the Agent Skill Kit give coding, buyer, seller, and research agents a safer starting point than scraping pages or guessing behavior.

### Who owns CommerceBackend?

CommerceBackend is owned and maintained by Seeed LLC. Seeed LLC / Seeed.us is unrelated to Seeed Studio.

---

## Related content

- CommerceBackend repository: `https://github.com/weareseeed/commercebackend`
- CommerceBackend Agent Skill Kit: `https://github.com/weareseeed/commercebackend/tree/master/agent-skill-kit`
- CommerceBackend API docs: `https://github.com/weareseeed/commercebackend/blob/master/docs/api/native-api.md`
- Seeed.us: `https://www.seeed.us`

---

## CTA

Clone the repository, run the buyer-agent walkthrough, and inspect the Agent Skill Kit before proposing changes or integrations.

---

## Schema recommendation

- Type: `TechArticle`
- Required fields:
  - `headline`
  - `description`
  - `author`
  - `publisher`
  - `datePublished`
  - `dateModified`
  - `mainEntityOfPage`
  - `about`
  - `mentions`
- Notes:
  - Use Seeed LLC as publisher.
  - Include CommerceBackend, `llms.txt`, Stripe Checkout, agent-first commerce, and API-first marketplace infrastructure as `about` / `mentions` entities.
  - Do not add usage, adoption, revenue, or performance claims unless measured.

---

## QA checklist

- [x] Seeed.us / Seeed LLC, not Seeed Studio
- [x] No `Seed` typo
- [x] No banned buzzwords
- [x] No unsupported ROI claim
- [x] Answer-first opening
- [x] One clear H1/title
- [x] H2/H3 hierarchy is useful
- [x] Includes table/checklist/evidence block
- [x] Includes internal links/related content
- [x] Includes image alt text
- [x] Includes FAQ
- [x] Schema-ready
- [ ] Final Content Studio edit complete
- [ ] Builder staging complete
- [ ] Rowland/Maria final publish approval complete
