# Backup, Restore, and Migration Rollback

Status: **procedure documented, not yet exercised.** Nobody has run the restore
drill below against the hosted sandbox. Do that before calling Launch 1 ready
(see [`docs/launch/launch-readiness-plan.md`](../launch/launch-readiness-plan.md))
and record the date and result at the bottom of this file.

PostgreSQL is the system of record (agents, listings, offers, checkout intents,
orders, critical events). Stripe holds payment truth. Restoring the database
without reconciling Stripe can leave payments with no order, so read the
reconciliation section.

## What to protect

| Data | Where | Backup |
| --- | --- | --- |
| Application state | Managed PostgreSQL (Cloud SQL, Neon, Supabase, or Railway PG per `docs/deploy/README.md`) | Provider automated backups, plus manual dumps before risky changes |
| Secrets | Host secret manager | Not in git. Record where each secret lives; rotate rather than restore |
| Code and migrations | Git (`packages/db/prisma/migrations`) | Git history |
| Payment events | Stripe | Stripe retains events; they can be re-sent from the Stripe Dashboard |

The hosted sandbox holds only fictional demo data, so its recovery target is
"back to a known state" and `POST /v1/sandbox/reset` (operator key) restores the
fixtures. A restore matters most for any environment that holds data you cannot
recreate.

## Backups

1. Turn on the database provider's automated backups, and point-in-time
   recovery if the plan offers it. Confirm the retention window in the provider's
   console; do not assume it.
2. Before every migration that changes the schema, take a manual logical dump:

   ```bash
   pg_dump --format=custom --no-owner --file=commercebackend-$(date +%Y%m%d-%H%M).dump "$DATABASE_URL"
   ```

   Store the file outside the database host, access-controlled. Dumps contain
   hashed API keys and customer data; treat them as sensitive.

## Migrations and rollback

Migrations are Prisma migrations applied with `prisma migrate deploy` (on boot
when `RUN_MIGRATIONS=true`). Prisma does not generate down migrations, so there is
no automatic rollback.

- Prefer **additive** migrations (new nullable or defaulted columns, new
  tables), which are safe to leave in place if the code is rolled back.
  Example: `20261119000000_policy_decision_reasons` adds one defaulted column.
- To roll back **code**, redeploy the previous image. Additive columns stay and
  are ignored by older code.
- To roll back a **destructive** migration, restore from the pre-migration dump
  or point-in-time backup, or write a reviewed forward migration. Do not edit
  applied migration files.
- Test every migration against a copy of production-shaped data first.

## Restore procedure

1. Stop writes: scale the API to zero or put it in maintenance so no orders are
   created mid-restore.
2. Restore into a **new** database first, not over the live one:

   ```bash
   createdb commercebackend_restore
   pg_restore --no-owner --dbname=commercebackend_restore commercebackend-<timestamp>.dump
   ```

   For managed point-in-time recovery, use the provider's "restore to new
   instance" flow.
3. Check row counts and recent records, and confirm the latest migration is
   present in `_prisma_migrations`.
4. Point `DATABASE_URL` at the restored database (update the secret, redeploy) and
   confirm `GET /health` and `GET /ready`.
5. Reconcile with Stripe (next section), then restore traffic.

## Reconcile with Stripe after a restore

Order creation is idempotent per checkout intent, so re-delivering webhooks is
safe.

1. Note the time of the last good backup.
2. In the Stripe Dashboard, find `checkout.session.completed` events after that
   time and resend them to the webhook endpoint.
3. Check `GET /v1/operator/metrics` for `PAYMENT_INVENTORY_CONFLICT` and
   `CHECKOUT_PERSISTENCE_FAILED` events, and follow
   [`incident-runbook.md`](incident-runbook.md) for each.
4. Do not issue refunds or create substitute orders without maintainer review;
   those are human-led.

## Restore drill (do this before launch)

1. Take a dump of the sandbox database.
2. Restore it into a throwaway database.
3. Run `pnpm sandbox:smoke` (or the deploy runbook's smoke test) against an API
   pointed at the restored copy.
4. Record the result below. Repeat after any major schema change.

| Date | Environment | Who | Result |
| --- | --- | --- | --- |
| _not yet run_ | | | |
