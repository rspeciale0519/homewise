# Homewise FL — AI Platform Implementation Tasks

> **Spec reference:** All feature details, file paths, Prisma models, and architectural decisions live in
> [`dev-docs/ai-platform-spec.md`](./ai-platform-spec.md). This document is the *build checklist* —
> check items off as they are completed. Read the spec before starting each phase.

> **Current state:** Phases 0–7 of the initial scaffold are complete (see `docs/temp/session-handoff.md`).
> The MLS foundation (A1, A2, A5 partial) was built in Phase 6.75 of the initial build. Review the
> session handoff before starting Phase 1 below to confirm what is already in place.

> **Verification:** Run these after completing every phase before moving on:
> ```
> npm run type-check
> npm run lint
> npm run build
> ```

---

## Phase 1 — MLS Foundation

> Spec ref: Section A (`A1`–`A8`)
> Prerequisite for everything else. Do not start Phase 2 until all items here pass verification.

- [ ] **A1 — Stellar MLS Provider:** `StellarMlsProvider` fully implements `PropertyProvider` interface; OAuth 2.0 auth with MLS Grid; 15-minute Inngest cron sync; extended `Listing` Prisma model with all MLS fields (MLS ID, listing agent, photos, HOA, year built, lot size, description, coordinates). *Done when: listings sync automatically every 15 min and appear in search results with full data.*
- [ ] **A2 — Map-Based Search:** Mapbox GL JS map with clustered pins, "search this area" on pan/zoom, split-screen map + cards layout, PostGIS geospatial queries. *Done when: user can pan the map and results update without a page reload.*
- [ ] **A3 — Polygon/Draw Search:** Mapbox Draw plugin for freehand area selection; polygon stored on `SavedSearch`; PostGIS `ST_Within()` filters results. *Done when: user can draw a shape and see only listings inside it.*
- [ ] **A4 — Advanced Search Filters:** Lot size, year built, pool/waterfront/garage, school district, HOA amount, new construction, open houses only, days on market; collapsible accordion; URL param persistence for shareable links. *Done when: all filters apply correctly and a filtered URL can be shared and reproduced.*
- [ ] **A5 — Walk Score + GreatSchools:** Both APIs integrated on listing detail pages; scores cached in DB by address. *Done when: scores appear on listing detail without re-fetching after first load.*
- [ ] **A6 — Open House Search:** Open house data from MLS feed; filter to open-house-only results; date/time on listing pages; "Open Houses This Weekend" widget. *Done when: widget shows correct upcoming open houses from live MLS data.*
- [ ] **A7 — Featured Listings:** Auto-populated by agent/office MLS ID; active, pending, and sold; `/my-listings` per agent + embeddable widget. *Done when: agent's own listings auto-appear on their profile page.*
- [ ] **A8 — Sold/Pending Badges:** Status badges on listing cards; sold listings in results (where MLS permits); sold history on agent bio pages. *Done when: Under Contract and Sold badges render correctly on cards and agent bios show closed history.*

**Phase 1 verification:**
- [ ] `npm run type-check` — zero errors
- [ ] `npm run lint` — zero errors
- [ ] `npm run build` — successful
- [ ] Manual: search map, draw polygon, filter results, open a listing detail, check Walk Score + schools display

---

## Phase 2 — CRM, Lead Capture & Agent Training Hub

> Spec ref: Sections B (`B1`–`B10`), K (`K1`), I (`I1`)
> Training Hub (K1) must be complete in this phase — the dashboard chatbot built in Phase 4 integrates with it.

