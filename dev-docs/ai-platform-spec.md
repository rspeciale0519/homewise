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
| File Storage | Supabase Storage | Training videos, documents, agent uploads, PDF exports |

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

**B7. Lead Stages Pipeline + Transaction Tracker**
- Kanban board: New Lead -> Contacted -> Searching -> Showing -> Offer -> Under Contract -> Closed/Lost
- Drag-and-drop stage changes
- Pipeline value aggregation per stage
- **Transaction Tracker (activates when deal moves to "Under Contract"):**
  - Milestone timeline: Inspection Period, Appraisal Ordered, Appraisal Complete, Financing Contingency Cleared, Clear to Close, Closing Day
  - Each milestone has a target date, completion checkbox, and optional notes
  - Document checklist per transaction: purchase agreement, inspection report, appraisal, title commitment, closing disclosure
  - Visual progress bar showing % of milestones complete
  - Agent gets automated reminder notifications as milestone deadlines approach
  - Transaction summary card on contact detail: address, purchase price, closing date, days to close
  - Closed deals auto-populate sold history on agent bio page (A8)
- Files: `src/app/dashboard/pipeline/page.tsx`, `src/components/admin/transaction-tracker.tsx`, `src/app/api/contacts/[id]/transaction/route.ts`

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
- **This is one of three chatbot surfaces sharing a single engine — see Section J for the full architecture**

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
- Exportable as branded PDF via `@react-pdf/renderer`
- Files: `src/app/api/ai/cma/route.ts`, `src/app/dashboard/agent-hub/cma/page.tsx`, `src/components/pdf/cma-report.tsx`

**F4. AI Listing Performance Insights + Seller Portal**
- Two views built on one shared data layer:
- **Agent view (full AI dashboard):**
  - Views, saves, showing requests, inquiries for each active listing
  - Benchmarked against comparable listings currently on market (avg views/saves at same price range and area)
  - AI-generated action suggestions: price adjustment, new photos, open house scheduling, description refresh
  - Trend charts: daily views over listing lifetime
  - Weekly digest email to listing agent with performance summary and top recommended action per listing
- **Seller portal (read-only, shareable link):**
  - Accessible via unique token URL — no login required for seller
  - Shows: total listing views, saves, showing requests, and inquiries received
  - Simple sparkline chart of views over time
  - "Your listing is performing above/below average for similar homes" plain-language summary
  - No AI suggestions visible (agent-only) — purely informational for the seller
  - Agent can enable/disable portal per listing from their dashboard
- Files: `src/lib/ai/listing-insights.ts`, `src/app/dashboard/listings/[id]/performance/page.tsx`, `src/app/seller-portal/[token]/page.tsx`, `src/app/api/ai/listing-insights/route.ts`, weekly cron via Inngest

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
- Files: `src/app/dashboard/agent-hub/campaign-writer/page.tsx`, `src/app/api/ai/campaign/route.ts`

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
- See B10 — identical spec, implemented as part of Phase 2 CRM build
- Team-level routing rules configured in admin; individual agent rules configured in agent dashboard

**I2. Team Performance Dashboard**
- Per-agent metrics: leads, contacts, showings, offers, closings, pipeline value
- Comparative reporting with Chart.js
- Date range selector

**I3. Agent-Branded Email Nurturing**
- Emails from brokerage system appear from individual assigned agent
- Agent name, photo, signature in template
- Brokerage retains lead ownership

---

### J. AI Chatbot System Architecture

> **Engineering note:** Do not build separate chatbot systems. Build one shared engine, configured per context. All three chatbot surfaces below run on this single engine.

#### One Engine, Three Configurations

```
src/lib/chatbot/
  engine.ts          ← shared core: streaming, history, tool execution
  contexts/
    public-site.ts   ← public-facing listing/buyer chatbot (E1)
    agent-website.ts ← per-agent chatbot (injected with that agent's data)
    dashboard.ts     ← internal agent dashboard assistant
```

The engine handles streaming, conversation history, and tool execution identically everywhere. Each deployment point passes a **context bundle** that defines:

