# Phase 7: SEO, Performance, Polish, Launch Prep

## Context

Homewise FL has 84 routes across marketing, admin, and API segments. All functional features are complete (Phases 1-6.75). However, the site lacks critical SEO infrastructure (sitemap, robots.txt, structured data, OG images), has no scroll animations despite Framer Motion being installed, has incomplete URL redirects from the old site, no favicon, and no performance caching headers. This phase makes the site production-ready.

**Outcome:** Full SEO coverage (sitemap, robots, JSON-LD, OG images), branded favicon, subtle Framer Motion scroll animations, comprehensive old-site redirects, performance headers, and a clean Lighthouse audit.

---

## Checkpoint 1: Sitemap, Robots.txt, Favicon

### Goal
Establish crawlability foundation — search engines need these before anything else matters.

### Files to Create

| File | Purpose |
|------|---------|
| `src/app/sitemap.ts` | Dynamic sitemap querying Prisma for agents, listings, communities. Static list for ~25 marketing pages. Excludes admin/dashboard/API/auth routes. Uses `MetadataRoute.Sitemap` return type. |
| `src/app/robots.ts` | Disallow `/admin/`, `/dashboard/`, `/api/`, `/login`, `/register`. Allow everything else. Reference `sitemap.xml`. Uses `MetadataRoute.Robots`. |
| `src/app/icon.tsx` | 32x32 programmatic favicon via `ImageResponse` — navy-600 rounded square with white "HW" initials (logo is too wide to scale down). |
| `src/app/apple-icon.tsx` | 180x180 Apple touch icon, same brand mark approach. |

### Key Patterns to Reuse
- `SITE_URL` from `src/lib/constants.ts` for sitemap URLs
- `prisma` from `src/lib/prisma.ts` for dynamic route queries
- `COMMUNITIES` array from `src/data/content/communities.ts` for community slugs

### Verification
- `npm run type-check` — zero errors
- `npm run build` succeeds
- `/sitemap.xml` returns valid XML with all expected URLs
- `/robots.txt` returns correct disallow rules
- Favicon visible in browser tab

---

## Checkpoint 2: JSON-LD Structured Data

### Goal
Add rich structured data to every public page type for Google rich results.

### Install
```
schema-dts
```

### Schema Strategy

| Page | Schema Type |
|------|------------|
| Homepage `/` | `Organization` + `WebSite` with `SearchAction` |
| About `/about` | `Organization` + `LocalBusiness` |
| Property Detail `/properties/[id]` | `Product` (price, address, image) + `BreadcrumbList` |
| Agent Profile `/agents/[slug]` | `Person` (jobTitle, worksFor, telephone) + `BreadcrumbList` |
| Community `/communities/[slug]` | `Place` + `BreadcrumbList` |
| Buyer/Seller pages | `Article` + `BreadcrumbList` |

### Files to Create

| File | Purpose |
|------|---------|
| `src/lib/json-ld.ts` | Builder functions: `organizationJsonLd()`, `websiteJsonLd()`, `realEstateListingJsonLd(property)`, `agentPersonJsonLd(agent)`, `communityPlaceJsonLd(community)`, `breadcrumbJsonLd(items)`, `articleJsonLd(params)`. Uses `WithContext<T>` from `schema-dts`. |
| `src/components/shared/json-ld-script.tsx` | Thin `<script type="application/ld+json">` wrapper. |

### Files to Modify

| File | Change |
|------|--------|
| `src/app/(marketing)/page.tsx` | Add Organization + WebSite JSON-LD |
| `src/app/(marketing)/properties/[id]/page.tsx` | Add Product + BreadcrumbList JSON-LD |
| `src/app/(marketing)/agents/[slug]/page.tsx` | Add Person + BreadcrumbList JSON-LD |
| `src/app/(marketing)/communities/[slug]/page.tsx` | Add Place + BreadcrumbList JSON-LD |
| `src/app/(marketing)/about/page.tsx` | Add Organization + BreadcrumbList JSON-LD |
| `src/app/(marketing)/buyers/page.tsx` | Add Article + BreadcrumbList JSON-LD |
| `src/app/(marketing)/sellers/page.tsx` | Add Article + BreadcrumbList JSON-LD |

