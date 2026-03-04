# Homewise FL — AI-Powered Real Estate Platform Design

## Context

Home Wise Realty Group's website currently uses mock property data with no MLS integration, no AI capabilities, and no third-party service integrations (email, SMS, maps). The brokerage is a licensed FL broker preparing to join Stellar MLS via ORRA for direct API access through MLS Grid (RESO Web API).

This design defines the complete feature set for transforming the site into a full-featured, AI-powered real estate platform — combining the best features from platforms like iHomefinder with custom AI capabilities that go beyond any existing IDX product.

**Intended outcome:** A platform where buyers/sellers get a Redfin-level search experience enhanced by conversational AI, and agents get a productivity suite that automates lead nurturing, content creation, and market analysis.

---

## Architecture Foundation

| Layer | Technology | Purpose |
|-------|-----------|---------|
| AI SDK | Vercel AI SDK (`ai`) | Provider-agnostic LLM calls, streaming, function calling |
| LLM | OpenAI GPT-4o (swappable) | Chat, content generation, analysis |
| Embeddings | OpenAI text-embedding-3-small | Semantic search, listing similarity |
| Vector DB | Supabase pgvector extension | Vector storage alongside relational data |
| Background Jobs | Inngest | MLS sync, alerts, campaigns, embedding generation |
| Email | Resend + React Email | Transactional + marketing email |
| SMS | Twilio | Text campaigns, agent notifications |
| Maps | Mapbox GL JS | Property map search, polygon drawing, neighborhood overlays |
| MLS Data | Stellar MLS via MLS Grid | RESO Web API, OAuth 2.0, 15-min polling |

**AI Service Layer:** All AI features share `src/lib/ai/` with prompt templates, token tracking, rate limiting, and response caching.

---

## Feature Set — Organized by Category

### A. MLS Data Integration (Foundation — Everything Depends on This)

**A1. Stellar MLS Provider**
- `StellarMlsProvider` implements existing `PropertyProvider` interface
- MLS Grid RESO Web API with OAuth 2.0 authentication
- 15-minute incremental data sync via Inngest cron
- Listing data replicated to Supabase PostgreSQL
- Extended `Property` model: MLS ID, listing agent, photo gallery, HOA, year built, lot size, description, coordinates
- Files: `src/providers/stellar-mls-provider.ts`, new Prisma `Listing` model

**A2. Map-Based Search**
- Mapbox GL JS interactive map with listing pins
- Pin clustering for dense areas (supercluster)
- "Search this area" on map pan/zoom
- Split-screen layout: map + listing cards
- PostGIS for geospatial queries (`ST_Within`, `ST_DWithin`)

**A3. Polygon/Draw Search**
- Mapbox Draw plugin for freehand boundary drawing
- GeoJSON polygon stored with saved searches
- PostGIS `ST_Within()` for spatial filtering

**A4. Advanced Search Filters**
- Extended filters: lot size, year built, amenities (pool, waterfront, garage), school district, HOA amount, new construction, open houses only, days on market
- Collapsible "More Filters" accordion
- URL query parameter persistence for shareable search links

**A5. Walk Score + GreatSchools**
- Walk Score API integration on listing detail pages
- GreatSchools API for nearby school ratings by type and distance
- Cached in DB by address (scores rarely change)

**A6. Open House Search**
- Open house schedule data from MLS feed
- Filter results to open-house-only
- Date/time display on listing detail pages
- "Open Houses This Weekend" widget

**A7. Featured Listings (Own Listings)**
- Auto-populated by agent/office MLS ID
- Active, pending, and sold listings
- `/my-listings` page per agent + embeddable widget

**A8. Sold/Pending Data**
- Status badges on listing cards (Under Contract, Sold)
- Sold listings in search results (where MLS permits)
- Sold history on agent bio pages

---

### B. Lead Capture & CRM

**B1. Visitor Registration Wall**
- Configurable trigger: after N listing views (default: 5)
- Soft (dismissable) or forced modes
- Modal/slide-in display
- Supabase Auth for registration
- A/B testable threshold settings

