# Session Handoff — Homewise FL

## Current State (as of 2026-03-03)

### Branch: `feature/mls-foundation`
- **PR #1** targets `develop` — contains all work from Phases 1-7
- **PR #2** (Phase 7 SEO/performance) was merged into `feature/mls-foundation`
- All type-check and build pass cleanly
- 84+ routes across marketing, admin, and API segments

### What's Complete
- **Phase 0:** Project documentation (PRD, roadmap, README)
- **Phase 1:** Next.js 15 scaffold, Prisma, Tailwind, TypeScript strict
- **Phase 2:** Layout system, navigation, UI primitives (header, footer, buttons, cards)
- **Phase 3:** Homepage (hero, search widget, promo cards, featured listings, company description)
- **Phase 4:** Content pages (10 buyer/seller articles, about page, home evaluation)
- **Phase 5:** Agent directory (API, filters, A-Z bar, agent profile pages)
- **Phase 6:** Forms, API routes, property search (Zod validation, pagination, search filters)
- **Phase 6.5:** Missing pages (home inspection, buyer request, property alerts, property detail, communities)
- **Phase 6.75:** MLS foundation (Prisma Listing model, Stellar MLS provider, Inngest sync, Mapbox GL map search, Walk Score, GreatSchools, photo gallery, admin sync dashboard)
- **Phase 7:** SEO, performance, polish (sitemap, robots.txt, favicon, JSON-LD, OG images, Framer Motion animations, 70+ old-site redirects, HSTS/cache headers)

### Dev Roadmap
All items checked off in `dev-docs/dev-roadmap.md`.

---

## Key Project Patterns

### Technical Stack
- Next.js 16 (App Router), TypeScript strict, Tailwind CSS
- Prisma ORM with Supabase PostgreSQL
- Framer Motion for animations, Mapbox GL for maps
- Zod for API validation, Inngest for background jobs

### Critical Rules
- **Never delete files** — move to `archive/` folder instead
- **Source files max 450 LOC** (markdown exempt)
- **No `any` types** — TypeScript strict everywhere
- `npm install` needs `--legacy-peer-deps` (peer dep conflicts with inngest/mapbox)
- Prisma: use `db push` not `migrate dev` (avoids reset prompts)
- **Always push plan files** to remote repo — all plans tracked in git
- Plan files go in `.claude/plans/` with naming `[type]-[subject].md`
- Plan filename determines git branch (e.g., `feature-crm.md` → `feature/crm`)

### Database Connectivity (WSL2/Supabase)
- **ALWAYS** use Supabase pooler: `aws-1-us-east-1.pooler.supabase.com`
- Transaction mode: port 6543 | Session mode: port 5432
- **NEVER** use direct connection (`db.xrixrioaarbnpzjqzfsl.supabase.co`) — IPv6 unreachable

### GitHub
- Repo: `rspeciale0519/homewise`
- GH_TOKEN env var must be set each session (not persisted in gh CLI config)

### Git Branch Strategy
- `main` — production
- `staging` — pre-production testing
- `develop` — active development (default working branch)
- Feature branches branch off `develop` and merge back via PR

---

## Key File Locations

| Purpose | Path |
|---------|------|
| Project rules | `/CLAUDE.md` |
| Dev roadmap | `/dev-docs/dev-roadmap.md` |
| Plan files | `/.claude/plans/` |
| Prisma schema | `/prisma/schema.prisma` |
| Constants (SITE_URL, PHONE, etc.) | `/src/lib/constants.ts` |
| Prisma singleton | `/src/lib/prisma.ts` |
| Metadata helper | `/src/lib/metadata.ts` |
| JSON-LD builders | `/src/lib/json-ld.ts` |
| OG font loader | `/src/lib/og-fonts.ts` |
| Redirects config | `/src/config/redirects.ts` |
| Communities data | `/src/data/content/communities.ts` |
| Marketing pages | `/src/app/(marketing)/` |
| Admin pages | `/src/app/(admin)/` |
| API routes | `/src/app/api/` |
| Dashboard pages | `/src/app/(dashboard)/` |

---

## What's Next

PR #1 (`feature/mls-foundation` → `develop`) is ready for merge/review. After that, potential next steps include:
- Deploying to Vercel staging
- E2E testing with Playwright
- Additional content pages or features as needed
- Production launch preparation
