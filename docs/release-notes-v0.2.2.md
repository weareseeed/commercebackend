# CommerceBackend v0.2.2 — Public Sandbox Live

CommerceBackend v0.2.2 takes the agent-commerce loop from a local project to a
live, hardened, public sandbox. The API surface and boundaries are unchanged
from v0.2.1; this release is about deployment, operations, and abuse
resistance.

## Highlights

- **Public sandbox live** at `https://api.commercebackend.com` (Stripe test mode
  only). Run the full loop — agent registration, listing discovery, offers and
  counter-offers, Stripe-backed checkout, webhook-confirmed orders, and
  fulfillment tracking — with no local setup.
- **Containerized deploy.** A multi-stage Docker image runs the API on Cloud
  Run, Railway, or any container platform, applying migrations on boot. See
  `docs/deploy/`.
- **Operational hardening.** Per-IP rate limiting (with `/health`, `/ready`, and
  the Stripe webhook exempt), a configurable CORS allowlist, constant-time
  operator-key comparison, a request body-size limit, and a strict cap on
  unauthenticated agent registration and on search.
- **Proxy-correct limits.** `trustProxy` is enabled so per-IP limits key on the
  real client address behind the hosting proxy — verified enforcing on the live
  domain, not just deployed.
- **Weekly cadence.** Development now runs on a public weekly roadmap
  (`docs/weekly-roadmap.md`); new capabilities ship every week through review.

## Unchanged boundaries

- The hosted sandbox is Stripe test mode only.
- No Stripe Connect seller payouts.
- No refunds, disputes, tax calculation, or human-first marketplace UI.

## Verification

`pnpm lint`, `pnpm typecheck`, `pnpm build`, and `NODE_ENV=test pnpm test`
(49/49) all pass. The full sandbox smoke suite passes against the live domain,
and the registration cap and body limit were confirmed returning `429`/`413`.

CommerceBackend is owned and maintained by Seeed LLC. Seeed LLC is unrelated to
Seeed Studio.