- [ ] **B5 — Contact/Lead Database (CRM):** `Contact` Prisma model with all fields; `/admin/contacts` with search, filter, sort, CSV export. *Done when: admin can find, filter, and export any contact.*
- [ ] **B6 — Activity Timeline:** `ActivityEvent` model; every user action logged (views, searches, saves, email events, form submissions, notes); chronological display on contact detail. *Done when: opening a contact shows a complete history of their site activity.*
- [ ] **B1 — Visitor Registration Wall:** Configurable trigger (default: 5 listing views); soft/forced modes; modal display; Supabase Auth registration; A/B testable threshold. *Done when: anonymous users are prompted to register after hitting the view threshold.*
- [ ] **B4 — Lead Source Tracking:** `?source=` param captured in cookie; written to `Contact` on registration; source breakdown in admin. *Done when: contacts created from different sources show correct attribution.*
- [ ] **B2 — Schedule a Showing:** Pre-filled form on listing pages; instant agent notification (email + push); auto-creates CRM lead. *Done when: form submission creates a contact record and the assigned agent receives a notification.*
- [ ] **B3 — "What's My Home Worth?" Widget:** Multi-step seller lead form; creates seller lead; triggers seller drip campaign. *Done when: form completion creates a contact tagged as seller lead and enrolls them in the drip.*
- [ ] **B7 — Lead Stages Pipeline + Transaction Tracker:** Kanban board (New Lead → Closed/Lost) with drag-and-drop; pipeline value aggregation; Transaction Tracker activates on "Under Contract" (milestones, document checklist, progress bar, deadline reminders, summary card on contact detail; closed deals populate agent sold history). *Done when: agent can move a deal through all stages and the transaction tracker panel appears on Under Contract.*
- [ ] **B8 — Tags & Segmentation:** Multi-tag system on contacts; tag-based filtering and bulk campaign assignment. *Done when: admin can filter contacts by tag and bulk-assign a campaign.*
- [ ] **B9 — Tasks & Reminders:** `Task` model linked to contacts; due dates; Google Calendar sync; daily task digest email. *Done when: agent creates a task, it appears in Google Calendar, and they receive the daily digest.*
- [ ] **B10 / I1 — Lead Routing:** Auto-assignment rules by location, price range, source, type, language; round-robin option; 5-minute accept timeout with re-route; team-level rules in admin, individual rules in agent dashboard. *Done when: a new lead from a configured source auto-assigns to the correct agent.*
- [ ] **K1 — Agent Training Hub:** `TrainingContent`, `TrainingProgress`, `TrainingTrack`, `TrainingEnrollment` Prisma models; admin content management (upload, tag `agent`/`public`/`both`, organize); video library and document vault in agent dashboard; required onboarding track with auto-enrollment; progress tracking visible to admin. *Done when: admin can upload a video, new agent is auto-enrolled in the onboarding track, and admin can see their completion status.*

**Phase 2 verification:**
- [ ] `npm run type-check` — zero errors
- [ ] `npm run lint` — zero errors
- [ ] `npm run build` — successful
- [ ] Manual: register a visitor, submit a showing request, move a contact through pipeline stages, move to Under Contract and verify tracker appears, create training content as admin and verify agent sees it

---

## Phase 3 — Marketing Automation + Email A/B Testing

> Spec ref: Sections C (`C1`–`C8`), G (`G2`)
> G2 (AI email subject line A/B testing) ships here so it is wired in from the first campaign send.

