# Waste to Worth — Scaffold Walkthrough

## What Was Built

Complete Next.js 14 scaffolding for the Waste to Worth e-waste management platform.

### Routes Created

| Path | Type | Description |
|------|------|-------------|
| `/` | Public | Landing page with hero + how-it-works |
| `/impact` | Public | Impact dashboard (no login) |
| `/login` | Auth | Login form |
| `/register` | Auth | Registration form |
| `/dashboard` | Citizen | Citizen dashboard |
| `/submit/dropbox` | Citizen | Dropbox submission |
| `/submit/pickup` | Citizen | Pickup submission |
| `/history` | Citizen | Submission history |
| `/rewards` | Citizen | Reward redemption |
| `/admin/dashboard` | Admin | Admin dashboard |
| `/admin/batches` | Admin | Batch management |
| `/admin/dropboxes` | Admin | Dropbox management |
| `/admin/schedules` | Admin | Pickup schedules |
| `/admin/rewards` | Admin | Reward management |

### API Routes (all functional with GET/POST)

- `/api/auth/login` — JWT login with httpOnly cookies
- `/api/auth/register` — User registration
- `/api/submissions/dropbox` — Dropbox submission CRUD
- `/api/submissions/pickup` — Pickup submission CRUD
- `/api/batches` — Batch lifecycle (OPEN→COLLECTING→VERIFYING→COMPLETED)
- `/api/dropboxes` — Dropbox locations + capacity
- `/api/rewards` — Reward catalog
- `/api/redemptions` — Redemption flow (request → approve → deliver)
- `/api/points` — Point balance + history
- `/api/impact` — Public aggregate stats

### Core Libraries

- `src/lib/prisma.ts` — Prisma v7 singleton with `@prisma/adapter-pg`
- `src/lib/auth.ts` — JWT via `jose` + bcrypt password hashing
- `src/lib/points.ts` — Points calculation from PointRule table
- `src/lib/utils.ts` — Response helpers, formatters, cn()

### Database

- Full Prisma schema with 14 models and 9 enums
- Seed script with districts, dropboxes, boxes, point rules, rewards, and admin user

---

## Key Adjustments

> [!IMPORTANT]
> **Prisma 7 Breaking Changes**: Prisma v7 no longer supports `url` in `schema.prisma` datasource. Connection URL is configured in `prisma.config.ts`, and `PrismaClient` requires an adapter (`@prisma/adapter-pg`).

> [!IMPORTANT]
> **Edge Runtime**: Middleware runs in Edge Runtime. Switched from `jsonwebtoken` (Node.js-only) to `jose` (Edge-compatible) for both middleware and auth helpers.

> [!NOTE]
> **Route Structure**: Changed from Next.js route groups `(admin)`, `(citizen)` to real path segments `/admin/`, direct paths, because route groups share URL namespace and caused conflicts on `/dashboard` and `/rewards`.

---

## Build Status

✅ `npx next build` — **compiles successfully** (exit code 0). Runtime warnings about DB connection are expected without a running PostgreSQL instance.

## Next Steps

1. Set up PostgreSQL and configure `DATABASE_URL` in `.env`
2. Run `npx prisma migrate dev` to create tables
3. Run `npm run db:seed` to seed data
4. Build out UI mockups and connect to API routes
