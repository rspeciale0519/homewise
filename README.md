# Homewise FL — Home Wise Realty Group

Modern real estate brokerage website for Home Wise Realty Group, Inc., serving central Florida (Orange, Seminole, Osceola, Volusia, and Lake counties).

## Tech Stack

- **Framework:** Next.js 15 (App Router, Server Components)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4
- **Database:** Supabase PostgreSQL via Prisma ORM
- **Validation:** Zod
- **UI:** class-variance-authority, Embla Carousel, Framer Motion

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Environment Setup

```bash
cp .env.example .env.local
# Fill in your Supabase pooler connection strings
```

### Install & Run

```bash
npm install
npx prisma db push
npx prisma db seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run type-check` | TypeScript type checking |
| `npm run lint` | ESLint code quality check |
| `npm run test` | Run test suite (watch mode) |
| `npm run test:run` | Run tests once |
| `npm run db:push` | Push Prisma schema to database |
| `npm run db:seed` | Seed database with mock data |

## Project Structure

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── (marketing)/        # Public marketing pages
│   └── api/                # REST API routes
├── components/
│   ├── ui/                 # Reusable UI primitives
│   ├── layout/             # Header, footer, navigation
│   ├── home/               # Homepage sections
│   ├── agents/             # Agent directory components
│   ├── forms/              # Contact and evaluation forms
│   ├── content/            # Article and service page components
│   ├── properties/         # Property search components
│   └── shared/             # Cross-cutting shared components
├── lib/                    # Utilities, Prisma client, constants
├── providers/              # Property search provider abstraction
├── schemas/                # Zod validation schemas
├── types/                  # TypeScript type definitions
└── data/                   # Navigation, content, and mock data
```

## Deployment

Configured for Vercel deployment. Environment variables required:

- `DATABASE_URL` — Supabase pooler URL (transaction mode, port 6543)
- `DIRECT_DATABASE_URL` — Supabase pooler URL (session mode, port 5432)