- [ ] **Email infrastructure:** `src/lib/email/index.ts` with Resend client and React Email template rendering; transactional email sending verified end-to-end. *Done when: a test email sends and renders correctly via Resend.*
- [ ] **C8 — Email Open & Click Tracking:** `EmailEvent` model; Resend webhooks → DB; events update lead score; events fire behavioral automation rules. *Done when: opening a tracked email increments the contact's score in the CRM.*
- [ ] **G2 — AI Email Subject Line A/B Testing:** AI generates 2–3 subject line variations per automated email; random variant assigned per recipient; open rates tracked per variant. *Done when: a drip email send shows variant distribution and open rate split in the campaign analytics.*
- [ ] **C1 — Drip Email Campaigns:** Campaign builder (N emails, configurable delays); auto-assignment by lead source/type/stage; personalization tokens; pre-built templates (New Buyer, Active Buyer, Seller Lead, Past Client, Open House Follow-up). *Done when: a new buyer lead is auto-enrolled in the New Buyer drip and receives the first email at the configured delay.*
- [ ] **C2 — Daily New Listing Alerts:** Inngest cron queries new listings since last run matching each saved search; branded email with photos and links; unsubscribe link. *Done when: a user with a saved search receives an alert email containing new matching listings.*
- [ ] **C3 — Price Change Alerts:** Price change detection during MLS sync; alert sent to users with matching saved searches or saved listings. *Done when: manually updating a listing price triggers an alert to a user who has it saved.*
- [ ] **C5 — Behavioral Trigger Automation:** `AutomationRule` model; rules engine (condition → action); admin-configurable; example rules: listing saved → similar listings email, 30-day inactive → re-engagement. *Done when: saving a listing fires the configured follow-up rule.*
- [ ] **C6 — Birthday/Anniversary Automations:** Date fields on `Contact`; daily cron checks for birthdays and closing anniversaries; sends branded greeting with referral CTA. *Done when: a contact with today's birthday receives the greeting email.*
- [ ] **C7 — Broadcast/Mass Emails:** Audience selection by segment/tag; compose or select template; batch send via Resend; per-broadcast delivery/open/click tracking. *Done when: admin sends a broadcast to a tagged segment and the dashboard shows delivery stats.*
- [ ] **C4 — SMS/Text Campaigns:** `src/lib/sms/index.ts` Twilio client; dedicated 10-digit numbers; text steps in drip campaigns alongside email; legal consent captured at registration; incoming reply webhook. *Done when: a drip campaign with an SMS step sends the text at the correct delay and an incoming reply is captured.*

**Phase 3 verification:**
- [ ] `npm run type-check` — zero errors
- [ ] `npm run lint` — zero errors
- [ ] `npm run build` — successful
- [ ] Manual: trigger a drip enrollment, verify email delivery via Resend dashboard, verify A/B subject line variants appear, trigger a behavioral rule, send a broadcast

---

## Phase 4 — AI: Public-Facing + Chatbot Engine

> Spec ref: Sections E (`E1`–`E4`), G (`G1`), J (full architecture + all three configurations)
> Dashboard chatbot (Config 3) integrates with Training Hub built in Phase 2. Confirm K1 is complete before starting.

- [ ] **AI service layer:** `src/lib/ai/index.ts` with prompt templates, token tracking, rate limiting, and response caching shared across all AI features. *Done when: a test prompt call succeeds with rate limiting active.*
- [ ] **G1 — Semantic Search (Embeddings):** `src/lib/ai/embeddings.ts`; pgvector column on `Listing` model; embedding generation via Inngest on MLS sync; natural language queries match listings by meaning alongside filter search. *Done when: searching "cozy home near parks" returns semantically relevant listings even without keyword matches.*
- [ ] **J — Shared Chatbot Engine:** `src/lib/chatbot/engine.ts` with streaming, conversation history, tool execution; `Conversation` and `ChatMessage` Prisma models; context bundle pattern (system prompt, knowledge scope, available tools, user identity). *Done when: engine can be instantiated with a context bundle and stream a response.*
- [ ] **E1 / J Config 1 — Public Site Chatbot:** `public-site.ts` context; floating widget on search pages + `/search/assistant` page; natural language query parsing via function calling; conversation persisted per session/user; graceful agent handoff fallback. *Done when: user can type "show me 3-bed homes in Oviedo under $400k" and see filtered results in the chat.*
- [ ] **J Config 2 — Per-Agent Website Chatbot:** `agent-website.ts` context; injected with agent's profile, active listings, and local market knowledge; structured customization form in agent dashboard (tagline, tone, client type, etc.); lead qualification before routing; conversation transcripts saved to dashboard; buying intent detection triggers agent notification; Standard tier included free, Pro tier with third-party integrations (Google Calendar, Gmail, HubSpot, Google Drive) as paid add-on. *Done when: agent's subdomain chatbot answers questions about their listings and routes an inquiry to their contact form.*
- [ ] **J Config 3 — Dashboard Assistant Chatbot:** `dashboard.ts` context; authenticated tool calls to live platform data (lead counts, task list, contact submissions); Training Hub integration (surfaces videos, documents, onboarding progress conversationally). *Done when: agent can ask "how many new leads do I have this week?" and get a live answer, and "find me the home inspection checklist" returns the correct document.*
- [ ] **E2 — AI Home Valuation Narrative:** Extends Home Evaluation form; pulls MLS sold comps by zip/beds/baths/sqft; AI generates personalized narrative with market context; branded report page + email to seller. *Done when: submitting the home evaluation form produces a branded AI-written report page.*
- [ ] **E3 — AI Mortgage Scenario Advisor:** Natural language or structured financial input; AI models 3 scenarios (conservative/moderate/stretch); explains loan types; monthly payment breakdowns; "Get pre-approved" CTA. *Done when: user inputs their situation and receives three clearly differentiated financing scenarios.*
- [ ] **E4 — AI Market Insights (Lead Funnel):** Integrated into market stats pages and chatbot; data-driven previews with agent CTA. *Done when: market stats pages show an AI-generated insight block with a contact CTA.*

