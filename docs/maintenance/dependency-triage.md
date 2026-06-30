# Dependency, Dependabot, and Security Alert Triage

Use this guide when a dependency PR, GitHub security alert, CI run, or nightly maintenance pass reports a package update problem.

## 1. Split failures into two buckets

### A. Transient policy failures

These are usually **not application compatibility bugs**. They often mean the lockfile references a version that is too new for the active supply-chain policy.

Common signal:

```text
ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION
```

Typical meaning:

- the updated package was published within the repository's minimum release age window;
- CI rejected the lockfile on policy grounds;
- the correct action is usually to **wait until the package ages out of the policy window**, then update or re-run the PR.

Operator response:

1. Read the failed CI log and confirm the package/version named in the error.
2. Confirm the failure is policy-only, not a compile/test/runtime failure.
3. Do **not** bypass the policy just to make the PR green.
4. After the age window passes, update the branch and re-run checks.
5. If the package remains blocked after the window, investigate registry metadata or lockfile state.

### B. Real compatibility failures

These usually require code changes, coordinated upgrades, or a migration plan.

Examples:

- typecheck failures after a dependency bump;
- test failures caused by API changes;
- build failures from framework/plugin version mismatches;
- runtime/package-manager incompatibilities that persist after the release-age window passes.

Operator response:

1. Inspect the exact failing command.
2. Check whether the package belongs to a guarded money-path stack: Stripe, Prisma, Fastify, Zod, or TypeScript.
3. If it is a guarded major upgrade, create or update a migration issue instead of merging a drive-by PR.
4. If it is a small safe upgrade, fix code/tests in a dedicated PR with verification evidence.

## 2. Recommended nightly triage flow

1. Check open dependency PRs.
2. Check open GitHub security alerts and note whether they affect runtime code, local-only tooling, CI-only tooling, or a disabled workflow surface.
3. Read failed logs before assuming the repository is broken.
4. Classify each failure as **transient policy** or **real compatibility**.
5. For transient policy failures, leave a factual maintainer note and retry after the cutoff.
6. For real compatibility failures, decide between:
   - a small fix PR;
   - a migration issue;
   - closing/superseding the dependency PR.

## 3. Security alert classification

Treat every GitHub security alert as real input, but classify the exposure before escalating it as an application compromise.

### A. Runtime or money-path exposure

Escalate immediately when the vulnerable package is in:

- the Fastify API runtime;
- Stripe, Prisma, request validation, auth, or persistence paths;
- production deployment assets served to the public;
- webhook handling, checkout, or inventory integrity code.

Operator response:

1. Confirm the installed version and dependency path.
2. Check whether a safe patched version exists.
3. If the package is part of a guarded money-path stack, open or update a migration issue instead of landing a drive-by bump.
4. If the patch is a safe non-major update, prepare a focused PR with verification evidence.

### B. Dev-tooling or local-only exposure

Some alerts apply only when a developer starts a local server or enables an optional UI that is not part of approved workflows.

Examples in this repository can include:

- Vite dev-server advisories affecting `apps/landing` local development;
- esbuild development-server advisories;
- Vitest UI/API exposure advisories when the UI server is not used in CI or approved local flows;
- transitive lint/build-chain issues that do not ship in the API runtime.

Operator response:

1. Confirm the exact triggering condition from the advisory.
2. Verify whether CommerceBackend actually enables that surface in documented workflows.
3. Record the current boundary in plain language, for example:
   - "affects local dev server only"
   - "requires Windows path handling"
   - "requires Vitest UI/API server, which is not an approved workflow here"
4. Still track the alert to resolution through a safe dependency update or migration issue.
5. Do not overstate the impact as a production API compromise when the exposed surface is not part of the supported runtime.

### C. Current repository-specific interpretation rules

When triaging current open CommerceBackend alerts, apply these guardrails:

- Treat Vite and esbuild alerts as **build/dev-surface findings first**, unless evidence shows the vulnerable path is exposed in production.
- Treat Vitest alerts through the repository's `pnpm verify:vitest-guard` boundary: approved workflows use `vitest run`, not Vitest UI, Browser Mode, or a network-exposed Vitest API server.
- Treat Windows-only path-handling advisories as real but scope-limited when maintainers are not serving those dev surfaces on Windows.
- Treat transitive minimatch/eslint-chain alerts as tooling risk until proven to affect runtime request handling.

## 4. Maintainer note template for transient policy failures

```text
CI failed on a supply-chain policy gate, not on application compatibility.

Observed failure:
- ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION
- package: <name>@<version>

Action:
- do not merge or bypass policy yet
- update/rebase this PR after the minimum release age window passes
- re-run CI and only investigate further if the failure persists
```

## 5. Maintainer note template for scoped security alerts

```text
Reviewed the alert and classified the current exposure scope before escalating it.

Observed alert:
- package: <name>@<version>
- advisory: <summary>

Current CommerceBackend scope:
- dependency path: <direct/transitive path>
- surface: <runtime API | production asset | local dev server | CI-only tooling>
- condition required: <for example, Windows path handling or Vitest UI server>

Action:
- keep the alert tracked
- do not describe it as a production compromise unless the vulnerable surface is actually enabled
- update safely through a patch/minor PR or a dedicated migration issue
```

## 6. What not to do

- Do not treat every red Dependabot PR as a broken application build.
- Do not weaken supply-chain policy just to clear a transient failure.
- Do not describe every tooling advisory as a live production compromise without checking the actual exposed surface.
- Do not merge major money-path dependency upgrades without a dedicated migration plan.
- Do not claim a dependency update is safe unless CI or local verification actually passed.
