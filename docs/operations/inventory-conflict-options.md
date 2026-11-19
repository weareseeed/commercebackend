# `payment_inventory_conflict`: decision options

Status: **decision needed from the maintainers.** This is a `[HUMAN-LED]`
money-path item; see `docs/weekly-roadmap.md` and
`docs/operations/incident-runbook.md` section 2.

## The problem

If a sale drains inventory between checkout-session creation and the Stripe
webhook, `OrdersService.handleSuccessfulPayment` sets the intent to
`payment_inventory_conflict`, cancels the offer, creates no order, and leaves
the captured payment unrefunded. Today this is test-mode only, so no real money
is at stake, but the behavior must be settled before any real-money step.
Detection is also manual: the state is not written to `CriticalEvent`.

## Options

| Option | How | Pros | Cons |
| --- | --- | --- | --- |
| **A. Auto-refund** | On conflict, call Stripe Refunds for the payment intent with an idempotency key | Buyer is made whole fast; no human in the loop | New money-moving code path that runs unattended; needs refund states, partial-failure handling, Stripe permissions, and accounting; a bug refunds wrongly |
| **B. Manual review queue** | Record the conflict as a critical event, list it in metrics and the dashboard, operator refunds in the Stripe Dashboard | No new money code; fully auditable; ships quickly | Buyer waits on a human; operator toil if conflicts are frequent |
| **C. Prevent the conflict** | Reserve (hold) inventory when the Stripe session is created, with a TTL | Removes most conflicts at the source | Adds hold/expiry complexity and stale-hold risk; does not remove the need for A or B |
| **D. Operator-triggered refund** | B, plus an operator-only endpoint that issues the refund with an idempotency key and a ledger event | One click, still human-approved, auditable | Still a refund code path, but it never runs unattended |

## Recommendation

Do it in stages, each reviewable on its own:

1. **Now (B):** write `PAYMENT_INVENTORY_CONFLICT` to `CriticalEvent`, count it
   in `GET /v1/operator/metrics`, show it on the dashboard, and update the
   runbook. This moves no money.
2. **Next (C, optional):** add short inventory holds if conflicts turn out to
   be frequent in the sandbox.
3. **Before any real-money processing (D):** add an operator-only refund
   endpoint with idempotency and ledger events, tested against Stripe test mode.
4. **Not recommended:** unattended auto-refund (A) until there is real volume,
   Stripe Refund permissions are reviewed, and the owners have signed off.

## Decisions needed

- Confirm stage 1 (detection and queue) as the first deliverable.
- Confirm that refunds stay human-triggered until real money is approved.
- Name who is paged for this event (see the runbook's escalation section).
