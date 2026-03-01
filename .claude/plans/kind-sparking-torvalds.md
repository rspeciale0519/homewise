# Homewise FL Website Rebuild — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild www.homewisefl.com as a modern Next.js 15 application — a professional real estate brokerage site for Home Wise Realty Group (central Florida, 186+ agents).

**Architecture:** Next.js 15 App Router with Server Components by default. Prisma + new Supabase PostgreSQL for agent directory and form submissions. Tailwind CSS v4 for styling. Zod for validation. Property search built with provider abstraction layer (mock data now, real IDX later). Content modernized from existing site.

**Tech Stack:** Next.js 15, TypeScript strict, Tailwind CSS v4, Prisma, Supabase (PostgreSQL), Zod, Embla Carousel, Framer Motion, class-variance-authority

---

## Context

The client (Home Wise Realty Group, Inc.) has an outdated template-era website at www.homewisefl.com. The rebuild modernizes the design to Compass/Redfin quality while preserving all existing functionality: agent directory with filtering, seller/buyer resource pages, home evaluation form, contact forms, and property search. The client will provide full website data, files, and IDX credentials tomorrow — so mock data is used for agents and property listings, with architecture designed for easy data swap.

---

## Project Structure

```
/home/rob/dev/homewise/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── public/
│   └── images/  (hero/, agents/, icons/, og/)
├── src/
│   ├── app/
│   │   ├── layout.tsx                        # Root layout
│   │   ├── page.tsx                          # Homepage
│   │   ├── not-found.tsx
│   │   ├── sitemap.ts
│   │   ├── robots.ts
│   │   ├── (marketing)/
│   │   │   ├── about/page.tsx
│   │   │   ├── agents/page.tsx               # Agent directory
│   │   │   ├── agents/[slug]/page.tsx        # Agent profile
│   │   │   ├── sellers/page.tsx              # Sellers landing
│   │   │   ├── sellers/staging/page.tsx
│   │   │   ├── sellers/sell-fast/page.tsx
│   │   │   ├── sellers/sounds-and-smells/page.tsx
│   │   │   ├── sellers/seller-advice/page.tsx
│   │   │   ├── buyers/page.tsx               # Buyers landing
│   │   │   ├── buyers/preparing/page.tsx
│   │   │   ├── buyers/location/page.tsx
│   │   │   ├── buyers/moving-tips/page.tsx
│   │   │   ├── buyers/condo-vs-house/page.tsx
│   │   │   ├── home-evaluation/page.tsx
│   │   │   └── properties/page.tsx           # Property search
│   │   └── api/
│   │       ├── agents/route.ts
│   │       ├── contact/route.ts
│   │       ├── home-evaluation/route.ts
│   │       └── properties/route.ts           # Property search API
│   ├── components/
│   │   ├── ui/        (button, card, input, select, textarea, badge, pagination, skeleton, container)
│   │   ├── layout/    (header, mobile-nav, footer, nav-links)
│   │   ├── home/      (hero-section, search-widget, promo-cards, featured-listings, company-description)
│   │   ├── agents/    (agent-card, agent-grid, agent-filters)
│   │   ├── forms/     (contact-form, home-eval-form, form-success)
│   │   ├── content/   (article-layout, service-card, service-grid)
│   │   ├── properties/(search-filters, listing-card, listing-grid, property-provider)
│   │   └── shared/    (social-links, cta-banner, section-heading, json-ld, animate-on-scroll)
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── utils.ts                          # cn() helper
│   │   ├── constants.ts                      # Site-wide constants
│   │   └── metadata.ts                       # SEO metadata factory
│   ├── providers/
│   │   └── property-provider.ts              # IDX abstraction interface
│   ├── schemas/
│   │   ├── contact.schema.ts
│   │   ├── home-evaluation.schema.ts
│   │   └── agent-filter.schema.ts
│   ├── types/
│   │   ├── agent.ts
│   │   ├── property.ts
│   │   └── forms.ts
│   └── data/
│       ├── navigation.ts
│       ├── content/   (10 content data files for all articles)
│       ├── mock/
│       │   ├── agents.ts                     # 15 mock agents
│       │   └── listings.ts                   # 12 mock property listings
│       └── seed/
│           └── agents.ts                     # Seed script data
├── tests/
│   ├── schemas/       (contact + home-eval schema tests)
│   └── api/           (contact + home-eval + agents API tests)
├── .env.example
├── .env.local                                # New Supabase pooler URLs
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Phase 1: Project Scaffold and Core Configuration

**Goal:** Initialize Next.js 15, configure all tooling, set up Prisma + new Supabase, verify build.

### Steps

**Step 1: Create new Supabase project**
- Create project "homewise" at https://supabase.com/dashboard
- Get pooler connection strings (transaction mode port 6543, session mode port 5432)
- Use `aws-1-us-east-1.pooler.supabase.com` host (per WSL2 IPv6 rule)

**Step 2: Initialize Next.js 15**
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --no-import-alias
```

