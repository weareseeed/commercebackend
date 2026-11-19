# Deploying the CommerceBackend API (Hosted Sandbox)

This runbook takes the containerized API from a local image to a public
**test-mode** sandbox, per [`LIVE_SANDBOX_PLAN.md`](../../LIVE_SANDBOX_PLAN.md).

> **Approval gates (from the Live Sandbox Plan).** Get explicit Rowland or Maria
> approval before: DNS changes, exposing a public API under
> `commercebackend.com`, enabling public write endpoints, or moving off Stripe
> test mode. This runbook stops short of those; it prepares everything up to the
> point where those approvals are needed.

## What ships

- **API** → a container (this repo's [`Dockerfile`](../../Dockerfile)) on Cloud
  Run or Railway.
- **Database** → managed PostgreSQL (Cloud SQL, Neon, Supabase, or Railway PG).
- **Landing/docs** → unchanged; stays on Vercel (`apps/landing`).
- **Payments** → Stripe **test mode only**.

The API image is host-agnostic. It listens on `$PORT` (Cloud Run / Railway
inject it), runs as a non-root user, and applies migrations on boot when
`RUN_MIGRATIONS=true`.

## Required environment / secrets

Copy [`.env.hosted.example`](../../.env.hosted.example) into the host's secret
manager. A hosted public sandbox runs in **production mode** with real Stripe
**test** keys (the keyless local mock never activates in production):

| Var | Value |
| --- | --- |
| `DATABASE_URL` | managed Postgres connection string (`?sslmode=require`) |
| `NODE_ENV` | `production` |
| `SANDBOX_MODE` | `true` (keeps demo/public routes enabled in prod mode) |
| `STRIPE_SECRET_KEY` | real `sk_test_…` (live keys are rejected at boot) |
| `STRIPE_WEBHOOK_SECRET` | real `whsec_…` for the deployed webhook endpoint |
| `OPERATOR_API_KEY` | long random secret (`openssl rand -hex 32`) |
| `API_BASE_URL` | public URL, e.g. `https://api.demo.commercebackend.com` |
| `RUN_MIGRATIONS` | `true` |
| `RUN_SEED` | `true` on first deploy, then `false` |

`BYPASS_STRIPE_SIGNATURE` must never be set in production — the app refuses to
boot if it is.

## Verify locally first (prod-like)

```bash
docker build -t commercebackend-api:local .
# Bring up Postgres + API together. Use --build so compose does not reuse a
# stale image (it builds its own `infra-api` image, separate from any tag above).
OPERATOR_API_KEY=local_op_key docker compose -f infra/docker-compose.app.yml up --build -d

# In another shell:
OPERATOR_API_KEY=local_op_key API_BASE_URL=http://localhost:4000 node scripts/smoke-sandbox.mjs
```

Expected: `Sandbox smoke test passed.` (15 steps).

---

## Option A — Google Cloud Run (recommended for Seeed)

Fits Seeed's existing GCP footprint; managed Postgres via Cloud SQL.

```bash
PROJECT=<gcp-project>
REGION=us-east1
REPO=commercebackend
gcloud artifacts repositories create $REPO --repository-format=docker --location=$REGION 2>/dev/null || true

# Build & push (Cloud Build reads the repo Dockerfile)
IMAGE=$REGION-docker.pkg.dev/$PROJECT/$REPO/api:$(git rev-parse --short HEAD)
gcloud builds submit --tag $IMAGE

# Store secrets (once) in Secret Manager, then deploy referencing them
gcloud run deploy commercebackend-api \
  --image $IMAGE --region $REGION --platform managed \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,SANDBOX_MODE=true,RUN_MIGRATIONS=true,RUN_SEED=false,API_BASE_URL=https://api.demo.commercebackend.com \
  --set-secrets DATABASE_URL=cb-database-url:latest,STRIPE_SECRET_KEY=cb-stripe-secret:latest,STRIPE_WEBHOOK_SECRET=cb-stripe-webhook:latest,OPERATOR_API_KEY=cb-operator-key:latest \
  --add-cloudsql-instances $PROJECT:$REGION:<cloudsql-instance> \
  --min-instances 0 --max-instances 4 --port 4000
```

Notes:
- For Cloud SQL, use the socket path form of `DATABASE_URL` or the Cloud SQL
  connector; `--add-cloudsql-instances` mounts the socket.
- First deploy: set `RUN_SEED=true` once, then redeploy with `false`.
- Cloud Run sets `$PORT`; the server already binds `0.0.0.0:$PORT`.

## Option B — Railway (fastest)

```bash
railway init
railway add   # provision PostgreSQL plugin -> sets DATABASE_URL
# Railway auto-detects the Dockerfile. Set the remaining vars:
railway variables set NODE_ENV=production SANDBOX_MODE=true RUN_MIGRATIONS=true RUN_SEED=true \
  STRIPE_SECRET_KEY=sk_test_… STRIPE_WEBHOOK_SECRET=whsec_… \
  OPERATOR_API_KEY=$(openssl rand -hex 32) API_BASE_URL=https://<app>.up.railway.app
railway up
```

After the first successful boot, set `RUN_SEED=false` and redeploy.

---

## Stripe webhook wiring

1. In the Stripe **test** dashboard, add an endpoint:
   `https://<api-host>/v1/webhooks/stripe` for `checkout.session.completed` and
   `checkout.session.expired`.
2. Put its signing secret in `STRIPE_WEBHOOK_SECRET`.
3. The sandbox can also complete checkouts without Stripe via the operator
   endpoint `POST /v1/sandbox/checkout-intents/:id/simulate-complete`.

## Launch checklist (from LIVE_SANDBOX_PLAN.md)

- [ ] `pnpm build`, `pnpm lint`, `pnpm typecheck`, `NODE_ENV=test pnpm test` pass
- [ ] Migrations run from an empty database
- [ ] Seed is idempotent
- [ ] `scripts/smoke-sandbox.mjs` passes against the deployed URL
- [ ] `/health` and `/ready` return 200
- [ ] Public discovery files return 200 (`pnpm verify:discovery:public`)
- [ ] Public discovery files match the repository copy on the custom domain (`pnpm verify:discovery:strict`)
- [ ] Rate limits / body-size limits reviewed for public write routes
- [ ] Rowland or Maria approval recorded for DNS + public API exposure

## Discovery parity after deploy

Do not stop after a `200 OK` on `llms.txt` or `/.well-known/commercebackend.json`.
The custom domain can still serve a stale release marker or stale JSON field after
the repository and landing app have been updated.

Run this after every landing/docs deployment and every tagged release that updates
agent-facing discovery assets:

```bash
pnpm verify:discovery:strict
```

Expected outcome:

- local parity passes between repo-root files and `apps/landing/public/`
- public parity passes for `llms.txt`, `llms-full.txt`, `/.well-known/commercebackend.json`, and `/.well-known/agents.json`
- any failure shows the first differing text line or JSON field so you can tell
  whether the repository copy or the custom-domain deployment is stale

If this command reports a stale public release target or JSON field, treat it as
a deployment/promotion problem and do not call the release fully live until the
custom domain matches the repository copy.
