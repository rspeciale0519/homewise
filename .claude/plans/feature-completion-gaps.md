# Homewise FL — Completion Pass: 3 Remaining Gaps

## Context

A comprehensive project audit (2026-03-21) identified 3 feature gaps remaining in an otherwise complete platform. All gaps are independent — each ships as its own feature branch and PR. This document covers the approved design for all 3, in recommended implementation order.

**Audit reference:** `dev-docs/ai-platform-implementation-tasks.md` (Phases 1–8 checked)
**Strategy reference:** `dev-docs/ai-model-strategy.md` (Gap 3)

---

## Gap 1: Trend Charts

**Branch:** `feature/trend-charts`
**Affects:** 2 pages — market stats + team performance admin

### Design

**Library:** Recharts (React-native, strict TypeScript types, full brand color control, `'use client'` components)

#### Market Stats Page (`/market/[city]`)

- **Placement:** Area chart **replaces** the existing "6-Month Trends" table (lines 71-101 in `market-stats-view.tsx`) — the table is informative but less visual; the chart conveys trends more intuitively and the delta indicators preserve the key numbers
- **Chart type:** `<ComposedChart>` with two `<Area>` series, `type="monotone"` for smooth curves
- **Series 1:** Median price — navy `#2E276D`, gradient fill (18% → 0% opacity top to bottom)
- **Series 2:** Avg days on market — crimson `#DB2526`, lighter gradient fill (12% → 0%), dashed stroke
- **Grid:** `<CartesianGrid>` with `strokeDasharray="3 3"`, using `var(--border)` color — minimal, horizontal lines only
- **Legend:** Rendered in the chart section header (not inside the Recharts canvas) — two inline color indicators
- **End-point callouts:** Current value labels at the rightmost data point for each series
- **Delta indicators:** Below the chart, two stat pills showing `↑/↓ X% vs 6 months ago` with green/red coloring
- **All text:** CSS variables only (`var(--text-primary)`, `var(--text-secondary)`) — no hardcoded hex for text
- **Data source:** `stats` prop already available in `MarketStatsView` (passed from parent server component); reverse to ascending order before passing to chart (currently arrives desc)
- **New component:** `src/components/market/market-trend-chart.tsx` (client component)

#### Team Performance Page (`/admin/team-performance`)

- **Placement:** Below the existing "Closings by Agent" horizontal bar section, still inside the `{data && !loading && (...)}` block
- **Data source:** `data.agents` already in `TeamPerformanceView` client state (fetched via `useEffect` from `/api/admin/team-performance`) — no additional server fetch or prop drilling needed
- **Chart type:** `<BarChart>` with grouped bars per agent
- **Metric toggle:** Three buttons — Leads / Closings / Pipeline Value — local state in `TeamPerformanceChart`, no server round-trip
- **Color:** Navy `#2E276D` bars, crimson `#DB2526` accent on hovered bar
- **New component:** `src/components/admin/team-performance-chart.tsx` (client component); receives `agents: AgentMetrics[]` as prop

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/market/market-trend-chart.tsx` | Create |
| `src/components/admin/team-performance-chart.tsx` | Create |
| `src/app/(marketing)/market/[city]/market-stats-view.tsx` | Modify — replace 6-month trends table (lines 71-101) with `<MarketTrendChart stats={[...stats].reverse()} />` |
| `src/app/admin/team-performance/team-performance-view.tsx` | Modify — add `<TeamPerformanceChart agents={data.agents} />` below the closings bar section |
| `package.json` | Add `recharts` |

### Verification

1. `npm run type-check` — zero errors
2. `npm run lint` — zero errors
3. Navigate to `/market/orlando` (or any seeded city) — chart appears below stat cards with smooth curves and delta indicators
4. Navigate to `/admin/team-performance` — bar chart appears below table, metric toggle switches between leads/closings/pipeline
5. Toggle OS dark mode — all text remains legible, chart uses CSS variables correctly

---

## Gap 2: CMA PDF Export

**Branch:** `feature/cma-pdf-export`
**Affects:** New CMA tool admin page + new PDF API route

### Design

**Library:** `@react-pdf/renderer` (server-side PDF generation, no browser required)

#### PDF Layout (US Letter, single page)

1. **Header band** — full-width navy `#2E276D` background; left: "HOMEWISE REALTY" + "Comparative Market Analysis" subtitle; right: agent name, email, phone from authenticated user's agent profile
2. **Subject property block** — address (large, bold), bed/bath/sqft/year built inline stats
3. **Comps table** — up to 8 rows; columns: Address, Beds, Baths, Sqft, Close Price, Close Date, DOM; alternating row shading for readability; column headers in navy
4. **Price recommendation band** — full-width crimson `#DB2526` background; left: "Recommended List Price" label; right: price in large white bold type
5. **AI narrative** — market analysis paragraphs, body text in DM Sans
6. **Footer** — "Prepared by Homewise Realty Group · homewisefl.com · [date generated]"

**Fonts:** Cormorant Garamond (headings) and DM Sans (body) embedded via `@react-pdf/renderer` font registration.

