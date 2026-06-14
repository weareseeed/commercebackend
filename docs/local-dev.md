# Local Development Guide

CommerceBackend is an open-source, agent-first commerce backend owned and maintained by Seeed LLC. This guide covers the current local workflow for the v0.2 line.

## Prerequisites

- Node.js 22 or newer
- pnpm 11 or newer
- Docker Desktop or Docker Engine
- A local `.env` file based on `.env.example` or `.env.sandbox.example`

## Fastest verification path

Use this path when you want the quickest local signal before making changes:

```bash
pnpm install
cp .env.example .env
pnpm lint
pnpm typecheck
pnpm build
NODE_ENV=test pnpm test
```

Use `NODE_ENV=test pnpm test` so the test suite runs with the expected mocked test configuration instead of production-style Stripe/database validation.

## Sandbox workflow

Use this path when you want a deterministic local API, Prisma-managed PostgreSQL state, seeded fixtures, and the sandbox smoke tools.

### 1. Install dependencies

```bash
pnpm install
```

### 2. Create the sandbox environment file

```bash
cp .env.sandbox.example .env
```

### 3. Start PostgreSQL

```bash
docker compose -f infra/docker-compose.yml up -d
```

### 4. Apply migrations and seed data

```bash
pnpm db:migrate
pnpm db:seed
```

### 5. Start the API

```bash
pnpm dev
```

The API serves locally at `http://localhost:4000` by default.

### 6. Reset and smoke-test the sandbox

In another shell, run:

```bash
pnpm sandbox:reset
pnpm sandbox:smoke
```

### 7. Run the buyer walkthrough example

After the API is reachable at `http://localhost:4000`, run:

```bash
node examples/agent-buyer-flow/buyer-offer-flow.mjs
```

## Standard workspace commands

```bash
pnpm lint
pnpm typecheck
pnpm build
NODE_ENV=test pnpm test
pnpm selftest:mock
pnpm verify:discovery
```

## Temporary Vitest security guidance

GitHub Dependabot currently reports `GHSA-5xrq-8626-4rwp` / `CVE-2026-47429` against the Vitest major pinned in this workspace. The repository's standard verification commands use `vitest run`, which does not require exposing the Vitest UI API.

Until the tracked Vitest 4 compatibility migration is complete, do not run Vitest UI or Browser Mode for this repo on a shared or network-exposed host, especially on Windows. If local UI inspection is ever necessary, keep it bound to localhost and treat it as a privileged debugging surface.

## Discovery asset verification

Use the discovery verifier when you change agent-facing metadata or want to confirm the local/public discovery surfaces are aligned.

```bash
pnpm verify:discovery
pnpm verify:discovery:public
pnpm verify:discovery:strict
```

`pnpm verify:discovery:strict` checks both local parity and public production parity for:

- `llms.txt`
- `llms-full.txt`
- `/.well-known/commercebackend.json`
- `/.well-known/agents.json`

When strict parity fails, the verifier reports the first differing text line or the JSON fields that drifted so operators can confirm whether the repository or the public deployment is stale.

---

CommerceBackend is owned and maintained by Seeed LLC.

Copyright © 2026 Seeed LLC. Licensed under the Apache License 2.0.
