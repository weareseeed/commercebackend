# CommerceBackend Live Sandbox Plan

This plan defines the first credible "live project" version of CommerceBackend: a public, test-mode sandbox that proves the agent-native marketplace flow without opening real-money seller onboarding or production connector risk.

## Objective

Make CommerceBackend usable by outside builders in less than 10 minutes.

A successful sandbox lets a developer or agent:

1. Read agent-facing discovery files.
2. Hit a hosted API.
3. Browse seeded listings.
4. Create or inspect an offer.
5. See whether purchase policy allows auto-approval or requires human approval.
6. Create a Stripe test-mode checkout intent.
7. Complete checkout with Stripe test cards.
8. Observe order creation, inventory decrement, and checkout event history.
9. Understand what is safe to build on today.

## Recommended first live shape

```text
CommerceBackend OSS + hosted demo sandbox
```

Not yet:

- CommerceBackend Cloud.
- Production merchant onboarding.
- Real-money public marketplace operation.
- Full connector import platform.

## Proposed URLs

Candidate production-style endpoints:

```text
https://www.commercebackend.com
https://api.demo.commercebackend.com
https://www.commercebackend.com/docs/sandbox
https://www.commercebackend.com/llms.txt
https://www.commercebackend.com/llms-full.txt
https://www.commercebackend.com/.well-known/commercebackend.json
```

Final DNS and hosting changes require explicit approval before execution.

## Hosting recommendation

Preferred stable setup:

- API: Google Cloud Run or Railway.
- Database: managed PostgreSQL through Cloud SQL, Supabase, Neon, or Railway Postgres.
- Landing/docs: existing Vercel deployment.
- Payments: Stripe test mode only.
- Secrets: managed environment variables, never committed.

Joshua's bias:

- Use Railway if speed matters most.
- Use Google Cloud Run + managed Postgres if Seeed wants production-like operations from day one.

## Sandbox data model

Seed at least:

- One seller agent.
- One buyer agent.
- Three fixed-price listings.
- One listing designed for offer negotiation.
- One accepted offer fixture.
- One expired offer fixture.
- One low-inventory listing.
- One buyer-agent purchase policy that auto-approves a low-value checkout.
- One buyer-agent purchase policy that requires human approval above a threshold.
- One checkout-intent fixture in `human_approval_required` state once that state exists.

Seed data must be safe, fictional, and Stripe-compatible. Avoid restricted goods, regulated products, medical claims, weapons, adult content, or anything that would make payment policy review spicy in the bad way.

## Public demo flows

### Flow 1 — Browse listings

```text
GET /listings
GET /listings/:id
POST /search
```

Expected proof:

- Agent can discover listings without a browser.
- Search results include enough structured detail for an agent to reason about purchase suitability.

### Flow 2 — Fixed-price checkout with policy evaluation

```text
POST /checkout-intents
Policy evaluates buyer-agent purchase authority
If auto-approved: create Stripe Checkout session
If human approval required: create approval request before Stripe session
Redirect user to Stripe Checkout test mode
Stripe webhook returns
Order is created
Inventory decrements
Checkout events are visible
```

Expected proof:

- Checkout intent is persisted before Stripe session creation.
- Buyer-agent policy is evaluated before payment handoff.
- Human approval can approve or reject a bounded purchase before money moves.
- Stripe webhook signature verification remains enabled.
- Order creation is idempotent.
- Inventory changes are visible after checkout.
- Event history links policy, approval, Stripe session, order, and inventory transitions.

### Flow 3 — Offer negotiation

```text
POST /offers
POST /offers/:id/accept
POST /checkout-intents/from-offer
```

Expected proof:

- Checkout uses accepted offer terms, not stale listing terms.
- Expired offers cannot be checked out.
- Accepted offer checkout cannot be reused incorrectly.

### Flow 4 — Agent logs and safety

```text
GET /agent-query-logs
GET /orders/:id
GET /health
```

Expected proof:

