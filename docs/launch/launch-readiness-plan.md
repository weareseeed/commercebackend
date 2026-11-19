# CommerceBackend Launch Readiness Plan

Status: **draft for maintainer review.** Everything marked *gap* or *planned* is
not done. Public claims must follow shipped behavior (see `ROADMAP.md`
principle 6). Items tagged `[HUMAN-LED]` need explicit Seeed approval and are
never built by the autonomous weekly routine.

Machine-readable counterpart: [`openspec/`](../../openspec/) (current-behavior
specs plus proposed changes).

## Direction

- **Target user:** agent-framework builders: people building or integrating
  buyer/seller agents who want API-native commerce primitives, MCP/ACP/UCP
  access, and a sandbox they can try in minutes.
- **Seeed's goal:** both an ecosystem/credibility play (open source, protocol
  leadership) and a revenue product (CommerceBackend Cloud). The OSS launch
  comes first and must stand on its own; the Cloud is gated behind the
  money-path work below.
- **Merchants** are a second audience, reached later through connectors. They
  are not the launch target.

## What "launch" means (two launches, not one)

| | Launch 1: Public OSS + hosted test-mode sandbox | Launch 2: Real-money / CommerceBackend Cloud |
| --- | --- | --- |
| Audience | Agent-framework builders | Merchants and operators who move real money |
| Money | Stripe **test mode only** | Real payments |
| State today | Sandbox is live at `api.commercebackend.com`; public announcement not yet approved/sent | Not started; planning only |
| Gate | Checklist below plus Seeed approval | Launch 1 outcomes, money-path `[HUMAN-LED]` items, compliance review |

This plan makes **Launch 1** shippable and defines the entry criteria for
Launch 2. It does not authorize either launch.

## Launch 1 readiness checklist

Legend: **done** (verified in repo), **gap** (missing), **decision** (needs a
human choice), **human-led** (money path or public/external action).

### A. Product and API
| Item | Status |
| --- | --- |
| Agent identity, listings, DB search, offers/counteroffers, checkout intents, Stripe webhook orders, fulfillment | done |
| Purchase policy + human-approval gating before any Stripe session | done |
| `payment_inventory_conflict` detected and recorded as a critical event | done |
| Decision reasons and pending-approval count on operator metrics | done |
| Spending-limit enforcement (today read-only signal) | gap, human-led (`openspec/changes/approval-hardening`) |
| Approval expiry | gap, human-led (same change) |
| Append-only checkout event table (ledger is derived today) | gap, human-led (same change) |
| Refund path for inventory conflicts | gap, human-led (`openspec/changes/inventory-conflict-operator-refund`); manual refund via Stripe Dashboard until then |

Launch 1 can ship in test mode **without** the human-led items, provided public
copy says what is not implemented (no refunds, disputes, tax, payouts).

### B. Agent integration surface (the core of the audience)
| Item | Status |
| --- | --- |
| MCP server (`packages/mcp`) with core tools | done |
| MCP parity: negotiation tools, reputation | gap (weekly backlog 20, 22, 23) |
| JS SDK (`packages/sdk-js`) and MCP package are `private`, not published | gap, human-led (`openspec/changes/publish-agent-packages`) |
| ACP/UCP adapters for a documented subset | done |
| Runnable buyer and negotiation examples | done |
| Agent evaluation fixtures (discovery, approval, failure handling) | gap (weekly backlog 26) |
| Skill kit and prompts match behavior | done (re-verify at release) |

### C. Sandbox
| Item | Status |
| --- | --- |
| Hosted sandbox, rate limits enforcing, reset controls, seeded fixtures | done |
| Stripe test-key guard (`SANDBOX_MODE` rejects `sk_live_`) | done |
| Defined success metric for outside builders | decision (see below) |
| Alerting that reaches a named person | gap, decision |

### D. Operations
| Item | Status |
| --- | --- |
| Operator metrics, dashboard, ledger lookup, incident runbook | done |
| Named on-call/escalation for `CHECKOUT_PERSISTENCE_FAILED` and `PAYMENT_INVENTORY_CONFLICT` | decision |
| Pending-approval notification to an operator | gap (design doc, `policy-approval-design.md` item 4) |
| Backup/restore and migration-rollback procedure documented and tested | gap (verify; not found in `docs/deploy`) |

