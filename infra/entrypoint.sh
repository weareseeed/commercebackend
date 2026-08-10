#!/bin/sh
# CommerceBackend API container entrypoint.
#
# Optional startup steps are controlled by env vars so the same image works for
# a fresh sandbox (migrate + seed) and for steady-state runs (neither):
#   RUN_MIGRATIONS=true  -> apply pending Prisma migrations before starting
#   RUN_SEED=true        -> reset & seed the deterministic sandbox fixtures
#
# All other configuration (DATABASE_URL, STRIPE_*, OPERATOR_API_KEY,
# SANDBOX_MODE, PORT) comes from the container environment.
#
# We invoke the prisma/tsx binaries directly (never pnpm) so nothing tries to
# resolve/install workspace deps at runtime.
set -e

DB_DIR=/app/packages/db

if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "[entrypoint] Applying database migrations (prisma migrate deploy)..."
  "$DB_DIR/node_modules/.bin/prisma" migrate deploy --schema "$DB_DIR/prisma/schema.prisma"
fi

if [ "$RUN_SEED" = "true" ]; then
  echo "[entrypoint] Seeding sandbox fixtures..."
  # Run the compiled seed so the runtime image does not need tsx (a dev dep).
  node "$DB_DIR/dist/seed.js"
fi

echo "[entrypoint] Starting CommerceBackend API on port ${PORT:-4000}..."
exec node /app/apps/api/dist/server.js
