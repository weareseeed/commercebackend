## Decisions
- Enforcement never rejects; it routes to `human_approval_required`.
- Expiry is evaluated lazily on read/approve plus an operator-triggered or
  scheduled sweep; approving an expired intent fails with `APPROVAL_EXPIRED`.
- Event table is source of truth going forward; the derived ledger remains a
  fallback for intents created before the migration.

## Open questions
- Default approval window (proposed 24h) and whether offer checkouts differ.
- Per-approval attribution (one operator key today).
- Which notification channel operators watch.
