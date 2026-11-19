# Change: Publish agent-facing packages `[HUMAN-LED]`

## Why
Agent-framework builders (the target user) cannot install `@commercebackend/sdk-js`
or `@commercebackend/mcp`; both are `private`. Publishing is an external,
hard-to-reverse action that needs Seeed approval.

## What Changes
- Decide the package scope and naming, then remove `private` for the SDK and MCP
  packages, add `files`, license, repository, and README metadata.
- Add an `npx`-style MCP quickstart that points at the hosted sandbox.
- Add a release workflow (manual trigger) for publishing.

## Impact
- Affected specs: `protocols-and-mcp`.
- Approval: package publishing, npm org ownership, and any `.github` workflow
  change need Seeed approval.