**Phase 4 verification:**
- [ ] `npm run type-check` — zero errors
- [ ] `npm run lint` — zero errors
- [ ] `npm run build` — successful
- [ ] Manual: test all three chatbot surfaces, verify semantic search returns, submit home evaluation and view report, test mortgage advisor scenarios

---

## Phase 5 — AI: Agent Tools

> Spec ref: Section F (`F1`–`F8`)

- [ ] **F1 — AI Lead Scoring & Prioritization:** Point-based scoring model with time-decay; AI-generated 2-sentence priority brief per lead; scoring cron via Inngest; dashboard sorted by score. *Done when: CRM contact list orders by score and each contact shows an AI-written priority brief.*
- [ ] **F2 — AI Follow-Up Draft Generator:** One-click draft from contact detail; AI reads activity timeline; drafts personalized email or text referencing specific listings and behavior; contextual to lead stage; agent edits and sends. *Done when: clicking "Draft Follow-Up" on any contact produces a relevant, personalized message draft.*
- [ ] **F3 — AI CMA Generator:** Agent inputs address; system pulls 5–8 MLS comps; AI generates report with pricing recommendation and market narrative; exportable as branded PDF via `@react-pdf/renderer`. *Done when: agent can generate a CMA and download a formatted PDF.*
- [ ] **F4 — AI Listing Performance Insights + Seller Portal:** Agent view: per-listing stats benchmarked against comparables, AI action suggestions, trend charts, weekly digest email. Seller portal: tokenized read-only URL (no login), plain-language performance summary, sparkline chart; agent can toggle portal on/off per listing. *Done when: agent can share a portal link with a seller and the seller sees their listing stats without logging in.*
- [ ] **F5 — AI Listing Description Generator:** Agent inputs details or pulls from MLS; AI generates 3 variations (lifestyle, features/specs, investment); agent selects, edits, copies. *Done when: agent can generate three distinct descriptions and copy their preferred version.*
- [ ] **F6 — AI Email Campaign Content Generator:** Agent selects campaign type and audience; AI generates full 5–8 email drip sequence with suggested delays; personalization tokens; agent reviews before activating. *Done when: generated campaign can be reviewed and activated directly from the campaign writer page.*
- [ ] **F7 — AI Social Media Post Generator:** Listing post, market update, or engagement content; post copy variations with hashtags and platform formatting; image selection from listing photos. *Done when: agent can select a listing and generate platform-ready post copy with photos.*
- [ ] **F8 — AI Meeting Prep Brief:** Triggered before scheduled showings/meetings; compiles client search history, saved listings, comps, neighborhood stats, talking points; one-page mobile-accessible view. *Done when: opening a meeting prep brief for a scheduled showing shows a complete one-page summary.*

**Phase 5 verification:**
- [ ] `npm run type-check` — zero errors
- [ ] `npm run lint` — zero errors
- [ ] `npm run build` — successful
- [ ] Manual: score a set of leads, generate a follow-up draft, produce and download a CMA PDF, generate a listing description, share a seller portal link

---

## Phase 6 — Behind-the-Scenes AI

> Spec ref: Section G (`G3`, `G4`) — note G1 was built in Phase 4, G2 in Phase 3

