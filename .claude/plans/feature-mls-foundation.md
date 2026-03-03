# Phase 1: MLS Foundation — Implementation Plan

## Context

Homewise FL currently uses 12 hardcoded mock listings with no MLS integration, maps, or third-party data enrichment. The `PropertyProvider` interface at `src/providers/property-provider.ts` is designed for easy swap. This phase establishes the complete data foundation: a `Listing` Prisma model with all MLS fields, a provider factory pattern, Inngest background sync, Mapbox map search, advanced filters, Walk Score/GreatSchools integration, open house features, and IDX compliance.

**Outcome:** A fully functional property search with map, advanced filters, third-party data, and MLS sync infrastructure — working with seed data until real Stellar MLS credentials arrive.

---

## Checkpoint 1: Prisma Schema + Extended Property Interface + Provider Factory

### Goal
Establish the data foundation. New `Listing` model, extended `Property` interface (backward-compatible), provider factory, and seed script.

### Install Dependencies
```
inngest mapbox-gl @types/mapbox-gl
```

### Prisma Schema Changes (`prisma/schema.prisma`)
Add models:
- **`Listing`** — Full MLS listing (50+ fields)
- **`WalkScoreCache`** — Address-keyed cache for Walk Score API results
- **`SchoolCache`** — Lat/lng-keyed cache for GreatSchools API results
- **`SyncState`** — Tracks MLS sync health

### Files to Create
- `src/providers/index.ts` — Provider factory
- `src/providers/stellar-mls-provider.ts` — Reads from Prisma Listing table
- `src/types/reso.ts` — RESO Web API types
- `src/lib/format.ts` — Shared formatPrice utility
- `prisma/seed-listings.ts` — Seeds Listing table from mock data

### Files to Modify
- `src/providers/property-provider.ts` — Extend Property + PropertyFilters
- `src/app/(marketing)/properties/page.tsx` — Switch to provider factory
- `src/app/(marketing)/properties/[id]/page.tsx` — Switch to provider factory
- `src/app/api/properties/route.ts` — Switch to provider factory
- `src/schemas/property-filter.schema.ts` — Add new filter fields

---

## Checkpoint 2: MLS Grid Sync Infrastructure (Inngest)

### Goal
Inngest cron job syncs MLS Grid RESO Web API data every 15 minutes.

### Files to Create
- `src/inngest/client.ts`
- `src/inngest/functions/mls-sync.ts`
- `src/lib/mls-grid.ts`
- `src/app/api/inngest/route.ts`
- `src/app/api/admin/sync/route.ts`

---

## Checkpoint 3: Map-Based Search + Polygon Draw

### Goal
Split-screen map + listing cards on `/properties`.

---

## Checkpoint 4: Advanced Filters + Sorting + Status Badges

### Goal
Full "More Filters" accordion, sort selector, URL persistence, sold/pending status badges.

---

## Checkpoint 5: Walk Score + GreatSchools + Open Houses + Photo Gallery

### Goal
Listing detail enriched with third-party data.

---

## Checkpoint 6: Featured Listings + Agent Listings + IDX Compliance

### Goal
Featured listings by office MLS ID. Agent profile pages show their listings. Full IDX compliance.
