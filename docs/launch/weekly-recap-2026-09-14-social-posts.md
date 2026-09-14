# CommerceBackend Weekly Recap — Social Drafts (2026-09-14)

Status: draft only
Approval required before posting: yes
Owner: Seeed LLC
Covers: PR #155, #157, #158, #156, #160 (per-record API key salt, real ACP
adapter, real UCP adapter, read-only operator dashboard, Square catalog
connector spike)

Blog post (published on the site once this branch merges):
https://www.commercebackend.com/blog/agent-protocols-and-catalog-connectors/

## LinkedIn / long-form version

Two weeks of the CommerceBackend Friday backlog routine, six merged PRs:

- **Per-record API key salt** — every new agent key now gets its own scrypt
  salt and a public lookup id, instead of one shared salt for all keys.
  Keys issued before this change keep working unchanged.
- **Real ACP adapter** — a scoped, honestly-labeled subset of OpenAI/Stripe's
  Agentic Commerce Protocol, mapped onto our existing Stripe-hosted-checkout
  flow. Not a claim of full/certified ACP spec compliance.
- **Real UCP adapter** — our own vendor-neutral mapping layer for agent
  frameworks (products, orders, full status mapping). Not a claim of
  conformance to any external "UCP" standard — it's ours.
- **Read-only operator dashboard** — operator-key-gated visibility into
  agents, orders, and sync activity. No destructive controls.
- **Square catalog connector spike** — a canonical imported-catalog model and
  connector abstraction, proven against a static Square-shaped fixture (no
  live Square API, no credentials in the repo). Imports become ordinary
  listings, keyed so re-syncing updates instead of duplicating. Every sync
  is logged with per-item failure detail. Meant to be reused by future
  Shopify/BigCommerce/WooCommerce connectors — none of those exist yet.

None of this touches the money path: Stripe test-mode checkout and
webhook-backed order reconciliation work exactly as before.

Full write-up: https://www.commercebackend.com/blog/agent-protocols-and-catalog-connectors/
Repo: https://github.com/weareseeed/commercebackend

CommerceBackend is owned and maintained by Seeed LLC.

## X / short version

Six PRs shipped in the last two weeks: per-record API key salting, real
ACP and UCP protocol adapters, a read-only operator dashboard, and a
fixture-driven Square catalog connector spike (read-only, no live Square
API, no credentials in the repo).

Full recap: https://www.commercebackend.com/blog/agent-protocols-and-catalog-connectors/

## What not to claim

- Full or certified ACP spec compliance
- External "UCP" standard conformance
- A live/automatic Square (or any) merchant sync — this is an
  operator-triggered, fixture-driven spike only
- Shopify, BigCommerce, or WooCommerce connectors (not built yet)
- Any change to Stripe Connect payouts, refunds, disputes, or tax

## Suggested image pairing

`docs/launch/assets/commercebackend-protocols-square-recap.svg`
(also served at `/blog/commercebackend-protocols-square-recap.svg` on the site)

## Approval checklist

Before public posting, confirm:
- the blog post is live at the URL above in production
- no secrets appear in any screenshots, code snippets, or examples
- copy does not imply unsupported capabilities
- Rowland or Maria approved the final posting channel and wording