- [ ] **G3 — Smart Alert Matching with Rigidity Slider:** User-controlled slider on saved search settings (`strict` / `balanced` / `discovery`); `matchingMode` and `rigidity` fields on `SavedSearch`; alert cron uses setting to determine matching algorithm (exact vs. AI-augmented suggestions). *Done when: user set to "Discovery" mode receives AI-suggested listings outside their strict filters alongside exact matches.*
- [ ] **G4 — AI SEO Content Generation:** Auto-generates content for 50+ neighborhood pages, market reports, community guides; monthly refresh cron for market-sensitive content; admin review required before publishing. *Done when: admin sees a queue of AI-generated content drafts pending review, and approved content publishes to neighborhood pages.*

**Phase 6 verification:**
- [ ] `npm run type-check` — zero errors
- [ ] `npm run lint` — zero errors
- [ ] `npm run build` — successful
- [ ] Manual: set a saved search to Discovery mode and verify alert includes AI suggestions; trigger content generation and review the admin approval queue

---

## Phase 7 — Market Statistics + Public Learning Center

> Spec ref: Sections D (`D1`–`D3`), K (`K2`, `K3`)
> K2 Public Learning Center shares the K1 content layer — content tagged `both` or `public` in the Training Hub surfaces here automatically.

- [ ] **D1 — Market Statistics Pages:** `MarketStats` model; Inngest daily aggregation cron; dynamic pages per city/zip/neighborhood with active count, median prices, sale-to-list ratio, avg DOM, months of inventory; 6-month trend charts. *Done when: `/market/oviedo` shows live aggregated MLS statistics with a trend chart.*
- [ ] **D2 — Custom Market Reports:** Agent-defined market criteria; auto-generated live report pages; embeddable widget components. *Done when: agent creates a custom market and gets a shareable report URL.*
- [ ] **D3 — Monthly Market Stats Email:** First-of-month Inngest cron; area statistics with charts; agent-branded template. *Done when: cron fires and subscribers receive the branded monthly report email.*
- [ ] **K2 — Public Learning Center:** `/learn/buying`, `/learn/selling`, `/learn/[lesson-slug]` routes; Buying 101 and Selling 101 guided courses; video explainers; downloadable guides gated behind email capture; progress tracking for logged-in users. *Done when: a logged-in buyer can complete a lesson and resume where they left off on return.*
- [ ] **K3 — Shared Content Layer verified:** Confirm content tagged `both` in the admin Training Hub surfaces correctly in both the agent Training Hub (K1) and the Public Learning Center (K2) without duplication. *Done when: a `both`-tagged video appears in both `/dashboard/training` and `/learn` without a separate upload.*

**Phase 7 verification:**
- [ ] `npm run type-check` — zero errors
- [ ] `npm run lint` — zero errors
- [ ] `npm run build` — successful
- [ ] Manual: view a market stats page, create a custom market report, complete a lesson in the Learning Center, verify shared content appears in both locations

---

## Phase 8 — Team & Brokerage Tools

> Spec ref: Section I (`I2`, `I3`) — I1 lead routing was completed in Phase 2

- [ ] **I2 — Team Performance Dashboard:** Per-agent metrics (leads, contacts, showings, offers, closings, pipeline value); comparative reporting with Chart.js; date range selector. *Done when: admin can view a side-by-side comparison of agent performance for any date range.*
- [ ] **I3 — Agent-Branded Email Nurturing:** Brokerage campaign emails appear from the individual assigned agent (name, photo, signature in template); brokerage retains lead ownership. *Done when: a drip email sent by the brokerage system shows the assigned agent's name and photo to the recipient.*

**Phase 8 verification:**
- [ ] `npm run type-check` — zero errors
- [ ] `npm run lint` — zero errors
- [ ] `npm run build` — successful
- [ ] Manual: view team performance dashboard, send a branded nurturing email and verify agent identity shows correctly to recipient

---

## Future (Deferred — Do Not Build Yet)

> Spec ref: "Future (Deferred)" section in `ai-platform-spec.md`

- [ ] AI Neighborhood Guide
- [ ] AI Listing Recommendations based on behavior
- [ ] Mobile app (React Native)
- [ ] Third-party CRM integrations (Follow Up Boss, Zapier)
- [ ] Social media direct posting (Facebook Graph API)