### Key Patterns to Reuse
- Constants: `SITE_NAME`, `SITE_URL`, `ADDRESS`, `PHONE`, `SOCIAL_LINKS`, `TAGLINE` from `src/lib/constants.ts`
- `formatPrice()` from `src/lib/format.ts` for product pricing

### Verification
- `npm run type-check` — zero errors
- `npm run build` succeeds
- View page source on property detail: `<script type="application/ld+json">` present with valid schema

---

## Checkpoint 3: OG Image Generation

### Goal
Branded Open Graph images for social sharing. Static default for most pages, dynamic for property detail and agent profile.

### Files to Create

| File | Purpose |
|------|---------|
| `src/app/opengraph-image.tsx` | Root default OG image (1200x630) — navy gradient, SITE_NAME, TAGLINE, crimson accent bar. Catches all routes without a more specific OG image. |
| `src/app/(marketing)/properties/[id]/opengraph-image.tsx` | Dynamic property OG — fetches property data, renders price, address, bed/bath/sqft. Attempts property imageUrl as background with navy gradient overlay, falls back to plain gradient. |
| `src/app/(marketing)/agents/[slug]/opengraph-image.tsx` | Dynamic agent OG — fetches agent, renders name, designations. Attempts agent photoUrl, falls back to initials on navy. |
| `src/lib/og-fonts.ts` | Shared font loading (DM Sans + Cormorant Garamond) for `ImageResponse`. |

### Files to Modify

| File | Change |
|------|--------|
| `src/lib/metadata.ts` | Make `image` param optional (default `undefined` instead of `/images/og/default.jpg`). When no image passed, omit `openGraph.images` so Next.js uses the nearest route-level `opengraph-image.tsx`. |

### Verification
- `npm run type-check` — zero errors
- `npm run build` succeeds
- Default OG image renders at `/__og` or via social share preview
- Property page OG shows price + address
- Agent page OG shows name + designations

---

## Checkpoint 4: Framer Motion Scroll Animations

