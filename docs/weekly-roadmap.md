# CommerceBackend Weekly Roadmap

A Friday-cadence backlog so development keeps moving. Each item is scoped to
roughly one focused day. The automated Friday routine (and any contributor)
should **take the top unchecked, non–human-led item**, implement it on a branch
with tests, and open a PR for review. Nothing merges without a code-owner
review (branch protection stays in force).

This complements the phase-level [`ROADMAP.md`](../ROADMAP.md); this file is the
executable, ordered version.

## North Star

**Goal: make CommerceBackend the most advanced agent-first commerce backend in
existence** — the default place autonomous agents discover products, negotiate,
transact, and fulfill, with primitives no human-first store retrofits well.

Two principles keep that a real target and not a slogan:

1. **Earned, not claimed.** "Most advanced" is proven by shipped, tested,
   verifiable capabilities — never by marketing copy ahead of the code. Public
   claims must match shipped behavior (this is why we verify limits actually
   enforce, not just that they deploy).
2. **The money path is human-led.** Refunds, disputes, payouts, tax, and
   real-money processing get deliberate design and explicit owner approval —
   never an autonomous change. "Advanced" there means correct and auditable.

Every weekly item should ladder up to one of these long-horizon epics:

- **Protocol leadership** — production ACP and UCP adapters and a first-class
  MCP server, so any agent framework can plug in natively.
- **Merchant reach** — connector imports (Shopify, Square, BigCommerce,
  WooCommerce) that turn real catalogs into agent-shoppable listings via a
  canonical model.
- **Agent-native primitives** — purchase policies and budgets, negotiation,
  human-approval and delegation guardrails, provenance and audit trails, agent
  identity and reputation.
- **Search & discovery at scale** — DB, then semantic/vector search and ranking
  so agents find the right offer, not just a matching string.
- **Operational credibility** — observability, metrics, abuse controls, a
  checkout event ledger, an operator dashboard, and incident runbooks.
- **Proven reliability** — SDKs, skill kit, runnable examples, and evaluation
  fixtures that demonstrate agents completing discovery → negotiate → checkout →
  fulfill → failure-handling end to end.
- **Trustworthy money path** `[HUMAN-LED]` — refunds, disputes, Stripe Connect
  payouts, and tax, designed carefully and auditable.
- **Marketplace maturity** — multi-seller, multi-currency, and platform
  economics as the model hardens.

## Working rules for the Friday routine

1. Pick the **topmost unchecked item that is not tagged `[HUMAN-LED]`**.
2. Small, reviewable PR. Include a test plan and run `pnpm lint`, `pnpm
   typecheck`, `pnpm build`, and `NODE_ENV=test pnpm test` before handoff.
3. **Do not** implement `[HUMAN-LED]` items autonomously. They touch the money
   path or need a human design decision (see AGENTS.md money-path guardrails).
   If the top item is `[HUMAN-LED]`, skip to the next buildable one and leave a
   note that the human-led item is blocking.
4. Never merge; never change branch protection, DNS, secrets, or production
   settings. Open the PR and request review.
5. If an item is bigger than a day, ship a coherent first slice and check off a
   sub-task, leaving the rest.
6. When agent-facing behavior changes, update `agent-skill-kit/`, `prompts/`,
   `llms.txt`, `llms-full.txt`, and `.well-known/commercebackend.json` in the
   same PR.
7. After opening the PR, check the box here (in the same PR) and add the PR
   link.
8. **Keep the backlog full.** If fewer than 3 unchecked, buildable items remain,
   propose new ones drawn from the North Star epics (with a one-line _DoD_) and
   append them to the backlog in the same PR — the pipeline should never run dry.
9. **Ping when blocked.** If work can't proceed — the buildable backlog is
   exhausted, checks can't be made to pass, the top item needs a human decision,
   or the next priority is `[HUMAN-LED]` — do not fail silently. Open (or update)
   a GitHub issue titled `[weekly-routine] needs input: …` that mentions
   `@rsaer` with the specific decision or help needed, and stop.

