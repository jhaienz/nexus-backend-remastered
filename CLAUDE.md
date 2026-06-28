# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NCF Research Nexus v2 backend — a NestJS rewrite of a legacy Express application for managing academic research papers. See `SYSTEM_DESIGN.md` for the full system design, database schema, API specification, and frontend wireframes.

## Commands

```bash
npm run start:dev      # Dev server with watch mode (port 3001)
npm run build          # Compile TypeScript
npm run lint           # ESLint with auto-fix
npm run format         # Prettier formatting
npm test               # Unit tests (Jest, files matching *.spec.ts in src/)
npm test -- --testPathPattern=<pattern>  # Run a single test file
npm run test:e2e       # E2E tests (config: test/jest-e2e.json)
npm run test:cov       # Test coverage report
npx drizzle-kit generate  # Generate Drizzle migrations
npx drizzle-kit migrate   # Apply migrations
```

## Architecture

- **15 domain modules** under `src/modules/`, each with controller + service + DTOs
- **Global modules**: `DatabaseModule` (Drizzle), `StorageModule` (R2), `EmailModule` (Resend) — injected everywhere
- **Database**: PostgreSQL via Drizzle ORM with `postgres.js` driver. Schema in `src/database/schema/`. Inject via `@Inject(DRIZZLE)` with `import type { DrizzleDB }`
- **Auth**: JWT access (15m) / refresh (7d) tokens. Global `JwtAuthGuard` applied via `APP_GUARD` — use `@Public()` to opt out. `@Roles('admin')` for RBAC
- **File handling**: Presigned URL pattern — backend never proxies file bytes. `StorageService.generateUploadUrl()` / `generateDownloadUrl()`
- **Config**: `@nestjs/config` with Zod validation in `src/config/env.validation.ts`. All env vars validated on startup
- **API docs**: Swagger at `/api/docs`. All DTOs decorated with `@ApiProperty`

All endpoints prefixed with `/api`. Port defaults to 3001 (configurable via `PORT` env var).

## Key Patterns

- **Type imports for DI**: `DrizzleDB` must use `import type` (required by `isolatedModules` + `emitDecoratorMetadata`). The `DRIZZLE` symbol is the runtime token
- **Response envelope**: `TransformInterceptor` wraps all responses in `{ data }`. Paginated responses return `{ data, meta: { total, page, totalPages } }` directly (skipping the extra wrap)
- **Ownership checks**: Research mutations verify `uploaderId === userId` via private `assertOwnership()` — throws `NotFoundException` (not 403) to avoid leaking existence
- **Current user**: Use `@CurrentUser()` decorator in controllers to extract the JWT payload; type is `JwtPayload` from `auth/strategies/jwt.strategy.ts`
- **Drizzle query style**: Use `db.query.*` (relational API with `with:`) for reads with joins; use `db.select/insert/update` (query builder) for writes and aggregations
- **File upload flow**: Two-step — (1) call endpoint to get presigned upload URL, (2) client uploads directly to R2, (3) client calls confirm endpoint which sets `uploadComplete: true` and `fileKey`. Backend never proxies bytes
- **Research lifecycle**: Status is `pending → approved | rejected`. Only admins can approve/reject; uploaders can only delete their own pending/rejected research
- **Pagination**: Shared `PaginationDto` with `page`/`limit` query params, returns `{ data, meta: { total, page, totalPages } }`
- **Search**: PostgreSQL full-text search via `tsvector`/`plainto_tsquery` + `pg_trgm` similarity for autocomplete

## Code Style

- **Prettier**: single quotes, trailing commas (`all`)
- **ESLint**: TypeScript strict type-checked rules. `no-explicit-any` off, `no-floating-promises` and `no-unsafe-argument` are warnings
- **TypeScript**: `nodenext` module resolution, `ES2023` target, `strictNullChecks` enabled, `noImplicitAny` off
