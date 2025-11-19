# Quick LMS - Architecture

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: SQLite via libsql (Turso-compatible)
- **ORM**: Drizzle ORM with drizzle-zod for validation
- **API**: tRPC v11 for type-safe APIs
- **Data Fetching**: TanStack Query (React Query) v5
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **Validation**: Zod schemas

## Project Structure

```
quick-lms/
├── app/                          # Next.js App Router
│   ├── _providers/              # React context providers
│   │   └── trpc-provider.tsx   # tRPC + React Query setup
│   ├── api/                    # API routes
│   │   └── trpc/[trpc]/       # tRPC HTTP handler
│   ├── layout.tsx              # Root layout with providers
│   └── page.tsx                # Home page
│
├── server/                      # Backend code (server-side only)
│   ├── db/                     # Database layer
│   │   ├── index.ts           # Database connection
│   │   └── schema.ts          # Drizzle schemas + Zod validation
│   ├── routers/               # tRPC routers
│   │   └── index.ts          # Main app router (exports AppRouter type)
│   └── trpc.ts               # tRPC initialization & context
│
├── lib/                        # Shared utilities (client + server)
│   ├── trpc/                  # tRPC client utilities
│   │   └── client.ts         # tRPC React hooks
│   └── utils.ts              # General utilities (cn helper)
│
└── drizzle.config.ts          # Drizzle Kit configuration
```

## Key Patterns

### 1. Type Safety Flow
- Database schema → Drizzle types → Zod schemas → tRPC procedures → React hooks
- End-to-end type safety from DB to UI

### 2. Data Flow
```
Client Component
  → trpc.user.getAll.useQuery()
    → /api/trpc/[trpc]
      → appRouter.user.getAll
        → db.select().from(users)
```

### 3. Adding New Features

**Add a new database table:**
1. Define in `server/db/schema.ts`
2. Run `pnpm db:push`
3. Create Zod schemas with `createInsertSchema()`

**Add a new API endpoint:**
1. Create router in `server/routers/`
2. Add to `appRouter` in `server/routers/index.ts`
3. Use in components via `trpc.yourRouter.yourProcedure.useQuery()`

**Add a new page:**
1. Create in `app/` directory
2. Use tRPC hooks for data fetching
3. All queries are cached via React Query

## Environment Variables

- `DATABASE_URL` - Database connection string (defaults to `file:./local.db`)

## Development

```bash
pnpm dev        # Start dev server (localhost:3000)
pnpm db:studio  # Open database GUI
pnpm build      # Test production build
```
