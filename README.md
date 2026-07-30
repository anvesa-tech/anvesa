# ANVESA

> Buy what's verified, not what's marketed.

ANVESA is a clean-food marketplace where every product is verified using an
objective, integrity-protected grading system. The in-app scanner is one
feeder feature; the marketplace is the hero.

## Monorepo layout

```
anvesa/
  mobile/            # React Native + Expo client (Expo Router, Zustand, React Query)
  backend/           # Next.js 15 + tRPC + Prisma (Clean Architecture)
    src/
      presentation/  # tRPC routers, webhooks, Security_Layer middleware
      application/   # use-case services (Marketplace_Service, Checkout_Service, ...)
      domain/        # pure entities + Grading_Engine + ports (no I/O)
      infrastructure/# Prisma repos, gateways, Redis, DI composition root
  packages/config/   # shared tsconfig / eslint / prettier
```

## Architecture

Clean Architecture with a strict inward dependency rule
(Presentation → Application → Domain; Infrastructure implements domain ports).
Enforced in CI by `dependency-cruiser` (`npm run depcruise`).

The **Grading_Engine** is a pure, deterministic function that computes a grade
solely from composition (nutrition, ingredients, composition attributes).
Advertising, sponsorship, payments, and partnerships are structurally excluded
from grading inputs. Grades cannot be overridden; attempts are rejected and
audited.

## Getting started

```bash
# from the repo root
npm install                      # installs all workspaces
docker compose up -d             # Postgres + Redis
cp backend/.env.example backend/.env
npm run db:migrate --workspace backend
npm run db:seed --workspace backend

npm run dev:backend              # Next.js + tRPC
npm run dev:mobile               # Expo
```

## Quality gates

```bash
npm run typecheck    # strict TS across workspaces
npm run lint         # ESLint
npm run test         # Vitest + fast-check (property tests, min 100 runs)
npm run depcruise    # architecture boundary lint
```

CI runs all of the above on every push/PR (`.github/workflows/ci.yml`).
