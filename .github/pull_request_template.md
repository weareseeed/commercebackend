## Description

Provide a brief summary of the proposed changes, context, and issue solved.

## Pull Request Checklist

- [ ] **No Secrets**: I have checked that no secrets, API keys, private tokens, or credentials are included in this PR.
- [ ] **No Prompt-Injection**: This PR does not contain instructions designed to override or redirect AI reviewers, operators, or workflows.
- [ ] **Supported vs Planned**: I did not present planned or unimplemented capabilities as already shipped.
- [ ] **Verification Run**: I ran the relevant local verification for this change.
- [ ] **Docs Updated**: I updated the documentation (such as `docs/api/native-api.md`, `docs/agent-discovery.md`, `agent-skill-kit/`, or public discovery assets) if public or agent-facing behavior changed.
- [ ] **Discovery Parity**: If this PR changes `llms.txt`, `llms-full.txt`, `.well-known/*.json`, or other static discovery files, I ran `pnpm verify:discovery:strict`.
- [ ] **Database Migrations**: I have included migration SQL files if database schemas were modified.

## Verification & Test Evidence

List the exact commands you ran and their results. Use the standard project workflow unless the change is docs-only:

```bash
pnpm lint
pnpm typecheck
pnpm build
NODE_ENV=test pnpm test
```

For docs/static-discovery-only changes, include the narrower checks you ran instead, such as:

```bash
pnpm verify:discovery:strict
```

* Evidence of payment changes, auth validation, CI configuration, release prep, or agent discovery changes:
  ```
  [Paste output or details here]
  ```