## Backlog (ordered)

- [x] **1. Rate-limit & proxy hardening polish.** Gate the rate limiter off for
  any vitest run (check `VITEST` as well as `NODE_ENV==='test'`); make proxy
  trust configurable via a `TRUST_PROXY` env (default on) instead of a hardcoded
  `true`; document both. _DoD:_ tests green with and without `NODE_ENV`; env
  documented in README + `.env.example`. — [#147](https://github.com/weareseeed/commercebackend/pull/147)
- [x] **2. DB-level listing search.** Replace the in-memory 1000-row scan
  (`search.service.ts`) with a PostgreSQL query (trigram/`ILIKE` or `tsvector`),
  keeping the pluggable provider interface and current scoring semantics; add
  the needed index via a Prisma migration. _DoD:_ existing search tests pass,
  new tests for ranking/pagination, no full-table in-memory load. — [#148](https://github.com/weareseeed/commercebackend/pull/148)
- [ ] **3. MCP server.** Implement a minimal MCP server exposing search /
  listing / offer / checkout tools that map to the native API, matching
  `docs/api/mcp-tool-spec.md`. New workspace package + tests + usage docs; wire
  it into discovery assets. _DoD:_ an MCP client can list tools and run a search
  against the sandbox.
- [ ] **4. Operator visibility endpoint.** Add a read-only, operator-gated
  counts/metrics endpoint (agents, listings, offers, checkout intents, orders,
  query logs, `CHECKOUT_PERSISTENCE_FAILED` events) as groundwork for the v0.4
  dashboard. _DoD:_ endpoint returns live counts; operator-auth enforced; tests.
- [ ] **5. Per-record salt for API-key hashing.** Add a per-key salt column +
  migration; keep verifying existing keys (backward compatible). _DoD:_ old and
  new keys both authenticate; tests cover both paths. (Security, non-Stripe.)
- [ ] **6. Real ACP adapter.** Turn the `protocol-acp` stub into a working
  inbound/outbound mapping with an API entry point; document supported subset.
  _DoD:_ round-trip mapping tests; clearly-labeled unsupported fields.
- [ ] **7. Real UCP adapter.** Same treatment for `protocol-ucp`.
- [ ] **8. Connector abstraction + Shopify import spike (read-only).** Canonical
  imported-catalog model + a read-only Shopify catalog import that maps into
  agent-facing listings, with a sync log and failure states. May span two
  Fridays — ship the model + import first. _DoD:_ a Shopify catalog fixture
  imports into listings; sync log records outcome.
- [ ] **9. Square connector spike (read-only).** As above, for Square catalog.
- [ ] **10. Read-only operator dashboard.** Minimal admin views over the counts
  from item 4 (agents, listings, offers, orders, query logs, critical events).
  _DoD:_ operator can inspect sandbox state in a browser.

## Human-led (design + human review first — do NOT auto-build)

These are fenced off from the Friday routine because they touch payments,
compliance, or irreversible product decisions.

- **`[HUMAN-LED]` `payment_inventory_conflict` policy.** Funds can be captured
  when inventory is exhausted at webhook time (`orders.service.ts`), with no
  auto-refund today. Decide: auto-refund via Stripe vs. manual review queue.
  Refunds are a Stripe money-path feature and need a dedicated plan + review.
- **`[HUMAN-LED]` Stripe Connect payouts** feasibility + compliance review.
- **`[HUMAN-LED]` Tax calculation** engine.
- **`[HUMAN-LED]` Major dependency migrations** (Stripe, Prisma, Fastify, Zod,
  TypeScript) — per AGENTS.md, never routine.
- **`[HUMAN-LED]` Promoting real-money processing** or unrestricted public
  write access — requires explicit owner approval and DNS/secret changes.

## Done

Completed items move here with their PR link (newest first).

- Public sandbox live at `https://api.commercebackend.com` (TLS, per-IP rate
  limiting verified enforcing) — #135–#139.
