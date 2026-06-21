# Dependency and Dependabot Triage

Use this guide when a dependency PR, CI run, or nightly maintenance pass reports a package update problem.

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
2. Read failed logs before assuming the repository is broken.
3. Classify each failure as **transient policy** or **real compatibility**.
4. For transient policy failures, leave a factual maintainer note and retry after the cutoff.
5. For real compatibility failures, decide between:
   - a small fix PR;
   - a migration issue;
   - closing/superseding the dependency PR.

## 3. Classify the execution surface before escalating

Not every open advisory has the same operational importance. After you confirm the package and version, classify **where that code actually runs** in this repository:

### A. Production runtime path

Examples:

- API request handling dependencies in `apps/api`
- auth, checkout, webhook, order, and persistence code paths
- packages loaded by the shipped backend server in normal operation

Default response:

- treat as the highest-priority bucket;
- verify whether the vulnerable package is reachable in deployed API/runtime code;
- open a fix PR or a migration issue immediately.

### B. Development-only tooling path

Examples:

- Vite used for the landing-site build/dev preview
- esbuild used underneath local build tooling
- Vitest and related UI/browser/server features
- YAML/glob parsing packages only used by local or CI tooling

Default response:

- verify whether the advisory depends on a local dev server, Windows path behavior, browser UI mode, or network exposure that is **not** part of the supported CommerceBackend workflow;
- document the current guardrails before calling it a production security regression;
- still track and patch the dependency when a safe upgrade path exists.

### C. Condition-gated local-only exposure

Some alerts matter only when a maintainer opts into a risky mode. Typical examples:

- a dev server exposed with `--host` or equivalent network binding;
- Windows-only path traversal behavior;
- optional UI/browser tooling that the repository does not enable in CI or documented flows.

Default response:

1. record the trigger conditions explicitly;
2. confirm whether the repository currently enables those conditions;
3. add or verify guardrails (docs, CI checks, config bans) if the package cannot be upgraded immediately.

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

## 4. What not to do

- Do not treat every red Dependabot PR as a broken application build.
- Do not weaken supply-chain policy just to clear a transient failure.
- Do not merge major money-path dependency upgrades without a dedicated migration plan.
- Do not claim a dependency update is safe unless CI or local verification actually passed.
- Do not describe a dev-only or condition-gated advisory as a deployed API compromise unless you verified the vulnerable execution path is actually enabled here.
