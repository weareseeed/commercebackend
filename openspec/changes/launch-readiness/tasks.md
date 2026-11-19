## 1. Docs and process (no extra approval beyond review)
- [ ] 1.1 Add `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md` (weekly backlog 25)
- [ ] 1.2 Draft v0.3 release notes (do not publish) (backlog 28)
- [ ] 1.3 Add agent evaluation fixtures: discovery, approval, failure handling (backlog 26)
- [ ] 1.4 MCP parity: negotiation tools and reputation (backlog 20, 22, 23)

## 2. Verification (needs network access to production)
- [ ] 2.1 Run `pnpm verify:discovery:strict` against production after deploy
- [ ] 2.2 Confirm migration `20261119000000_policy_decision_reasons` applied on the hosted sandbox
- [ ] 2.3 Document and test backup/restore and migration rollback (gap in `docs/deploy`)

## 3. Decisions (maintainers)
- [ ] 3.1 Pick the Launch 1 success metric and target (see `sandbox-success-metric`)
- [ ] 3.2 Name the on-call owner and alert channel for critical events
- [ ] 3.3 Scope and owner of a threat model / security review
- [ ] 3.4 Channels and timing for announcement

## 4. Release `[HUMAN-LED]`
- [ ] 4.1 Claims review against `docs/launch/public-announcement-copy.md` "What not to claim"
- [ ] 4.2 Seeed go/no-go (Rowland Saer or Maria King)
- [ ] 4.3 Tag v0.3.0 and publish release notes
- [ ] 4.4 Announce
