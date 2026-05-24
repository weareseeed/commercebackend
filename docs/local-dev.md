# Local Development Guide

Follow these steps to set up and run CommerceBackend v0.1 locally.

## Prerequisites

- Node.js (v18 or higher)
- pnpm (v8 or higher)
- Docker & Docker Compose (optional, for Postgres)

## 1. Installation

Install monorepo dependencies:

```bash
pnpm install
```

## 2. Environment Setup

Copy the example environment file:

```bash
cp .env.example .env
```

And adjust parameters if needed (e.g. Stripe API keys).

## 3. Database setup

Start the PostgreSQL container:

```bash
docker compose -f infra/docker-compose.yml up -d
```

Generate the Prisma Client:

```bash
pnpm --filter @commercebackend/db exec prisma generate
```

Apply database migrations:

```bash
pnpm --filter @commercebackend/db exec prisma db push
```

## 4. Seeding Data

Seed the database with pre-configured buyer and seller agents, and three test listings:

```bash
pnpm --filter @commercebackend/db seed
```

This prints out generated agent IDs, API keys, and listing IDs to use in manual curl tests.

## 5. Starting the API Server

Start the Fastify API server on `http://localhost:4000`:

```bash
pnpm dev
```

## 6. Running Tests

Run the Vitest integration suite:

```bash
pnpm test
```

## 7. Running Example Scripts

_Make sure the API server is running on port 4000 before executing examples._

Run the **seller-agent** script to register a seller and post a listing:

```bash
pnpm --filter @commercebackend/example-seller-agent start
```

Run the **buyer-agent** script to register a buyer, search for listings, initiate checkout, and get a Stripe Checkout redirect URL:

```bash
pnpm --filter @commercebackend/example-buyer-agent start
```
