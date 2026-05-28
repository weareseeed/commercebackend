# Draft PR: launch public sandbox and website updates

## Proposed branch
`feat/public-sandbox-launch`

## Proposed commit title
`feat: launch CommerceBackend public sandbox surfaces`

## Summary
- add the public sandbox routes, deterministic fixtures, reset tooling, and smoke scripts
- add durable sandbox setup and announcement docs
- update the landing page to reflect the hosted sandbox and current v0.2.0 release surface
- add launch-ready visual assets for content and social distribution

## Included repo surfaces
- API sandbox routes and supporting DB fixtures
- sandbox docs and environment examples
- landing page updates for sandbox quickstart and llms-full discovery
- launch copy and graphics under `docs/launch/`

## Test plan
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `NODE_ENV=test pnpm test`
- [x] hosted `/health`
- [x] hosted `/ready`
- [x] hosted `/v1/public/listings`
- [x] hosted `/v1/public/search`
- [x] hosted `/v1/sandbox/fixtures`
- [x] hosted `/v1/sandbox/reset`
- [x] checkout intent creation
- [x] operator simulation completion
- [x] Stripe webhook delivery verified in Stripe test mode
- [x] end-to-end Stripe test checkout verified in Stripe test mode

## Approval and launch guardrails
- keep all announcement copy scoped to Stripe test mode only
- do not claim Stripe Connect seller payouts, refunds, disputes, tax calculation, or production commerce readiness
- public posting still requires Rowland or Maria approval

## Reviewer notes
- review the landing page copy for version framing: `v0.2.0 + Public Sandbox Live`
- verify that the sandbox guide remains accurate if any env var names or endpoint paths change before merge
- if this PR is split, keep website/docs and runtime changes in linked PRs so launch copy does not outrun the live sandbox
