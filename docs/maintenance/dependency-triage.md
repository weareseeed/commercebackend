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
2. Enumerate open Dependabot alerts so you do not confuse alert backlog with CI breakage.
3. Read failed logs before assuming the repository is broken.
4. Classify each failure or alert as **transient policy** or **real compatibility**.
5. For transient policy failures, leave a factual maintainer note and retry after the cutoff.
6. For real compatibility failures, decide between:
   - a small fix PR;
   - a migration issue;
   - closing/superseding the dependency PR.

### GitHub CLI commands for alert intake

Use repository-owned evidence instead of guessing from the GitHub UI:

```bash
gh pr list --repo weareseeed/commercebackend --search "dependabot" --limit 20

gh api repos/weareseeed/commercebackend/dependabot/alerts?state=open \
  -H 'Accept: application/vnd.github+json'

# Optional summary query when you want only the current open count and package names.
gh api graphql -f query='query {
  repository(owner:"weareseeed", name:"commercebackend") {
    vulnerabilityAlerts(first: 20, states: OPEN) {
      totalCount
      nodes {
        number
        dependencyScope
        securityVulnerability {
          package { name ecosystem }
          severity
          firstPatchedVersion { identifier }
        }
      }
    }
  }
}'
```

### Scope notes for alert classification

Before escalating an alert, record whether it is:

- **production-path** or **development-only**;
- **cross-platform** or **Windows-only/local-dev-server-only**;
- already covered by an open Dependabot PR;
- blocked by a guarded migration boundary (Stripe, Prisma, Fastify, Zod, TypeScript major upgrades).

Development-only alerts still matter, but they should be described accurately. Do not present a Windows-only local dev-server advisory as a confirmed production checkout risk.

## 3. Maintainer note template for transient policy failures

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
