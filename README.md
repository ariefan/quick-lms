# Quick LMS

A modern Learning Management System built with Next.js 16, tRPC, Drizzle ORM, and shadcn/ui.

## Tech Stack

- **Framework**: Next.js 16 (App Router) with React 19
- **Database**: SQLite via libsql (Turso-compatible)
- **ORM**: Drizzle ORM with automatic Zod schema generation
- **API Layer**: tRPC v11 for end-to-end type safety
- **Data Fetching**: TanStack Query (React Query) v5
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **Validation**: Zod schemas auto-generated from database schema
- **Type Safety**: Full TypeScript coverage from DB to UI

## Quick Start

```bash
# Install dependencies
pnpm install

# Initialize database (creates local.db)
pnpm db:push

# Start development server
pnpm dev

# Open http://localhost:3000
```

## Available Commands

```bash
# Development
pnpm dev              # Start dev server on localhost:3000
pnpm build            # Build for production
pnpm start            # Start production server
pnpm lint             # Run ESLint

# Database
pnpm db:push          # Push schema changes to database
pnpm db:studio        # Open Drizzle Studio (visual database editor)
pnpm db:generate      # Generate migration files
pnpm db:migrate       # Run pending migrations
```

## Project Structure

```
├── app/                          # Next.js App Router
│   ├── _providers/              # React providers (tRPC, React Query)
│   ├── api/trpc/[trpc]/        # tRPC HTTP endpoint
│   ├── layout.tsx               # Root layout with providers
│   └── page.tsx                 # Home page
│
├── server/                       # Backend code (server-side only)
│   ├── db/
│   │   ├── schema.ts            # Drizzle schemas + auto-generated Zod
│   │   └── index.ts             # Database connection
│   ├── routers/
│   │   └── index.ts             # tRPC API routes (AppRouter)
│   └── trpc.ts                  # tRPC server config
│
├── lib/                          # Shared utilities
│   ├── trpc/client.ts           # tRPC React hooks
│   └── utils.ts                 # Helper functions (cn)
│
├── components/                   # React components (add as needed)
│   └── ui/                      # shadcn/ui components (auto-generated)
│
├── drizzle.config.ts            # Drizzle Kit configuration
└── components.json              # shadcn/ui configuration
```

## Architecture Overview

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture documentation.

### Type Safety Flow

```
Database Schema (Drizzle)
  ↓
TypeScript Types + Zod Schemas (drizzle-zod)
  ↓
tRPC Procedures (validated with Zod)
  ↓
React Query Hooks (tRPC client)
  ↓
Components (fully type-safe)
```

### Example: Adding a New Feature

#### 1. Add Database Table

```typescript
// server/db/schema.ts
export const posts = sqliteTable("posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  content: text("content").notNull(),
});

export const insertPostSchema = createInsertSchema(posts);
export type Post = typeof posts.$inferSelect;
```

```bash
pnpm db:push  # Apply schema changes
```

#### 2. Add tRPC Router

```typescript
// server/routers/index.ts
const postRouter = createTRPCRouter({
  getAll: publicProcedure.query(({ ctx }) => {
    return ctx.db.select().from(posts);
  }),
  create: publicProcedure
    .input(insertPostSchema.omit({ id: true }))
    .mutation(({ ctx, input }) => {
      return ctx.db.insert(posts).values(input);
    }),
});

export const appRouter = createTRPCRouter({
  user: userRouter,
  post: postRouter,  // Add new router
});
```

#### 3. Use in Components

```typescript
// app/posts/page.tsx
"use client";
import { trpc } from "@/lib/trpc/client";

export default function PostsPage() {
  const { data: posts } = trpc.post.getAll.useQuery();
  const createPost = trpc.post.create.useMutation();

  return (
    <div>
      {posts?.map(post => <div key={post.id}>{post.title}</div>)}
    </div>
  );
}
```

## Adding shadcn/ui Components

```bash
# Add individual components
pnpm dlx shadcn@latest add button
pnpm dlx shadcn@latest add card
pnpm dlx shadcn@latest add form

# Components are added to components/ui/
```

## Environment Variables

Create `.env.local`:

```bash
# Database URL (optional, defaults to file:./local.db)
DATABASE_URL="file:./local.db"

# For production with Turso
# DATABASE_URL="libsql://your-db.turso.io"
# DATABASE_AUTH_TOKEN="your-token"
```

## Key Features

- ✅ **Full Type Safety**: End-to-end TypeScript from database to UI
- ✅ **Auto-generated Validation**: Zod schemas from Drizzle ORM
- ✅ **Optimistic Updates**: Built-in with React Query
- ✅ **Zero API Boilerplate**: tRPC eliminates REST/GraphQL setup
- ✅ **Database UI**: Drizzle Studio for visual data management
- ✅ **Component Library**: Pre-configured shadcn/ui components
- ✅ **Production Ready**: Tested build process

## Development Tips

### For AI Coding Agents

This project follows these patterns for easy understanding:

1. **Barrel Exports**: Import from `@/server`, `@/lib/trpc/client`
2. **JSDoc Comments**: All key files have usage examples
3. **Type Exports**: Types are exported alongside implementation
4. **Consistent Naming**: `*Schema` for Zod, `*Router` for tRPC
5. **Single Source of Truth**: `server/routers/index.ts` exports `AppRouter` type

### Common Patterns

```typescript
// ✅ DO: Use tRPC for data fetching
const { data } = trpc.user.getAll.useQuery();

// ❌ DON'T: Use fetch() or axios directly
const data = await fetch('/api/users');

// ✅ DO: Define schemas in server/db/schema.ts
export const insertUserSchema = createInsertSchema(users);

// ❌ DON'T: Create separate Zod schemas
const userSchema = z.object({ name: z.string() });

// ✅ DO: Use Drizzle ORM methods
ctx.db.select().from(users).where(eq(users.id, 1));

// ❌ DON'T: Write raw SQL
ctx.db.execute(sql`SELECT * FROM users WHERE id = 1`);
```

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [tRPC Docs](https://trpc.io/docs)
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [shadcn/ui Docs](https://ui.shadcn.com/)
- [TanStack Query Docs](https://tanstack.com/query/latest)

## License

MIT
