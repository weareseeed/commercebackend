# CommerceBackend Sandbox Announcement Draft

Status: draft only
Owner: Seeed LLC
Approval required before any public posting: yes

## Primary announcement

CommerceBackend now has a public sandbox.

Developers and agent builders can test the full agent-commerce loop against a hosted environment with deterministic demo data, public discovery endpoints, Stripe test-mode checkout, and operator-controlled reset tooling.

What you can do in the sandbox:
- browse public listings without an API key
- inspect sandbox fixtures and test agents
- create checkout intents against seeded listings
- exercise approval-required checkout flows
- validate webhook-backed Stripe test checkout behavior
- reset the environment back to a known demo state

Start here:
- Sandbox guide: https://www.commercebackend.com/docs/sandbox/
- Repository: https://github.com/weareseeed/commercebackend
- Full LLM context: https://www.commercebackend.com/llms-full.txt

CommerceBackend is owned and maintained by Seeed LLC.

## Short version

CommerceBackend now has a public sandbox.

You can test the agent-commerce loop in a hosted environment with deterministic fixtures, public listing discovery, Stripe test-mode checkout, and reset tooling for repeatable demos.

Start here: https://www.commercebackend.com/docs/sandbox/

## X / LinkedIn version

CommerceBackend now has a public sandbox.

You can test a hosted agent-commerce flow with deterministic demo data, public listing discovery, Stripe test-mode checkout, and reset tooling for repeatable demos.

Docs: https://www.commercebackend.com/docs/sandbox/
Repo: https://github.com/weareseeed/commercebackend

CommerceBackend is owned and maintained by Seeed LLC.

## Technical audience version

We shipped a hosted CommerceBackend sandbox for testing the agent-commerce loop end to end.

The sandbox includes:
- deterministic seeded agents, listings, policies, offers, and checkout fixtures
- public read endpoints under `/v1/public/*`
- operator reset controls for restoring known demo state
- Stripe test-mode checkout and webhook-backed payment reconciliation
- durable setup and deployment docs for local and hosted use

If you are building buyer agents, seller agents, or agent-native marketplace workflows, the sandbox is the fastest way to inspect the API behavior before wiring your own environment.

Docs: https://www.commercebackend.com/docs/sandbox/
Repo: https://github.com/weareseeed/commercebackend

## What not to claim

Do not claim any of the following in public announcement copy unless separately approved and verified:
- production-ready Stripe Connect seller payouts
- refunds or disputes
- tax calculation
- multi-seller carts
- live-money checkout
- general availability for production commerce

## Suggested CTA options

- Try the sandbox
- Read the sandbox guide
- Inspect the API and fixtures
- Build a buyer or seller agent against the hosted demo

## Approval checklist

Before public posting, confirm:
- sandbox docs URL is live and accurate
- hosted sandbox remains reachable
- no secrets appear in any screenshots, code snippets, or examples
- copy does not imply unsupported capabilities
- Rowland or Maria approved the final posting channel and wording