### E. Security and trust
| Item | Status |
| --- | --- |
| Hashed API keys (scrypt + per-record salt), webhook signature guard, constant-time operator key, rate limits, CORS allowlist | done |
| `SECURITY.md` with private reporting channel | done |
| `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md` | gap (weekly backlog 25) |
| Threat model / independent security review recorded | gap, decision (scope and owner) |
| Dependency policy for money-path majors (AGENTS.md) | done |

### F. Documentation and discovery
| Item | Status |
| --- | --- |
| llms.txt, llms-full.txt, `.well-known/*`, agent skill kit | done |
| Production parity verified after the latest deploy (`pnpm verify:discovery:strict`) | gap (could not run from the build container; run after deploy) |
| Hosted sandbox quickstart, limitations stated | done (re-verify at release) |
| v0.3 release notes | gap (weekly backlog 28) |

### G. Release engineering
| Item | Status |
| --- | --- |
| Version bump and tag (v0.3.0) | human-led (tags and releases need Seeed approval) |
| Release notes and changelog | gap |
| Migration applied on the hosted sandbox before announcing | gap (verify) |

### H. Go-to-market
| Item | Status |
| --- | --- |
| Announcement drafts (`docs/launch/`) | done (drafts; do not send) |
| Approval to publish (Rowland Saer or Maria King) | human-led |
| Channel list and timing | decision |
| Claims review against "What not to claim" | gap (run before sending) |

## Success metrics (to be defined by maintainers)

No targets are set here. Candidates for the sandbox, all measurable from data
the operator metrics endpoint can already be extended to expose:

- outside builders who complete docs, hosted API, listing browse, Stripe test
  checkout, and order visibility without Seeed intervention (the "Definition of
  live" in `LIVE_SANDBOX_PLAN.md`);
- distinct agents registered per week;
- checkouts that reach `paid` in test mode;
- median time from first request to first completed checkout.

Maintainers should pick which of these is the Launch 1 metric and set the
target and review date.

## Sequencing

1. **Close the open review items** and merge outstanding PRs (done or in
   progress).
2. **Docs/process gaps** (no approval needed beyond review): contributor docs,
   changelog, v0.3 release notes draft, evaluation fixtures, MCP parity.
3. **Decisions:** success metric, on-call owner, alerting channel, threat-model
   scope, channels and timing.
4. **Money-path work** `[HUMAN-LED]`: approval hardening, then the
   operator-triggered refund path; each with a design review before code.
5. **Release candidate:** rerun the full check suite, verify migrations on the
   sandbox, `pnpm verify:discovery:strict` against production, claims review.
6. **Go/no-go** by Seeed, then tag v0.3.0 and announce. Nothing is sent or
   published before that approval.
7. **Launch 2 entry review** after Launch 1 data exists.

## Launch 2 entry criteria (not a commitment)

All of: refund and dispute handling designed and reviewed; Stripe Connect
feasibility and compliance review complete; tax approach decided; real-money
guardrails and rollback plan approved by Seeed; incident process exercised;
Launch 1 metric met. Until then real-money processing stays off.

## Risks

- **Money path:** captured funds with no order (mitigated by detection, not yet
  by refund). Keep sandbox test-mode only.
- **Overclaiming:** public copy outrunning shipped behavior. Mitigation: claims
  review and discovery parity checks before announcing.
- **Process throughput:** review and approval queue is the bottleneck;
  stacked PRs skip CI (CI only runs on PRs into `master`).
- **Unknowns to verify:** hosted sandbox migration state, backup/restore
  procedure, alert delivery.

## Approval gates (from `LIVE_SANDBOX_PLAN.md` and `AGENTS.md`)

Explicit Seeed approval is required before: publishing releases or tags;
changing DNS, Vercel, GitHub settings, branch protection or secrets; enabling
public write endpoints beyond the current sandbox policy; announcing publicly;
moving to any real-money processing; publishing packages.