### Goal
Subtle entrance animations (fade-in + slight upward slide) on below-fold content sections. Trigger once as elements enter viewport.

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/shared/animate-on-scroll.tsx` | `"use client"` wrapper: `motion.div` with `whileInView="visible"`, `viewport={{ once: true }}`, `variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}`. Props: `delay`, `duration`, `threshold`. ~35 lines. |
| `src/components/shared/stagger-children.tsx` | `"use client"` parent/child pair for staggered grids: `StaggerChildren` (container with `staggerChildren: 0.1`) + `StaggerItem` (child with fade-up). ~40 lines. |

### Files to Modify

| File | Change |
|------|--------|
| `src/components/home/promo-cards.tsx` | Wrap grid with `StaggerChildren`, each card with `StaggerItem` |
| `src/components/home/company-description.tsx` | Wrap left column + right stats grid each with `AnimateOnScroll` |
| `src/components/shared/cta-banner.tsx` | Wrap content with `AnimateOnScroll` |
| `src/app/(marketing)/page.tsx` | Wrap below-fold sections with `AnimateOnScroll` |
| `src/app/(marketing)/about/page.tsx` | Wrap content sections with `AnimateOnScroll` |
| `src/app/(marketing)/agents/[slug]/page.tsx` | Wrap bio section with `AnimateOnScroll` |
| `src/app/(marketing)/communities/[slug]/page.tsx` | Wrap below-fold sections |

### Important Notes
- Do NOT animate hero sections (already use CSS `animate-fade-in` with staggered delays)
- `AnimateOnScroll` is a client component but accepts server-rendered children — no hydration mismatch
- Framer Motion v11.17.0 already installed, no new dependencies

### Verification
- `npm run type-check` — zero errors
- `npm run build` succeeds
- Scroll through homepage — sections fade in smoothly
- No layout shift (elements start invisible but still take space via `opacity: 0`)
- No animations on hero/above-fold content

---

## Checkpoint 5: Old Site Redirects

### Goal
Research old homewisefl.com URL structure and add comprehensive 301 redirects.

### Research Approach
1. Wayback Machine CDX API: `web.archive.org/cdx/search/cdx?url=homewisefl.com/*&output=text&fl=original&collapse=urlkey`
2. Read `docs/temp/ihomefinder-feature-inventory.md` for old URL patterns
3. Cross-reference with current Next.js routes
4. Map unmatchable old URLs to homepage

### Files to Create/Modify

| File | Change |
|------|--------|
| `src/config/redirects.ts` | Create if redirect list exceeds ~20 entries. Export typed `Redirect[]` array. |
| `next.config.ts` | Expand `redirects()` — import from `src/config/redirects.ts` if extracted. Add categories: old WordPress paths, iHomefinder IDX paths (`/idx/*`, `/listing/*`), agent/contact/community path variants, alternate casing. |

### Expected Redirect Categories
- WordPress content paths → corresponding new pages
- iHomefinder IDX paths (`/idx/*`, `/listing/*`) → `/properties`
- Agent directory variants (`/our-agents`, `/our-agents/:slug`) → `/agents`, `/agents/:slug`
- Contact variants (`/contact-us`, `/contact`) → `/about#contact`
- Blog/category/tag paths → homepage

### Verification
- `npm run type-check` — zero errors
- `npm run build` succeeds
- `curl -I localhost:3000/our-agents` returns 308 to `/agents`
- Test 5+ key redirect URLs

---

## Checkpoint 6: Performance Optimization + Final Verification

### Goal
Add caching headers, resource hints, HSTS, and run final audit.

### Files to Modify

| File | Change |
|------|--------|
| `next.config.ts` | Add headers: `Permissions-Policy`, `Strict-Transport-Security`, `Cache-Control` for `/images/*` and `/_next/static/*` (immutable, 1yr max-age) |
| `src/app/layout.tsx` | Add `<link rel="dns-prefetch">` for images.unsplash.com, api.mapbox.com. Add `<link rel="preconnect">` for Supabase storage host. |

### Final Verification Checklist
1. `npm run type-check` — zero errors
2. `npm run lint` — zero errors
3. `npm run build` — successful, check for warnings
4. `/sitemap.xml` valid with all expected URLs
5. `/robots.txt` correct
6. Favicon in browser tab
7. JSON-LD present on property detail, agent profile, homepage (view source)
8. OG image renders on social share preview
9. Scroll animations trigger on homepage, about page
10. Old-site redirects return 308
11. Security + cache headers present (`curl -I`)

---

## File Summary

### New Files (12)

| File | Checkpoint |
|------|-----------|
| `src/app/sitemap.ts` | 1 |
| `src/app/robots.ts` | 1 |
| `src/app/icon.tsx` | 1 |
| `src/app/apple-icon.tsx` | 1 |
| `src/lib/json-ld.ts` | 2 |
| `src/components/shared/json-ld-script.tsx` | 2 |
| `src/app/opengraph-image.tsx` | 3 |
| `src/app/(marketing)/properties/[id]/opengraph-image.tsx` | 3 |
| `src/app/(marketing)/agents/[slug]/opengraph-image.tsx` | 3 |
| `src/lib/og-fonts.ts` | 3 |
| `src/components/shared/animate-on-scroll.tsx` | 4 |
| `src/components/shared/stagger-children.tsx` | 4 |

### Modified Files (~16)

| File | Checkpoints |
|------|------------|
| `src/lib/metadata.ts` | 3 |
| `src/app/(marketing)/page.tsx` | 2, 4 |
| `src/app/(marketing)/properties/[id]/page.tsx` | 2 |
| `src/app/(marketing)/agents/[slug]/page.tsx` | 2, 4 |
| `src/app/(marketing)/communities/[slug]/page.tsx` | 2, 4 |
| `src/app/(marketing)/about/page.tsx` | 2, 4 |
| `src/app/(marketing)/buyers/page.tsx` | 2 |
| `src/app/(marketing)/sellers/page.tsx` | 2 |
| `src/components/home/promo-cards.tsx` | 4 |
| `src/components/home/company-description.tsx` | 4 |
| `src/components/shared/cta-banner.tsx` | 4 |
| `next.config.ts` | 5, 6 |
| `src/app/layout.tsx` | 6 |

### Dependencies
- `schema-dts` (Checkpoint 2) — Google's official Schema.org TypeScript definitions
- No other new dependencies (Framer Motion v11.17.0 already installed)