#### CMA Tool UI (New Page)

The `/api/ai/cma` route exists and works but has **no existing UI**. The agent-hub (`/dashboard/agent-hub`) is a static resources hub — not the right home. Create a dedicated admin CMA tool page:

- **Route:** `src/app/admin/cma/page.tsx` — admin/agent only (`requireAdmin()` or check role)
- **Client component:** `src/app/admin/cma/cma-tool-view.tsx`
- **Flow:**
  1. Address form (address, city, zip, beds, baths, sqft, property type)
  2. "Generate CMA" button → POST to existing `/api/ai/cma` → display result
  3. Result view shows: estimated value range (low/mid/high), comps table, pricing recommendation, market narrative, key findings
  4. "Download PDF" button → POST to `/api/ai/cma/pdf` with the CMA JSON payload → downloads PDF

#### PDF API Route

- **Route:** `POST /api/ai/cma/pdf`
- **Auth:** `requireAuthApi()` — agents only
- **Approach:** **No CmaReport Prisma model needed.** The `/api/ai/cma` route is stateless and returns data directly. The PDF route accepts the same CMA result JSON as the POST body → passes it directly to `<CmaReportDocument>` → streams as `application/pdf`
- **Why POST not GET:** The CMA result is not persisted to the database, so there is no ID to look up. Accepting the payload avoids adding a DB model and keeps Gap 2 self-contained
- **Content-Disposition:** `attachment; filename="cma-{address}.pdf"` — triggers browser download
- **No storage:** PDF generated on-the-fly, not saved to Supabase Storage

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/pdf/cma-report-document.tsx` | Create — `@react-pdf/renderer` React component |
| `src/app/api/ai/cma/pdf/route.ts` | Create — POST handler, auth, accepts CMA JSON body, streams PDF |
| `src/app/admin/cma/page.tsx` | Create — admin CMA tool page (server component shell) |
| `src/app/admin/cma/cma-tool-view.tsx` | Create — client component with form, result display, Download PDF button |
| `package.json` | Add `@react-pdf/renderer` |

### Verification

1. `npm run type-check` — zero errors
2. `npm run lint` — zero errors
3. Navigate to `/admin/cma` → CMA address form appears
4. Fill form → click Generate → CMA result appears inline (value range, comps, narrative)
5. Click "Download PDF" → browser downloads a PDF (POST triggers download, not a new tab)
6. PDF contains: Homewise header, subject property, comps table, crimson price band, AI narrative, footer
7. Print the PDF — renders cleanly on US Letter without overflow
8. Test with missing comps (0 results) — PDF renders gracefully with "No comparable sales found" row

---

## Gap 3: AI Model Tiering (Admin-Configurable)

**Branch:** `feature/ai-model-tiering`
**Affects:** AI service layer + admin UI

### Design

#### Database

New Prisma model:

```prisma
model AiFeatureConfig {
  id         String   @id @default(cuid())
  featureKey String   @unique  // e.g. "cma_report", "public_chatbot"
  label      String            // human-readable: "CMA Report Generator"
  model      String            // e.g. "claude-sonnet-4-20250514", "gpt-5-mini"
  tier       String            // "1", "2", "3" — display only
  updatedAt  DateTime @updatedAt

  @@index([featureKey])
}
```

Seeded with 14 rows (11 API features + 3 chatbots) using the default 3-tier assignments from `dev-docs/ai-model-strategy.md`.

#### Default Tier Assignments (seed data)

| Feature Key | Label | Default Model | Tier |
|-------------|-------|---------------|------|
| `public_chatbot` | Public Site Chatbot | claude-sonnet-4-20250514 | 1 |
| `agent_website_chatbot` | Agent Website Chatbot | claude-sonnet-4-20250514 | 1 |
| `dashboard_chatbot` | Dashboard Assistant | gpt-5-mini | 2 |
| `cma_report` | CMA Report Generator | gpt-5-mini | 2 |
| `campaign_generator` | Campaign Generator | gpt-5-mini | 2 |
| `listing_description` | Listing Description | gpt-5-mini | 2 |
| `meeting_prep` | Meeting Prep Brief | gpt-5-mini | 2 |
| `mortgage_advisor` | Mortgage Advisor | gpt-5-mini | 2 |
| `home_valuation` | Home Valuation | gpt-5-mini | 2 |
| `social_post` | Social Post Generator | gpt-5-mini | 2 |
| `follow_up_draft` | Follow-Up Draft | gpt-5-mini | 2 |
| `market_insights` | Market Insights | gpt-5-nano | 3 |
| `lead_scoring` | Lead Scoring | gpt-5-nano | 3 |
| `listing_insights` | Listing Insights | gpt-5-nano | 3 |

#### AI Service Layer (`src/lib/ai/index.ts`)

- Add `openAiComplete()` function alongside existing `aiComplete()` — same interface (`AiCompletionInput` / `AiCompletionResult`), uses the `openai` SDK already installed
- Add `getModelForFeature(featureKey: string): Promise<string>` — reads from DB, caches result in a module-level `Map<string, { model: string; expiresAt: number }>` with a 5-minute TTL; falls back to `"claude-sonnet-4-20250514"` if the key is not found
- Add `invalidateModelCache()` — clears the module-level cache Map; called by the admin save route
- Add `aiCompleteForFeature(featureKey: string, opts: Omit<AiCompletionInput, "model">): Promise<AiCompletionResult>` — unified dispatch function:
  1. Calls `getModelForFeature(featureKey)` to get the assigned model
  2. Routes by model name prefix: names starting with `"claude-"` → `aiComplete()`; names starting with `"gpt-"`, `"o1-"`, `"o3-"`, or `"o4-"` → `openAiComplete()`
  3. Passes `featureKey` as the `feature` field for usage logging
- Each of the 11 AI API routes replaces its direct `aiComplete()` call with `aiCompleteForFeature(featureKey, opts)`

#### Chatbot Engine (`src/lib/chatbot/engine.ts`)

- The `ChatbotEngine` currently hardcodes `model: "claude-sonnet-4-20250514"` in two places (main call + tool loop)
- Add `featureKey` derivation from `this.context.config`:
  - `"public"` → `"public_chatbot"`
  - `"agent"` → `"agent_website_chatbot"`
  - `"dashboard"` → `"dashboard_chatbot"`
- Call `getModelForFeature(featureKey)` once at the start of `chat()` and pass the resolved model to both `anthropic.messages.create()` calls
- **Note:** The chatbot engine uses Anthropic's streaming tool-use API directly (`anthropic.messages.create()` with tool loops), so it cannot use the unified `aiCompleteForFeature()` helper — model resolution is the only change here. If a non-Anthropic model is ever configured for a chatbot tier, that migration is out of scope for this gap.

#### `src/lib/ai-pricing.ts`

Add GPT-5 Mini and GPT-5 Nano pricing constants (from `dev-docs/ai-model-strategy.md`):
- `gpt-5-mini`: input $0.25/1M, output $2.00/1M
- `gpt-5-nano`: input $0.05/1M, output $0.40/1M

#### Admin UI — New "Model Config" Tab on `/admin/ai-usage`

The existing `/admin/ai-usage` page gains a tab bar: **Usage** (existing content) | **Model Config** (new).

Model Config tab contains:
- **Summary bar** at top: projected total monthly spend across all 14 features (calculated from `AiUsageLog` avg tokens × current model pricing)
- **Feature table** — one row per feature:
  - Feature label
  - Tier badge (1 / 2 / 3)
  - Model dropdown — options: all supported models with pricing shown inline (e.g. "Claude Sonnet 4.6 — $3.00 / $15.00")
  - Est. monthly cost (calculated from recent usage)
- **Save Changes** button — PATCH to `/api/admin/ai-usage/model-config`, writes to `AiFeatureConfig`, calls `invalidateModelCache()`
- Changes are not applied until Save is clicked — no auto-save

#### New API Route

- `GET /api/admin/ai-usage/model-config` — returns all 14 `AiFeatureConfig` rows
- `PATCH /api/admin/ai-usage/model-config` — accepts array of `{ featureKey, model, tier }`, upserts to DB, invalidates cache

### Files to Create/Modify

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Add `AiFeatureConfig` model |
| `prisma/seed.ts` | Add 14 seed rows |
| `src/lib/ai/index.ts` | Add `openAiComplete()`, `getModelForFeature()`, `invalidateModelCache()`, `aiCompleteForFeature()` |
| `src/lib/ai-pricing.ts` | Add GPT-5 Mini + Nano pricing constants |
| `src/app/api/admin/ai-usage/model-config/route.ts` | Create — GET + PATCH |
| `src/app/admin/ai-usage/ai-usage-view.tsx` | Modify — add tab bar, Model Config tab |
| `src/app/api/ai/*/route.ts` (11 routes) | Modify — replace `aiComplete()` calls with `aiCompleteForFeature(featureKey, opts)` |
| `src/lib/chatbot/engine.ts` | Modify — derive featureKey from `context.config`, call `getModelForFeature()`, pass result to both `anthropic.messages.create()` calls |
| `package.json` | No change — `openai` SDK already installed |

### Verification

1. `npm run type-check` — zero errors
2. `npm run lint` — zero errors
3. `npx prisma db push` — schema applies cleanly
4. `npm run db:seed` — 14 `AiFeatureConfig` rows created
5. Navigate to `/admin/ai-usage` → "Model Config" tab appears
6. Change a feature's model → click Save → success toast
7. Trigger that AI feature → `AiUsageLog` records the new model name
8. Change model back → verify cache invalidation works (no stale model used)

---

## Implementation Order

1. **Gap 1** (`feature/trend-charts`) — pure UI, no schema changes, lowest risk
2. **Gap 2** (`feature/cma-pdf-export`) — new dependency + API route, self-contained
3. **Gap 3** (`feature/ai-model-tiering`) — schema change + touches 11 existing routes, most careful

Each branch off `develop`, PR back to `develop`.