**B2. Schedule a Showing**
- Pre-filled form on listing pages (address, MLS#)
- Name, email, phone, preferred date/time
- Instant agent notification (email + push)
- Auto-creates CRM lead record

**B3. "What's My Home Worth?" Widget**
- Multi-step seller lead form: property details -> contact info -> comp results
- Creates seller lead + triggers seller drip campaign
- Highest-converting seller lead tool

**B4. Lead Source Tracking**
- `?source=` URL parameter captured in cookie
- Written to contact record on registration
- Source breakdown reporting in admin dashboard

**B5. Contact/Lead Database (CRM)**
- `Contact` model: name, email, phone, source, status, type (buyer/seller/both), tags, assigned agent, score
- Full activity timeline per contact
- Admin CRM at `/admin/contacts`
- Search, filter, sort, CSV export

**B6. Contact Activity Timeline**
- Every user action logged: listing views, searches, saves, email opens/clicks, form submissions, notes
- Chronological display in CRM contact detail
- Powers lead scoring and AI follow-up drafts

**B7. Lead Stages (Pipeline)**
- Kanban board: New Lead -> Contacted -> Searching -> Showing -> Offer -> Under Contract -> Closed/Lost
- Drag-and-drop stage changes
- Pipeline value aggregation per stage

**B8. Tags & Segmentation**
- Multi-tag system (buyer, seller, investor, relocating, first-time, etc.)
- Tag-based filtering and bulk campaign assignment

**B9. Tasks & Reminders**
- Tasks with due dates linked to contacts
- Google Calendar sync via Google Calendar API
- Daily task digest email

**B10. Lead Routing**
- Auto-assignment rules: by location, price range, source, property type, language
- Round-robin option for equal distribution
- 5-minute accept timeout -> re-route

---

### C. Marketing Automation

**C1. Drip Email Campaigns**
- Campaign builder: N emails with configurable delays
- Auto-assignment by lead source/type/stage
- Personalization tokens (name, agent name, area of interest)
- Pre-built templates: New Buyer, Active Buyer, Seller Lead, Past Client, Open House Follow-up

**C2. Daily New Listing Alerts**
- Inngest cron: query new listings since last run matching each saved search
- Branded email with photos, prices, links back to site
- Unsubscribe link per alert

**C3. Price Change Alerts**
- Price change detection during MLS sync
- Alert to users with matching saved searches or saved listings

**C4. SMS/Text Campaigns**
- Twilio integration with dedicated 10-digit numbers
- Text steps in drip campaigns alongside email
- Legal consent capture at registration
- Incoming reply webhook

**C5. Behavioral Trigger Automation**
- Rules engine: condition -> action pairs
- Examples: listing saved -> similar listings email; 30-day inactive returns -> re-engagement + agent alert
- Configurable in admin

**C6. Birthday/Anniversary Automations**
- Date fields on contacts
- Daily cron for birthday and closing anniversary greetings
- Soft CTA for referrals

**C7. Broadcast/Mass Emails**
- Select audience by segment/tag
- Compose or select template
- Batch sending via Resend
- Per-broadcast delivery/open/click tracking

**C8. Email Open & Click Tracking**
- Resend webhooks -> `EmailEvent` table
- Updates lead score
- Fires behavioral automation rules

---

### D. Market Statistics (MarketBoost Equivalent)

**D1. Market Statistics Pages**
- Dynamic pages per city/zip/neighborhood
- Active count, median list/sold price, sale-to-list ratio, avg DOM, months of inventory
- 6-month trend charts (Chart.js)
- Daily aggregation cron via Inngest

**D2. Custom Market Reports**
- Agent-defined markets (any criteria set)
- Live report pages auto-generated
- Embeddable widget components

**D3. Monthly Market Stats Email**
- First-of-month cron
- Area statistics with charts
- Agent-branded template

---

### E. AI Features — Public-Facing

**E1. AI Property Search Assistant (Chatbot)**
- Floating chat widget on search pages + dedicated `/search/assistant` page
- Natural language query parsing via function calling
- Conversational follow-ups: refine search, compare properties, ask about neighborhoods
- Streams responses via Vercel AI SDK `useChat`
- Conversation persisted per session (anonymous) or per user (logged in)
- Graceful fallback: "Let me connect you with an agent" for out-of-scope questions
- Files: `src/components/ai/chat-widget.tsx`, `src/app/api/ai/chat/route.ts`

**E2. AI Home Valuation Narrative**
- Extends existing Home Evaluation form
- Pulls sold comps from MLS by zip + beds/baths + sqft range
- AI generates personalized valuation narrative with market context
- Displayed as branded report page + emailed to seller
- Files: `src/app/api/ai/valuation/route.ts`, `src/app/(marketing)/home-evaluation/results/[id]/page.tsx`

**E3. AI Mortgage Scenario Advisor**
- Natural language or structured input for financial situation
- AI estimates max purchase price, models 3 scenarios (conservative/moderate/stretch)
- Explains relevant loan types (FHA, conventional, VA)
- Monthly payment breakdowns per scenario
- CTA: "Get pre-approved" -> lender partner connection
- Files: `src/app/(marketing)/buyers/mortgage-advisor/page.tsx`, `src/app/api/ai/mortgage/route.ts`

**E4. AI Market Insights (Lead Funnel)**
- Integrated into market stats pages and chatbot
- Gives compelling data previews: "Prices up 3.2% in Oviedo, homes selling in 18 days..."
- Every response includes CTA to connect with a Homewise agent
- Builds trust + generates leads without replacing agent expertise
- Files: `src/components/ai/market-insight-preview.tsx`

---

### F. AI Features — Agent Tools

**F1. AI Lead Scoring & Prioritization**
- Point-based scoring: listing views (+1), saves (+3), searches (+5), email opens (+2), clicks (+5), showing requests (+10), forms (+10)
- Time-decay multiplier (recent activity weighted more)
- AI-generated 2-sentence priority brief per lead
- Dashboard sorted by score
- Files: `src/lib/ai/lead-scoring.ts`, scoring cron via Inngest

**F2. AI Follow-Up Draft Generator**
- One-click in CRM contact detail
- AI reads lead's activity timeline
- Drafts personalized email or text referencing specific listings, price changes, behavior
- Contextual based on lead stage
- Agent reviews, edits, sends from dashboard
- Files: `src/app/api/ai/follow-up/route.ts`, `src/components/admin/ai-follow-up.tsx`

**F3. AI CMA Generator**
- Agent inputs property address
- System pulls 5-8 comps from MLS data
- AI generates CMA report with pricing recommendation and market narrative
- Exportable as branded PDF
- Files: `src/app/api/ai/cma/route.ts`, `src/app/dashboard/agent-hub/cma/page.tsx`

**F4. AI Listing Performance Insights**
- For agent's own listings: views, saves, showing requests vs comparable listings
- AI suggests actions: price adjustment, new photos, open house
- Weekly digest email to listing agent
- Files: `src/lib/ai/listing-insights.ts`, weekly cron via Inngest

**F5. AI Listing Description Generator (Agent-Only)**
- Agent inputs property details or system pulls from MLS
- AI generates 2-3 description variations (lifestyle, features/specs, investment)
- Agent selects, edits, copies to MLS
- Tone/style configurable per agent
- Files: `src/app/dashboard/agent-hub/listing-writer/page.tsx`, `src/app/api/ai/listing-description/route.ts`

**F6. AI Email Campaign Content Generator**
- Agent selects campaign type + target audience
- AI generates full 5-8 email drip sequence with suggested delays
- Personalization tokens + smart content blocks with listing recommendations
- Agent reviews/edits before activating
- Files: `src/app/api/ai/campaign/route.ts`

**F7. AI Social Media Post Generator**
- Agent selects: listing post, market update, or engagement content
- AI generates post copy with variations, hashtags, platform-specific formatting
- Image selection from listing photos
- Files: `src/app/dashboard/agent-hub/social-posts/page.tsx`, `src/app/api/ai/social/route.ts`

**F8. AI Meeting Prep Brief**
- Before scheduled showings/meetings
- Compiles: client search history, saved listings, property comps, neighborhood stats, talking points
- One-page view, mobile-accessible
- Files: `src/app/dashboard/agent-hub/meeting-prep/page.tsx`, `src/app/api/ai/meeting-prep/route.ts`

---

### G. Behind-the-Scenes AI

**G1. Semantic Property Search (Embeddings)**
- Every listing description embedded via text-embedding-3-small
- Stored in Supabase pgvector column on `Listing` model
- "Cozy starter home near parks" matches on meaning, not keywords
- Works alongside traditional filter search to enhance results
- Embedding generation via Inngest on MLS sync

**G2. AI Email Subject Lines (A/B Testing)**
- For every automated email, AI generates 2-3 subject line variations
- System randomly assigns variation per recipient
- Tracks open rates per variation
- Over time, learns what works for the audience

**G3. Smart Alert Matching with Rigidity Slider**
- User-controlled slider on saved search settings
- **Strict (left):** Exact filter matches only — traditional IDX behavior
- **Balanced (center):** Exact matches + "You might also like" AI suggestions (adjacent areas, slight variations)
- **Discovery (right):** AI-driven matching from behavioral patterns, loose on filters
- Default: slightly left of center
- Setting stored on `SavedSearch` record as `matchingMode: 'strict' | 'balanced' | 'discovery'` + numeric `rigidity: 0-100`
- Alert processing cron uses setting to determine matching algorithm

**G4. AI SEO Content Generation**
- Auto-generates content for neighborhood pages (~50+ areas), market reports, community guides
- Monthly refresh for market-sensitive content
- Agent/admin reviews before publishing — never fully automated
- Files: `src/app/api/ai/content/route.ts`

---

### H. Website & SEO Features

**H1. Neighborhood/Community Pages**
- CMS-editable rich text + AI-generated content
- Embedded listing search component per neighborhood
- Market stats widget
- Schema.org structured data
- Routes: `/neighborhoods/[slug]`

**H2. SEO Infrastructure**
- Clean URLs: `/homes-for-sale/123-main-st-city-state`
- Unique title/meta per listing via `generateMetadata()`
- `schema.org/RealEstateListing` JSON-LD on all listing pages
- Auto-generated XML sitemap via `next-sitemap`
- Open Graph tags for social sharing

**H3. Agent Bio Pages (Enhanced)**
- Auto-populated with agent's active/pending/sold listings from MLS
- AI-generated market expertise summary
- Social links, certifications, service areas

---

### I. Team & Brokerage Tools

**I1. Smart Lead Routing**
- Auto-assignment rules by location, price, source, type, language
- Round-robin option
- 5-minute accept timeout -> re-route

**I2. Team Performance Dashboard**
- Per-agent metrics: leads, contacts, showings, offers, closings, pipeline value
- Comparative reporting with Chart.js
- Date range selector

**I3. Agent-Branded Email Nurturing**
- Emails from brokerage system appear from individual assigned agent
- Agent name, photo, signature in template
- Brokerage retains lead ownership

---

## Implementation Phasing (High-Level)

### Phase 1: MLS Foundation
MLS Grid integration, extended Listing model, map search, advanced filters, Walk Score, GreatSchools, open house data, sold/pending data. This is the prerequisite for everything else.

### Phase 2: CRM & Lead Capture
Contact model, activity timeline, lead stages pipeline, registration wall, showing request, valuation widget, lead source tracking, tags, tasks.

### Phase 3: Marketing Automation
Email infrastructure (Resend), drip campaigns, daily listing alerts, price change alerts, SMS (Twilio), behavioral triggers, broadcast emails, email tracking.

### Phase 4: AI — Public-Facing
AI chatbot (search assistant), AI valuation narrative, AI mortgage advisor, AI market insights (lead funnel), semantic search (embeddings).

### Phase 5: AI — Agent Tools
AI lead scoring, follow-up draft generator, CMA generator, listing performance insights, listing description writer, campaign content generator, social post generator, meeting prep briefs.

### Phase 6: Behind-the-Scenes AI
Smart alert matching with rigidity slider, AI email subject line A/B testing, AI SEO content generation.

### Phase 7: Market Statistics
Market stats pages, custom market reports, monthly market stats emails, embeddable widgets.

### Phase 8: Team & Brokerage
Lead routing, team performance dashboard, agent-branded nurturing.

### Future (Deferred)
- AI Neighborhood Guide (feature #2)
- AI Listing Recommendations based on behavior (feature #3)
- Mobile app (React Native)
- Third-party CRM integrations (Follow Up Boss, Zapier)
- Social media direct posting (Facebook Graph API)

---

## Key Files to Create/Modify

### New Infrastructure
- `src/lib/ai/index.ts` — AI service layer (prompts, tokens, rate limiting, caching)
- `src/lib/ai/embeddings.ts` — Vector embedding generation and search
- `src/lib/email/index.ts` — Resend client and template rendering
- `src/lib/sms/index.ts` — Twilio client
- `src/lib/maps/index.ts` — Mapbox configuration
- `src/lib/inngest/client.ts` — Background job client
- `src/lib/inngest/functions/` — MLS sync, alerts, campaigns, scoring crons

### New Prisma Models
- `Listing` — Full MLS listing with coordinates, photos, embedding vector
- `Contact` — CRM lead/contact record
- `ActivityEvent` — Polymorphic activity log
- `Campaign`, `CampaignEmail`, `CampaignEnrollment` — Drip campaigns
- `EmailEvent` — Open/click/bounce tracking
- `MarketStats` — Aggregated market data per area
- `Neighborhood` — Community page content
- `AutomationRule` — Behavioral trigger rules
- `Task` — Agent follow-up tasks
- `CmaReport` — Saved CMA reports

### Existing Files to Modify
- `src/providers/property-provider.ts` — Extend Property interface with MLS fields
- `prisma/schema.prisma` — Add all new models
- `src/app/dashboard/layout.tsx` — Add new nav items for agent AI tools
- `src/app/admin/` — Add CRM, campaigns, automation admin pages
- `package.json` — Add: `ai`, `@ai-sdk/openai`, `resend`, `react-email`, `twilio`, `mapbox-gl`, `inngest`, `@supabase/postgrest-js` (pgvector queries)

---

## Verification Plan

Each phase will be verified with:
1. `npm run type-check` — zero TypeScript errors
2. `npm run lint` — zero lint errors
3. `npm run build` — successful production build
4. Manual testing via dev-browser for UI features
5. API endpoint testing via curl/Postman for backend features
6. MLS data verification: confirm listings display with real data
7. AI feature testing: verify streaming responses, function calling, embedding search
8. Email delivery verification: Resend dashboard confirms sends
9. End-to-end user flow testing: search -> register -> save -> receive alert
