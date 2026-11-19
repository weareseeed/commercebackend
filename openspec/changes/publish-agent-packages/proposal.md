# Change: Publish agent-facing packages `[HUMAN-LED]`

## Why
Agent-framework builders (the target user) cannot install `@commercebackend/sdk-js`
or `@commercebackend/mcp`; both are `private`. Publishing is an external,
hard-to-reverse action that needs Seeed approval.

## Prepared already (no publish)
- Publish metadata is in place for both packages (`description`, `keywords`,
  `files`, `publishConfig.access`, `engines.node >=22`), `packages/sdk-js/README.md`
  exists, and `npm pack --dry-run` produces a clean tarball for the SDK. Both
  packages are still `private`; nothing has been published.

## Blocker to resolve first
`@commercebackend/mcp` depends on `@commercebackend/schemas` (`workspace:*`),
which is also `private`. Publishing the MCP package therefore requires either
publishing `@commercebackend/schemas` too, or bundling the schemas it uses. The
SDK has no workspace dependencies. The SDK also does not wrap offers,
approvals, or operator routes; decide whether that is acceptable for a first
release.

## What Changes
- Decide the package scope and naming, then remove `private` for the SDK and MCP
  packages, add `files`, license, repository, and README metadata.
- Add an `npx`-style MCP quickstart that points at the hosted sandbox.
- Add a release workflow (manual trigger) for publishing.

## Impact
- Affected specs: `protocols-and-mcp`.
- Approval: package publishing, npm org ownership, and any `.github` workflow
  change need Seeed approval.
