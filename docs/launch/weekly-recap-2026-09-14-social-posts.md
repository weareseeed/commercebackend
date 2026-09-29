# CommerceBackend Weekly Recap — Social Drafts (2026-09-14)

Status: draft only
Approval required before posting: yes
Owner: Seeed LLC
Covers: PR #155, #157, #158, #156, #160 (per-record API key salt, real ACP
adapter, real UCP adapter, read-only operator dashboard, Square catalog
connector spike)

Blog post (published on the site once this branch merges):
https://www.commercebackend.com/blog/agent-protocols-and-catalog-connectors/

Image: `docs/launch/assets/commercebackend-protocols-square-linkedin.png`
(1200×627, source SVG alongside it)

## LinkedIn post (final draft)

Most "agent commerce" demos stop at a shopping cart. Ours ships the full
loop — discovery to fulfillment — and says exactly where it stops.

In the last two weeks we merged six pull requests on CommerceBackend, our
open-source commerce backend for autonomous agents: per-record API key
salting, a real ACP adapter, a real UCP adapter, a read-only operator
dashboard, and a Square catalog connector spike.

The ACP adapter maps a scoped subset of OpenAI/Stripe's Agentic Commerce
Protocol onto our existing Stripe checkout flow. The UCP adapter is our own
vendor-neutral mapping layer — we're not claiming conformance to anyone
else's "UCP" standard.

The Square spike reads a static catalog fixture, maps it to a canonical
listing model, and logs every item that fails to import. No live Square API
call. No Square credentials anywhere in the repo.

154 tests pass across the monorepo. None of this touches production
credentials, the Stripe money path, or seller payouts.

→ Full recap: https://www.commercebackend.com/blog/agent-protocols-and-catalog-connectors/
→ Repo: https://github.com/weareseeed/commercebackend

If you're building agent frameworks against ACP or a similar checkout spec,
what would make an adapter actually useful to you — more spec coverage, or
more honesty about what's missing?

let's grow together

CommerceBackend is owned and maintained by Seeed LLC. Seeed LLC is unrelated
to Seeed Studio.

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

- LinkedIn (1200×627): `docs/launch/assets/commercebackend-protocols-square-linkedin.png`
- Square / blog (1080×1080): `docs/launch/assets/commercebackend-protocols-square-recap.svg`
  (also served at `/blog/commercebackend-protocols-square-recap.svg` on the site)

## Approval checklist

Before public posting, confirm:
- the blog post is live at the URL above in production
- no secrets appear in any screenshots, code snippets, or examples
- copy does not imply unsupported capabilities
- Rowland or Maria approved the final posting channel and wording