**Step 3: Initialize git**
```bash
git init && git checkout -b develop
```

**Step 4: Configure TypeScript strict mode** — `tsconfig.json`
- `"strict": true`, `"noUncheckedIndexedAccess": true`

**Step 5: Install dependencies**
```bash
npm install prisma @prisma/client zod clsx tailwind-merge class-variance-authority
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

**Step 6: Create Prisma schema** — `prisma/schema.prisma`
- Models: `Agent` (id, firstName, lastName, slug, email, phone, photoUrl, languages[], designations[], bio, active)
- Models: `ContactSubmission` (id, name, email, phone, message, createdAt)
- Models: `HomeEvaluation` (id, name, email, phone, streetAddress, city, state, zip, bedrooms, bathrooms, sqft, garageSpaces, propertyType, sellTimeline, listingStatus, comments, createdAt)
- Datasource: postgresql with pooler URLs from env

**Step 7: Create lib files**
- `src/lib/prisma.ts` — Prisma singleton (globalThis pattern)
- `src/lib/utils.ts` — `cn()` with clsx + tailwind-merge
- `src/lib/constants.ts` — SITE_NAME, PHONE, FAX, ADDRESS, SOCIAL links, TAGLINE

**Step 8: Create env files**
- `.env.example` with placeholder DATABASE_URL, DIRECT_DATABASE_URL
- `.env.local` with new Supabase pooler connection strings

**Step 9: Configure Tailwind** — `tailwind.config.ts`
- Colors: navy primary (#1B2A4A), gold secondary (#C9A961), teal accent (#2A7F62), slate neutrals
- Fonts: Inter (body), Playfair Display (headings)

**Step 10: Add npm scripts** — type-check, test, db:push, db:seed

**Step 11: Run `npx prisma db push` and verify**

**Step 12: Verify** — `npm run type-check && npm run lint && npm run build`

**Commit:** `feat: scaffold Next.js 15 project with Prisma, Tailwind, and tooling`

---

## Phase 2: Layout System, Navigation, and UI Primitives

**Goal:** Build the persistent site shell and reusable UI components.

### Steps

**Step 1: Configure fonts** — Inter + Playfair Display via `next/font/google` in root layout

**Step 2: Build root layout** — `src/app/layout.tsx`
- Fonts on `<html>`, global metadata (title template, OG defaults), Header + Footer wrapping children

**Step 3: Create navigation data** — `src/data/navigation.ts`
- NAV_ITEMS array with nested children for Sellers (5 links) and Buyers (4 links)

**Step 4: Build header** — `src/components/layout/header.tsx`
- Sticky with glass-morphism on scroll, logo left, nav center/right, phone + CTA far right
- Desktop dropdowns for Sellers/Buyers, hamburger for mobile

**Step 5: Build mobile nav** — `src/components/layout/mobile-nav.tsx` ("use client")
- Slide-out drawer, accordion sub-menus, close on route change

**Step 6: Build footer** — `src/components/layout/footer.tsx`
- 4-column grid (About, Quick Links, For Sellers, For Buyers), contact info, social icons, REALTOR/Equal Housing/MLS logos

**Step 7: Build UI primitives** — `src/components/ui/`
- button.tsx (variants via cva: primary/secondary/outline/ghost, sizes sm/md/lg, loading state)
- card.tsx, input.tsx, select.tsx, textarea.tsx, badge.tsx, pagination.tsx, skeleton.tsx, container.tsx

**Step 8: Build shared components** — `src/components/shared/`
- social-links.tsx, section-heading.tsx, cta-banner.tsx

**Step 9: Create marketing route group layout** — `src/app/(marketing)/layout.tsx`

**Step 10: Create not-found.tsx and loading.tsx**

**Step 11: Verify** — Build passes, header/footer render at localhost, responsive at 375/768/1024/1440px

**Commit:** `feat: add layout system, navigation, and UI component library`

---

## Phase 3: Homepage

**Goal:** Build complete homepage with hero, search widget, promo cards, featured listings, and company description.

### Steps

**Step 1: Build hero section** — `src/components/home/hero-section.tsx`
- Full-viewport, high-quality background image with gradient overlay
- Heading: "Your Home. Your Future." + tagline, embedded search widget

**Step 2: Build search widget** — `src/components/home/search-widget.tsx` ("use client")
- Glassmorphism card, fields: Location, Price Range, Beds, Baths
- Submits to `/properties` with query params

**Step 3: Build promo cards** — `src/components/home/promo-cards.tsx`
- 3-card grid: Home Updates, Home Buying, Home Selling — icons, descriptions, hover animation

**Step 4: Create mock listings data** — `src/data/mock/listings.ts`
- 12 mock Florida property listings with price, address, beds/baths/sqft, image placeholder, status

**Step 5: Build featured listings carousel** — `src/components/home/featured-listings.tsx` ("use client")
- Install `embla-carousel-react`, listing cards, prev/next + dots, auto-advance

**Step 6: Build company description** — `src/components/home/company-description.tsx`
- 2-column: text + stats (186+ agents, 5 counties), "Learn More" to /about

**Step 7: Assemble homepage** — `src/app/page.tsx`
- Compose: Hero → Promo Cards → Featured Listings → Company Description → CTA Banner

**Step 8: Create metadata helper** — `src/lib/metadata.ts`

**Step 9: Verify** — Visual check at localhost, responsive, build passes

**Commit:** `feat: build homepage with hero, search, listings, and promo sections`

---

## Phase 4: Content Pages (Sellers, Buyers, Articles)

**Goal:** Build all static content pages with modernized copy from existing site.

### Steps

**Step 1: Create content data files** — `src/data/content/`
- 10 files with modernized content based on scraped data:
  - `sellers-services.ts`, `buyers-resources.ts`
  - `staging-tips.ts` (10 staging steps, modernized)
  - `sell-fast-tips.ts` (3 strategies)
  - `sounds-smells.ts` (sounds + smells sections)
  - `preparing-to-buy.ts` (what you need / don't need)
  - `location-guide.ts` (6 criteria)
  - `moving-tips.ts` (6 tips + mover links)
  - `condo-vs-house.ts`, `seller-advice.ts`

**Step 2: Build content components** — `src/components/content/`
- service-card.tsx (image, title, description, link, hover animation)
- service-grid.tsx (responsive 1/2/3 column grid)
- article-layout.tsx (hero banner, prose content, sidebar with related links + CTA)
- Install `@tailwindcss/typography`

**Step 3: Build sellers landing** — `src/app/(marketing)/sellers/page.tsx`
- Hero + 5 service cards linking to subpages + CTA banner

**Step 4: Build 4 seller article pages** — staging, sell-fast, sounds-and-smells, seller-advice

**Step 5: Build buyers landing** — `src/app/(marketing)/buyers/page.tsx`
- Hero + 4 internal cards + 2 external/placeholder cards + CTA banner

**Step 6: Build 4 buyer article pages** — preparing, location, moving-tips, condo-vs-house

**Step 7: Build about page** — `src/app/(marketing)/about/page.tsx`
- Company overview, mission, service area, buyer/seller services, contact info, placeholder for contact form (built Phase 6)

**Step 8: Verify** — All pages render, all internal links work, build passes, responsive check

**Commit:** `feat: add seller, buyer, and about content pages with modernized copy`

---

## Phase 5: Agent Directory

**Goal:** Build agent directory with filtering, pagination, and profile pages using mock data.

### Steps

**Step 1: Create mock agent data** — `src/data/mock/agents.ts`
- 15 diverse mock agents with names, phones, languages, designations, bios

**Step 2: Create seed script** — `prisma/seed.ts`
- Imports mock data, upserts agents, runnable repeatedly

**Step 3: Run seed** — `npx prisma db seed`

**Step 4: Create types** — `src/types/agent.ts` (Agent interface, AgentFilters)

**Step 5: Create filter schema** — `src/schemas/agent-filter.schema.ts`

**Step 6: Build agent API route** — `src/app/api/agents/route.ts`
- GET with query params (language, letter, page), Zod validation, Prisma query, paginated response (20/page)

**Step 7: Build agent components** — `src/components/agents/`
- agent-card.tsx (photo with fallback initials, name, phone, language badges, "View Profile")
- agent-grid.tsx (responsive 1/2/3-4 column grid)
- agent-filters.tsx ("use client" — language dropdown, A-Z bar, URL search params)

**Step 8: Build agent directory page** — `src/app/(marketing)/agents/page.tsx`
- Server Component reads searchParams, queries Prisma directly, passes to grid + pagination

**Step 9: Build agent profile page** — `src/app/(marketing)/agents/[slug]/page.tsx`
- Full photo + name header, contact info, languages, bio, CTA, generateMetadata

**Step 10: Write API tests** — `tests/api/agents.test.ts`

**Step 11: Verify** — Directory renders, filters work, pagination navigates, profiles load, tests pass, build passes

**Commit:** `feat: add agent directory with filters, pagination, and profiles`

---

## Phase 6: Forms, API Routes, Property Search, and Validation

**Goal:** Build forms with Zod validation, property search with provider abstraction, and all API routes.

### Steps

**Step 1: Create Zod schemas** — `src/schemas/contact.schema.ts` + `src/schemas/home-evaluation.schema.ts`

**Step 2: Write schema tests** — `tests/schemas/contact.schema.test.ts` + `tests/schemas/home-evaluation.schema.test.ts`
- Run tests, verify they fail (TDD)

**Step 3: Build contact API route** — `src/app/api/contact/route.ts`
- POST, validate with Zod, store in Prisma, return success/400

**Step 4: Build home evaluation API route** — `src/app/api/home-evaluation/route.ts`
- POST, validate with Zod, store in Prisma, return success/400

**Step 5: Write API tests** — `tests/api/contact.test.ts` + `tests/api/home-evaluation.test.ts`

**Step 6: Build form components**
- `src/components/forms/form-success.tsx` — animated check, success message
- `src/components/forms/contact-form.tsx` ("use client") — name, email, phone, message, real-time validation, loading/success states
- `src/components/forms/home-eval-form.tsx` ("use client") — multi-section form (contact → address → property → selling info), progress indicator

**Step 7: Build home evaluation page** — `src/app/(marketing)/home-evaluation/page.tsx`

**Step 8: Integrate contact form into about page**

**Step 9: Create property search provider interface** — `src/providers/property-provider.ts`
```typescript
export interface PropertyProvider {
  search(filters: PropertyFilters): Promise<PropertySearchResult>
  getProperty(id: string): Promise<Property | null>
}
```
- Create mock implementation using `src/data/mock/listings.ts`
- Interface ready for real IDX provider swap

**Step 10: Build property search components** — `src/components/properties/`
- search-filters.tsx ("use client" — location, price, beds, baths, sqft, property type)
- listing-card.tsx (image, price, address, beds/baths/sqft, status badge)
- listing-grid.tsx (responsive grid with empty state)

**Step 11: Build property search API** — `src/app/api/properties/route.ts`
- GET with filter params, delegates to property provider

**Step 12: Build property search page** — `src/app/(marketing)/properties/page.tsx`

**Step 13: Verify** — Forms submit, validation works, data persists in DB, property search filters mock data, all tests pass, build passes

**Commit:** `feat: add forms, validation, property search, and API routes`

---

## Phase 7: SEO, Performance, Polish, and Launch Prep

**Goal:** Optimize for search engines, add animations, configure redirects, prepare for deployment.

### Steps

**Step 1: Generate sitemap** — `src/app/sitemap.ts` (all static pages + dynamic agent profiles)

**Step 2: Generate robots.txt** — `src/app/robots.ts`

**Step 3: Add JSON-LD structured data** — `src/components/shared/json-ld.tsx`
- Homepage: Organization + RealEstateAgent
- Agent profiles: Person schema
- Articles: Article schema

**Step 4: Add OG image generation** — `src/app/opengraph-image.tsx` using Next.js ImageResponse

**Step 5: Add scroll animations** — Install `framer-motion`
- `src/components/shared/animate-on-scroll.tsx` — fade-in sections on scroll

**Step 6: Configure redirects** — `next.config.ts`
- `/Prepping-Your-Home` → `/sellers/staging`
- `/Sell-Your-Home-FAST` → `/sellers/sell-fast`
- `/Moving-Assistance` → `/buyers/moving-tips`
- `/preparing-to-buy` → `/buyers/preparing`
- `/sounds-and-smells` → `/sellers/sounds-and-smells`
- Plus security headers

**Step 7: Add favicon and app icons**

**Step 8: Performance pass**
- All images use `next/image` with proper sizes
- `priority` on hero image, `loading="lazy"` below fold
- ISR on agent profiles (`revalidate: 3600`)

**Step 9: Final verification**
- `npm run type-check` passes
- `npm run lint` passes
- `npm run test:run` passes
- `npm run build` succeeds
- All pages render at all breakpoints
- All links work, forms submit, filters work
- Old URL redirects work

**Commit:** `feat: add SEO, performance optimizations, and launch polish`

Then: `/git-workflow-planning:finish` to create the PR.

---

## Verification

After each phase:
1. `npm run type-check` — no TypeScript errors
2. `npm run lint` — no linting issues
3. `npm run build` — successful build
4. Visual check at `http://localhost:3000` — responsive at 375/768/1024/1440px
5. `npm run test:run` — all tests pass (Phases 5-6)

Final verification:
- All 15+ pages render correctly
- Agent directory filters by language and letter, paginates
- Both forms submit with validation and persist to Supabase
- Property search filters mock listings
- Old URL redirects return 301
- Lighthouse: target 90+ on all 4 categories

---

## Dependencies

**Production:** next, react, react-dom, @prisma/client, zod, clsx, tailwind-merge, class-variance-authority, embla-carousel-react, framer-motion, @tailwindcss/typography

**Dev:** typescript, prisma, vitest, @testing-library/react, @testing-library/jest-dom, @types/node, @types/react, @types/react-dom, eslint, eslint-config-next

---

## Future (Post-Launch, Out of Scope)

- Real IDX/MLS integration (swap mock provider when client provides credentials)
- Real agent data import (swap mock seed when client provides roster)
- Email notifications on form submissions (Resend/SendGrid)
- Admin dashboard for managing agents and viewing submissions
- Blog/content marketing section
- Analytics (GA4 or Plausible)
- Chat widget
