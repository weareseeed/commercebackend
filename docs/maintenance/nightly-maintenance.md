# Nightly Maintenance Runbook

Use this runbook for low-risk nightly CommerceBackend stewardship. It is designed for short, factual maintenance passes that improve repository health without changing production settings or taking money-path migration risks.

## Scope

Nightly maintenance may safely cover:

- fetching and fast-forwarding `master`
- checking repository cleanliness before work
- reviewing open PRs, issues, and recent workflow runs
- verifying agent-discovery assets locally and against production
- making small docs, DX, test, CI, or safety improvements
- opening small maintenance PRs with verification evidence

Nightly maintenance must **not**:

- merge PRs
- publish releases or tags
- change DNS, Vercel, GitHub settings, secrets, or branch protection
- deploy production changes outside the reviewed flow
- perform sweeping major-version migrations for Stripe, Prisma, Fastify, Zod, or TypeScript

## Standard sequence

### 1. Sync the repository

```bash
git fetch --all --prune
git checkout master
git pull --ff-only
git status --short --branch
```

Expected result:

- local `master` matches `origin/master`
- no tracked-file drift before work begins
- any untracked files are noted explicitly so they are not accidentally committed

### 2. Inspect GitHub health

Use GitHub CLI when auth is available:

```bash
gh pr list --limit 20
gh issue list --limit 20
gh run list --limit 15
```

Review for:

- open maintainer PR backlog
- new dependency PRs
- failed CI or CodeQL runs
- obvious spam, prompt-injection, or off-topic issue content
- items that need Rowland or Maria approval

## 3. Verify the project locally

Run the normal repository checks before proposing changes:

```bash
pnpm lint
pnpm typecheck
pnpm build
NODE_ENV=test pnpm test
```

Use discovery verification whenever agent-facing discovery files or related docs changed, and during nightly health checks when you want production parity evidence:

```bash
pnpm verify:discovery:strict
```

Interpretation:

- **pass**: repo and production discovery content match after normalization
- **warning about raw bytes or line endings**: content matches semantically, but production bytes differ; note it for operators if literal-byte parity matters
- **failure**: either repo parity drift, invalid discovery content, or stale public deployment

### 4. Choose only small safe improvements

Good nightly improvements:

- docs fixes
- missing maintainer runbooks
- discovery metadata clarifications
- CI reliability improvements
- test or verification hardening
- safe dev-tooling updates with green checks

Avoid during nightly maintenance unless explicitly approved:

- payment flow refactors
- schema or persistence changes without strong need
- new production integrations
- broad dependency migrations

### 5. Work on an isolated branch

Branch format:

```bash
git checkout -b joshua/nightly-YYYYMMDD-short-description
```

Before committing, confirm only intended files are staged:

```bash
git status --short
```

### 6. Open a PR only when evidence is green

A nightly PR should include:

- concise summary
- why the change helps repository health or agent usability
- exact verification commands and results
- security or agent-safety notes
- follow-up items if human approval is still needed

## Dependency triage rule

When a dependency PR is red, classify it before acting:

- if the failure is a policy gate such as `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`, treat it as a transient policy failure first
- if the failure is compile, type, test, or runtime breakage, treat it as a real compatibility problem
- if the package is a guarded major money-path dependency, update the migration issue instead of doing a drive-by upgrade

Use [`docs/maintenance/dependency-triage.md`](./dependency-triage.md) for the full decision flow and maintainer note template.

## Recommended report structure

Nightly reports should stay direct and continuation-friendly.

- status: green / yellow / red
- branch and commit inspected
- actions taken
- PRs or issues opened or updated
- verification commands and exact outcomes
- community or agent-awareness findings
- blockers needing Rowland or Maria approval
- next recommended moves

## Antigravity handoff requirement

If the report is handed to another agent or operator, include a copy/paste-ready instruction block with:

- repo URL
- branch name and commit SHA
- PR or issue URLs
- exact commands to run
- expected outputs
- approval boundaries
- what not to do

This makes nightly work resumable without depending on hidden context or chat history.