| Bundle Field | What It Controls |
|---|---|
| System prompt | Who the chatbot is and how it behaves |
| Knowledge scope | What data it can access (all listings vs. one agent's vs. platform docs) |
| Available tools | What actions it can take (book showing, query dashboard, surface training content) |
| User identity | Anonymous visitor / logged-in buyer / logged-in agent |

#### The Critical Separation

The dashboard assistant needs authenticated, server-side tool calls to query live platform data (lead counts, training progress, conversation transcripts). The public chatbot must never have this access. This is handled by **what tools you include in each context bundle** — not by building separate systems.

Adding a fourth chatbot in the future = one new context file. Nothing else changes.

---

#### Configuration 1: Public Site Chatbot (`public-site.ts`)

The E1 AI Property Search Assistant described above. Floating widget on search pages + `/search/assistant`. Anonymous or logged-in buyers. No access to agent dashboard data.

---

#### Configuration 2: Per-Agent Website Chatbot (`agent-website.ts`)

**Included free for all agents** — the single biggest differentiator between Homewise and every other brokerage in central Florida. Acts as a recruiting and retention tool: agents choose Homewise because they get this, and they stay because they don't want to lose it.

Runs on each agent's personal website at `firstname-lastname.homewisefl.com`.

##### Knowledge Layers

| Layer | What It Contains |
|-------|-----------------|
| Real estate fundamentals | General buying/selling process, mortgage basics, closing costs, inspections |
| Homewise Realty | The brokerage, service areas, company values, how to work with an agent |
| The agent specifically | Name, bio, specialties, languages, designations, years of experience, service areas |
| Their active listings | Every property they currently have listed — prices, features, neighborhoods |
| Local market | Central Florida neighborhoods, schools, commute info |

##### How It Behaves

- Always acts as the agent's advocate
- Funnels serious inquiries toward the agent via contact form
- Qualifies leads before routing ("Are you looking to buy or sell? What's your timeline?") so agents get warm, pre-qualified inquiries
- Never gives legal or financial advice
- Never bad-mouths competitors
- Conversation transcripts saved to agent's dashboard
- Detects buying intent signals and triggers automatic follow-up notification to the agent

##### Agent Training (Controlled Customization)

Agents personalize the chatbot via a structured form — no free-text prompt editing to protect brand safety and quality control.

| Field | Example |
|-------|---------|
| Personal tagline | "I specialize in helping military families relocate to central Florida" |
| A few things I'm known for | "I always respond within 2 hours. I've lived in Oviedo for 20 years." |
| My typical client | "First-time buyers, young families, people relocating from out of state" |
| Something I want people to know | "I offer free home buyer consultations with no obligation" |
| Tone preference | Formal / Balanced / Casual |

Agent answers are woven into the chatbot's system prompt automatically — no prompt engineering required from the agent.

##### Pro Tier — Third-Party Integrations (Premium Add-On)

Integrations set up via OAuth "Connect" buttons in the agent dashboard — no technical knowledge needed.

| Category | Apps | What the Chatbot Can Do |
|----------|------|------------------------|
| Scheduling | Google Calendar, Calendly | Check real availability, book showings directly, send booking links in context |
| Communication | Gmail | Draft and send follow-up emails on the agent's behalf after a conversation |
| CRM / Lead Capture | HubSpot, Follow Up Boss, kvCORE | Push conversation data (name, contact, buying intent, timeline) directly into CRM as a lead record |
| Documents | Google Drive | Agent points bot to a folder of resources (buyer guides, neighborhood PDFs) — bot shares them contextually |

##### Pricing Model

| Tier | What's Included | Cost |
|------|----------------|------|
| **Standard** (all agents) | Full AI chatbot, agent-trained, listing-aware, lead capture, conversation transcripts | Included with Homewise |
| **Pro** (optional upgrade) | All third-party integrations, conversation analytics, priority response speed | Monthly fee per agent |

One extra closing pays for years of the Pro subscription — strong ROI argument for serious agents.

- Files: `src/lib/chatbot/contexts/agent-website.ts`, `src/app/api/ai/agent-chat/route.ts`, `src/components/ai/agent-chat-widget.tsx`

---

#### Configuration 3: Dashboard Assistant Chatbot (`dashboard.ts`)

An internal AI assistant that lives inside the agent dashboard. Distinct from the public-facing chatbots — this one faces *inward*, helping agents navigate and get the most out of the Homewise platform.

##### As a Platform Guide

Agents ask questions instead of clicking through menus:
- "How do I connect my Google Calendar?"
- "How many new leads do I have this week?"
- "Show me the contact form submissions I haven't responded to"
- "How do I update my bio and profile photo?"

##### As a Training Hub Tutor

Integrates with the Training Hub so agents can access learning content conversationally:
- "Show me the videos about writing a buyer agreement"
- "I haven't finished my onboarding — where did I leave off?"
- "Find me the home inspection checklist"
- "Walk me through how to use the CMA report generator"

Instead of browsing menus to find training content, the agent just asks. The bot surfaces the right video, document, or lesson instantly and can guide them through it step by step.

##### Key Principle

One assistant that knows the entire platform inside and out — so agents spend less time figuring out the tool and more time selling.

- Files: `src/lib/chatbot/contexts/dashboard.ts`, `src/app/api/ai/dashboard-chat/route.ts`, `src/components/ai/dashboard-chat-widget.tsx`

---

### K. Training & Education Hub

> **Dependency note:** The Agent Training Hub (K1) must be built in Phase 2 — the Dashboard Assistant chatbot (Section J, Configuration 3) integrates with it in Phase 4. Public Learning Center (K2) can follow in Phase 7 alongside SEO/content features.

---

#### K1. Agent Training Hub (Private — Dashboard Only)

A private knowledge base managed by Homewise admins, accessible only to logged-in agents. Replaces scattered PDFs and informal onboarding with a structured, trackable system.

- **Video library:** Training videos organized by category — onboarding, contracts, compliance, platform how-tos, market knowledge. Each video has a title, category tag, description, and optional attached document.
- **Document vault:** Scripts, forms, checklists, marketing templates, compliance docs — fully searchable by keyword and tag. Agents can download; they cannot upload.
- **Onboarding track:** New agents are auto-enrolled in a required sequence of modules that must be completed before their account goes fully active. Admin defines the track; system enforces it.
- **Progress tracking:** Admin can see exactly which agents have completed which content, completion dates, and time spent — nothing falls through the cracks. Useful for compliance documentation.
- **Admin content management:** Admins upload, organize, tag, and update all content from the admin dashboard at any time — no code deploy required. Content tagged for `agent`, `public`, or `both` audiences.
- **Dashboard chatbot integration:** The Configuration 3 Dashboard Assistant (Section J) can surface content conversationally — "Find me the home inspection checklist" resolves to the correct document without the agent navigating menus.
- Files: `src/app/(admin)/admin/training/page.tsx`, `src/app/dashboard/training/page.tsx`, `src/app/api/training/route.ts`, `src/components/dashboard/training-progress.tsx`

---

#### K2. Public Learning Center (Buyer & Seller Facing)

A public-facing education section positioned as both a conversion tool and an SEO asset. Educational real estate content ranks extremely well on Google — this brings in buyers and sellers in research mode before they're ready to contact an agent.

- **Buying 101 course:** Step-by-step guided journey from "thinking about buying" to closing day — short, digestible lessons with progress tracking for logged-in users
- **Selling 101 course:** Same guided format for sellers — pre-listing prep through closing
- **Video explainers:** Short videos answering common questions: "What is earnest money?", "How does the inspection process work?", "What are closing costs?"
- **Downloadable guides:** First-time buyer checklist, moving timeline, what to expect at closing — gated behind email capture for lead generation
- **Progress tracking:** Logged-in buyers and sellers see which lessons they've completed; resumes where they left off
- Routes: `/learn/buying`, `/learn/selling`, `/learn/[lesson-slug]`
- Files: `src/app/(marketing)/learn/page.tsx`, `src/app/(marketing)/learn/[slug]/page.tsx`, `src/app/api/learning/progress/route.ts`

---

#### K3. Shared Content Layer

Some content serves both audiences. A "What happens at closing?" video is useful for a first-time buyer *and* a new agent. Admins tag content for `agent`, `public`, or `both` on upload — no duplication of content, single source of truth.

- `TrainingContent.audience` enum: `AGENT | PUBLIC | BOTH`
- Public-tagged content surfaces in K2 Learning Center; agent-tagged content surfaces in K1 Training Hub; both-tagged content appears in both

---

## Implementation Phasing (High-Level)

### Phase 1: MLS Foundation
MLS Grid integration, extended Listing model, map search, advanced filters, Walk Score, GreatSchools, open house data, sold/pending data. This is the prerequisite for everything else.

### Phase 2: CRM & Lead Capture
Contact model, activity timeline, lead stages pipeline (+ transaction tracker), registration wall, showing request, valuation widget, lead source tracking, tags, tasks, lead routing (B10/I1). **Also includes Agent Training Hub (K1)** — must be complete before Phase 4 since the dashboard chatbot integrates with it.

### Phase 3: Marketing Automation
Email infrastructure (Resend), drip campaigns, daily listing alerts, price change alerts, SMS (Twilio), behavioral triggers, broadcast emails, email tracking. **Also includes G2 (AI email subject line A/B testing)** — wired in from day one of campaign sends, not added later.

### Phase 4: AI — Public-Facing
Shared chatbot engine + all three configurations (public site search assistant, per-agent website chatbot, dashboard assistant), AI valuation narrative, AI mortgage advisor, AI market insights (lead funnel), semantic search (embeddings). **Dashboard chatbot (Config 3) integrates with Training Hub built in Phase 2.**

### Phase 5: AI — Agent Tools
AI lead scoring, follow-up draft generator, CMA generator, listing performance insights, listing description writer, campaign content generator, social post generator, meeting prep briefs.

### Phase 6: Behind-the-Scenes AI
Smart alert matching with rigidity slider (G3), AI SEO content generation (G4). *(G2 AI email A/B testing moved to Phase 3.)*

### Phase 7: Market Statistics + Public Learning Center
Market stats pages, custom market reports, monthly market stats emails, embeddable widgets. **Also includes Public Learning Center (K2)** — Buying 101, Selling 101, video explainers, downloadable guides, progress tracking. Content tagged `both` in Training Hub automatically surfaces here with no re-upload.

### Phase 8: Team & Brokerage
Team performance dashboard, agent-branded nurturing. *(Lead routing built in Phase 2 as part of B10/I1.)*

### Future (Deferred)
- **Mobile app (React Native)** — site will be responsive; native app is separate future work
- **Social media direct posting (Facebook Graph API)** — F7 covers copy generation; direct one-click publish to Facebook/Instagram requires Facebook app approval and OAuth; deferred until post-launch

> Previously deferred items now covered in the plan:
> - AI Neighborhood Guide → G4 (AI SEO content generation) + H1 (neighborhood pages)
> - AI Listing Recommendations → G3 (rigidity slider) + G1 (semantic search)
> - Third-party CRM integrations → J Config 2 Pro tier (HubSpot, Follow Up Boss, kvCORE)

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
- `src/lib/chatbot/engine.ts` — Shared chatbot core: streaming, conversation history, tool execution (powers all three J configurations)

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
- `SavedSearch` — Saved search criteria per user including `matchingMode` and `rigidity` fields (G3)
- `Transaction` — One per contact when deal reaches Under Contract: address, purchase price, closing date
- `TransactionMilestone` — Individual milestone records linked to Transaction: name, targetDate, completedAt, notes
- `Conversation` — Chat session record per chatbot surface (public / agent website / dashboard), linked to user or session token
- `ChatMessage` — Individual messages within a Conversation: role (user/assistant), content, timestamp
- `ListingPortalAccess` — Token, listingId, expiresAt, enabled flag — powers seller read-only portal (F4)
- `TrainingContent` — Video/document records with title, category, audience (AGENT/PUBLIC/BOTH), url, tags
- `TrainingProgress` — Per-agent completion record linked to TrainingContent
- `TrainingTrack` — Ordered sequence of required modules for new agent onboarding
- `TrainingEnrollment` — Tracks which agents are enrolled in which track and their overall % complete

### Existing Files to Modify
- `src/providers/property-provider.ts` — Extend Property interface with MLS fields
- `prisma/schema.prisma` — Add all new models
- `src/app/dashboard/layout.tsx` — Add new nav items for agent AI tools
- `src/app/admin/` — Add CRM, campaigns, automation admin pages
- `package.json` — Add: `ai`, `@ai-sdk/openai`, `resend`, `react-email`, `twilio`, `mapbox-gl`, `inngest`, `@supabase/postgrest-js` (pgvector queries), `@react-pdf/renderer` (CMA PDF export)

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
