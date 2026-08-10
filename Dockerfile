# CommerceBackend API — production container image.
#
# Multi-stage build for the pnpm monorepo. The builder installs the full
# workspace, generates the Prisma client, and compiles every workspace to
# dist/. The runner carries the built app plus its node_modules and starts the
# Fastify API (apps/api/dist/server.js).
#
# Build from the repo root:
#   docker build -t commercebackend-api .
#
# The image is host-agnostic and runs on Cloud Run, Railway, Fly, or any
# container platform. See docs/deploy/README.md.

# ---- Stage 1: builder -------------------------------------------------------
FROM node:22-bookworm-slim AS builder

# OpenSSL is required by Prisma's query engine at generate/runtime.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Enable the pnpm version we validated locally against the committed lockfile.
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

WORKDIR /app

# Copy the whole workspace. .dockerignore keeps node_modules/dist/.env out.
COPY . .

# Prisma's getConfig resolves env("DATABASE_URL") even for `generate`; provide a
# throwaway build-time value. No database connection is made during the build.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"

RUN pnpm install --frozen-lockfile

# Build only what the API image needs, each via `pnpm exec` (direct tsc/prisma
# binaries) instead of the package `build` scripts. Two reasons:
#   1. db's build script wraps prisma+tsc in `bash -lc`; Debian's login shell
#      resets PATH and drops the pnpm-injected node_modules/.bin (prisma).
#   2. `pnpm -r build` also runs the ROOT package's build (itself `pnpm -r
#      build`), recursing past any filter.
# The landing site is intentionally excluded — it deploys separately to Vercel.
# Order respects dependencies so apps/api resolves the workspace .d.ts outputs.
RUN cd packages/db && pnpm exec prisma generate && pnpm exec tsc
RUN pnpm --filter @commercebackend/schemas exec tsc
RUN pnpm --filter @commercebackend/payments-stripe exec tsc
RUN pnpm --filter @commercebackend/protocol-acp exec tsc
RUN pnpm --filter @commercebackend/protocol-ucp exec tsc
RUN pnpm --filter @commercebackend/api exec tsc

# Prune to production dependencies *in the builder* so the runner's COPY only
# ever receives prod modules (dropping typescript, tsx, vitest, eslint, vite).
# Pruning after the COPY would not shrink the image — the fat layer would remain
# underneath. prisma is a prod dep of @commercebackend/db so `migrate deploy`
# still works; the seed runs from compiled dist/seed.js (no tsx needed).
# CI=true lets pnpm remove the dev-dep modules dir non-interactively.
RUN CI=true pnpm install --prod --frozen-lockfile --ignore-scripts \
  && cd packages/db && pnpm exec prisma generate

# ---- Stage 2: runner --------------------------------------------------------
FROM node:22-bookworm-slim AS runner

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# No pnpm needed at runtime: the entrypoint calls prisma/node binaries directly.
WORKDIR /app
ENV NODE_ENV=production

# Carry the pruned, production-only workspace (dist/ + generated Prisma client +
# schema + prod node_modules). Own it as `node` so runtime steps can write.
COPY --chown=node:node --from=builder /app /app

COPY infra/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# The WORKDIR itself is root-owned; make it node-owned so the running process
# (cwd = /app) can create runtime files such as the sandbox reset credentials.
RUN chown node:node /app

# Run as the unprivileged user shipped with the node image.
USER node

# Cloud Run/Railway inject PORT; default to 4000 for local runs.
ENV PORT=4000
EXPOSE 4000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