- Buyer/seller activity is inspectable.
- Critical payment-path failures emit structured logs.
- Operators can distinguish user error, Stripe error, and persistence failure.

## Access policy

Initial public sandbox should be read-mostly with controlled write paths.

Recommended controls:

- Public unauthenticated read access for seeded listings and discovery files.
- Public write access only to test-mode demo endpoints with rate limits.
- API keys for anything that mutates long-lived demo state.
- Daily database reset or fixture reset endpoint restricted to operators.
- Per-IP rate limiting.
- Request body size limits.
- Abuse monitoring.

## Stripe boundaries

Sandbox must use Stripe test mode only.

Rules:

- Never process real cards in the sandbox.
- Never advertise seller payouts.
- Never imply refunds, disputes, tax calculation, Stripe Connect payouts, shipping labels, auctions, or multi-seller carts exist.
- Use Stripe-supported language: checkout, authorization, payment intent/session, capture, refund, dispute, payout — only when implemented.

## Environment variables

Required categories:

- Database URL.
- Stripe test secret key.
- Stripe webhook secret.
- Public app/API URLs.
- Rate-limit configuration.
- Demo reset secret, if implemented.

Production guardrail:

- `BYPASS_STRIPE_SIGNATURE=true` must never be allowed in production.

## Operational checks

Before calling the sandbox live:

- `pnpm build` passes.
- `pnpm lint` passes.
- `pnpm typecheck` passes.
- `NODE_ENV=test pnpm test` passes.
- Database migrations run from empty database.
- Seed script is idempotent.
- Stripe webhook test passes.
- Fixed-price checkout creates exactly one order.
- Purchase-policy evaluation is recorded before checkout handoff.
- Human-approval-required checkout cannot create a Stripe session until approved.
- Rejected approval leaves a terminal/auditable state and does not create a Stripe session.
- Offer checkout uses accepted terms.
- Expired offer checkout fails.
- Low-inventory path behaves correctly.
- `/health` returns healthy.
- Public discovery files return 200.
- `pnpm verify:discovery:strict` passes against the custom domain, with no stale
  release markers or JSON fields.
- Demo docs include all test-mode limitations.

## Observability

Minimum live visibility:

- Request logs.
- Error logs.
- Structured `CHECKOUT_PERSISTENCE_FAILED` logs.
- Stripe webhook delivery status.
- Checkout intent and order counts.
- Search/query log counts.
- Rate-limit events.

Recommended alert candidates:

- Any `CHECKOUT_PERSISTENCE_FAILED` event.
- Repeated webhook failures.
- Order creation without inventory decrement.
- Database connection errors.
- Unusual write volume from a single IP.

## Documentation required before launch

Create or update:

- README quickstart.
- Hosted sandbox quickstart.
- API examples for buyer and seller agents.
- Stripe test-card instructions.
- Known limitations.
- Roadmap link.
- Security policy link.
- Contributing guide link.

## Launch approval gates

Requires Rowland or Maria approval before:

- DNS changes.
- Deploying a public API under `commercebackend.com`.
- Enabling public write endpoints.
- Publishing Seeed.us article/social/Product Hunt/Show HN posts.
- Moving from Stripe test mode to any real-money processing.
- Adding production merchant connectors.

## Recommended build sequence

1. Create sandbox deployment branch.
2. Add seed fixtures and reset policy.
3. Add hosted API environment config.
4. Add sandbox docs.
5. Deploy private preview.
6. Run fixed-price checkout and offer checkout smoke tests.
7. Verify logs and Stripe webhook behavior.
8. Open launch-readiness PR with evidence.
9. Get approval for DNS/public API exposure.
10. Publish live sandbox and update owned surfaces.

## Definition of live

CommerceBackend sandbox is live when an outside builder can complete this without Seeed intervention:

```text
Read docs → call hosted API → inspect listings → run buyer/seller example → complete Stripe test checkout → see order result
```

That is the first real milestone. Everything after that is scaling the game, not pretending the board exists.
