# Homewise FL — Master Ideas Document

> A living document for brainstormed features, improvements, and future directions.
> Added to on an ongoing basis — nothing here is committed to the roadmap yet.

---

## AI Features

### Buyer-Facing

| Idea | Description | Notes |
|------|-------------|-------|
| Natural Language Search | "3-bed near good schools in Oviedo under $400k with a pool" → parses intent and builds filters automatically | Powers the property search widget |
| Property Match Score | Score each listing 1–100 based on the buyer's saved searches, views, and favorites | Requires user account + behavior tracking |
| Neighborhood Fit Score | Scores neighborhoods against a buyer's stated lifestyle (commute, schools, walkability, pet-friendliness) | Could integrate Walk Score, GreatSchools data already in the MLS foundation |
| "Ask This Home" Chatbot | Chatbot on each listing detail page — answers questions like "Is this in a flood zone?" or "What are the HOA fees?" | Pulls from listing data + public records |
| AI Buyer Readiness Quiz | Guides first-time buyers through a short assessment and surfaces the right resources and agent | Great lead gen tool |

---

### Seller-Facing

| Idea | Description | Notes |
|------|-------------|-------|
| Instant AI Home Valuation | AVM (automated valuation model) on the home evaluation form — gives a ballpark estimate instantly, then routes to an agent | Could use comp data from MLS + Prisma Listing model |
| Listing Description Writer | Agent inputs property details → AI generates MLS-ready listing copy | Agent-facing but output is public |
| Staging Photo Advisor | Seller uploads room photos → AI flags what to declutter, repaint, or rearrange | Vision model feature |
| Renovation ROI Advisor | "Which upgrades will yield the most at sale in this zip code right now?" | Requires local market data |
| Market Timing Advisor | Based on local inventory and days-on-market trends — "Is now a good time to list?" | Could tie into Inngest MLS sync data |

---

### Agent Backend (Dashboard)

| Idea | Description | Notes |
|------|-------------|-------|
| Lead Scoring | Automatically ranks incoming leads by conversion likelihood using behavior signals, timeline, and engagement | Admin dashboard integration |
| AI Follow-Up Drafts | One-click email drafts tailored to each lead's stage and property interests | Agent dashboard feature |
| CMA Report Generator | Auto-generate a full Comparative Market Analysis report for a given address | High value for listing appointments |
| Showing Feedback Summarizer | Paste in raw showing feedback from multiple showings → AI summarizes themes (e.g. "Everyone mentioned kitchen feels small") | Agent dashboard feature |
| Client-Listing Matcher | When a new listing comes in, surface which existing buyer clients it fits | Requires buyer preference profiles |

---

### Invisible / Infrastructure AI

| Idea | Description | Notes |
|------|-------------|-------|
| Semantic Vector Search | Embed all listings as vectors so natural language queries can find conceptually similar properties | Backend — powers Natural Language Search above |
| Personalized Homepage | Featured listings section is dynamically ranked per visitor based on their browsing behavior | Requires session/behavior tracking |
| Auto-Tagging Pipeline | When listings sync from Stellar MLS, AI tags them: style (modern/craftsman/colonial), condition, standout features | Runs in Inngest background job |
| Smart Notifications | Property alert emails ranked by match score, not just recency | Enhancement to existing property alerts |
| Anomaly Detection | Flags unusual price drops, stale listings, or duplicate entries in the admin dashboard | Admin dashboard integration |

---

## Agent Personal Websites

### Overview

Every Homewise agent gets their own website, auto-populated with their profile data and active MLS listings. The agent picks a template, the site goes live instantly at `firstname-lastname.homewisefl.com`. Optional custom domain support via CNAME. One Next.js app handles everything — middleware detects the subdomain and renders the right agent + template. No separate deployments, no manual setup.

---

### The 5 Templates

Each template is visually distinct but shares the Homewise brand feel.

| # | Name | Feel |
|---|------|------|
| 1 | Modern Minimal | Clean white, navy accents, lots of whitespace — broad appeal |
| 2 | Luxury | Dark rich palette, gold accents, magazine-editorial style |
| 3 | Warm & Approachable | Soft tones, conversational — great for first-time buyer specialists |
| 4 | Bold Professional | Strong typography, data-forward — good for high-volume agents |
| 5 | Community Local | Neighborhood-focused, area photography — good for hyper-local specialists |

---

### Agent Launch Experience (3 Steps)

1. Agent logs into dashboard → clicks "My Website"
2. Browses 5 live previews **populated with their own real data** — photo, bio, listings, contact info
3. Clicks "Launch with this template" → site is live instantly

- Agents can switch templates at any time without losing anything
- Custom domain setup shows step-by-step DNS instructions with a verification check
- If an agent hasn't launched yet, their subdomain redirects to their main site profile page as a fallback
- Admin can view all agent sites, toggle on/off, and override settings

---

### What Each Site Auto-Populates

- Name, photo, bio, phone from Agent profile
- Active MLS listings (synced via Inngest)
- Languages, designations, certifications
- Contact form routing directly to that agent
- Social media links

---

### Per-Agent AI Chatbot

**Included free for all agents** — the single biggest differentiator between Homewise and every other brokerage in central Florida. Acts as a recruiting and retention tool: agents choose Homewise because they get this, and they stay because they don't want to lose it.

#### Knowledge Layers

| Layer | What It Contains |
|-------|-----------------|
| Real estate fundamentals | General buying/selling process, mortgage basics, closing costs, inspections |
| Homewise Realty | The brokerage, service areas, company values, how to work with an agent |
| The agent specifically | Name, bio, specialties, languages, designations, years of experience, service areas |
| Their active listings | Every property they currently have listed — prices, features, neighborhoods |
| Local market | Central Florida neighborhoods, schools, commute info |

#### How It Behaves

- Always acts as the agent's advocate
- Funnels serious inquiries toward the agent via contact form
- Qualifies leads before routing ("Are you looking to buy or sell? What's your timeline?") so agents get warm, pre-qualified inquiries
- Never gives legal or financial advice
- Never bad-mouths competitors
- Conversation transcripts saved to agent's dashboard
- Detects buying intent signals and triggers automatic follow-up notification to the agent

#### Agent Training (Controlled Customization)

Agents can personalize the chatbot via a structured form — no free-text prompt editing to protect brand safety and quality control.

| Field | Example |
|-------|---------|
| Personal tagline | "I specialize in helping military families relocate to central Florida" |
| A few things I'm known for | "I always respond within 2 hours. I've lived in Oviedo for 20 years." |
| My typical client | "First-time buyers, young families, people relocating from out of state" |
| Something I want people to know | "I offer free home buyer consultations with no obligation" |
| Tone preference | Formal / Balanced / Casual |

Agent answers are woven into the chatbot's system prompt automatically — no prompt engineering required from the agent.

---

### Pro Tier — Third-Party Integrations (Premium Add-On)

Agents who want the full power can upgrade to Pro. Integrations are set up via OAuth "Connect" buttons in the agent dashboard — no technical knowledge needed.

#### Supported Integrations

| Category | Apps | What the Chatbot Can Do |
|----------|------|------------------------|
| Scheduling | Google Calendar, Calendly | Check real availability, book showings directly, send booking links in context |
| Communication | Gmail | Draft and send follow-up emails on the agent's behalf after a conversation |
| CRM / Lead Capture | HubSpot, Follow Up Boss, kvCORE | Push conversation data (name, contact, buying intent, timeline) directly into CRM as a lead record |
| Documents | Google Drive | Agent points bot to a folder of resources (buyer guides, neighborhood PDFs) — bot shares them contextually |

#### Pricing Model

| Tier | What's Included | Cost |
|------|----------------|------|
| **Standard** (all agents) | Full AI chatbot, agent-trained, listing-aware, lead capture, conversation transcripts | Included with Homewise |
| **Pro** (optional upgrade) | All third-party integrations, conversation analytics, priority response speed | Monthly fee per agent |

One extra closing pays for years of the Pro subscription — strong ROI argument for serious agents.

---

## Buyer & Seller Tools

| Idea | Description | Notes |
|------|-------------|-------|
| Mortgage Affordability Calculator | Inputs income, down payment, debt → shows real price range and monthly payment estimates | One of the highest-engagement tools on any real estate site |
| Rent vs. Buy Calculator | "Here's what you're paying in rent vs. what a mortgage on a comparable home would cost you" | Great lead gen — catches people on the fence |
| Home Value Tracker | After closing, buyers can log in and track what their home is worth month over month using MLS comp data | Keeps them engaged with Homewise long after the sale |
| Moving Concierge Directory | Curated list of Homewise-vetted local services: movers, inspectors, title companies, lenders, contractors | Potential affiliate revenue stream |
| Listing Performance Dashboard | Sellers can log in and see views, saves, inquiries, and showing requests on their listing | Reduces "how is my listing doing?" calls to agents |
| Virtual Consultation Booking | Calendly-style booking flow for buyers/sellers to schedule a 30-min video call with an available agent | Removes the biggest friction point in converting a visitor to a client |

---

## Community & Content

| Idea | Description | Notes |
|------|-------------|-------|
| Neighborhood Guides | Deep-dive pages for each major central Florida neighborhood: schools, commute times, restaurants, parks, median prices, market trends | Excellent for SEO and invaluable for relocating buyers |
| Monthly Market Reports | Auto-generated PDF reports from MLS data (median price, days on market, inventory levels by county) — agents can share, visitors can subscribe | Positions Homewise as the local market authority |
| Testimonials & Reviews System | Structured reviews tied to specific agents, pulled from Google Reviews or submitted directly — displayed on agent profiles and main site | Social proof is one of the biggest conversion drivers in real estate |

---

## Agent Recruiting & Growth

| Idea | Description | Notes |
|------|-------------|-------|
| "Join Our Team" Funnel | Dedicated recruiting section targeting agents at other brokerages — includes a commission split calculator showing what they'd earn at Homewise vs. their current brokerage | 186+ agents means a strong culture story to tell |
| Agent Referral Program | Existing agents refer new agents — tracked in the dashboard, rewarded when the referred agent closes their first deal | Incentivizes organic growth |
| Agent Production Showcase | Public-facing "Top Producers" section or leaderboard | Agents love recognition; buyers trust agents with a track record |

---

## Partnerships & Revenue

| Idea | Description | Notes |
|------|-------------|-------|
| Preferred Lender Integration | Partner with 2–3 local mortgage lenders — surface them contextually throughout the site (calculator results, property detail pages, buyer resources) | Referral fee arrangement |
| Home Warranty & Insurance Affiliates | Surface trusted partners at the right moment in the buyer journey (after making an offer) | Pure revenue with zero friction to the user experience |

---

## Engagement & Retention

| Idea | Description | Notes |
|------|-------------|-------|
| Home Anniversary Emails | One year after closing, client gets a personalized email from their agent: "Happy one year in your home! Here's what it's worth today." | Keeps the relationship warm for eventual re-list or referral |
| Email Newsletter & Drip Campaigns | Monthly market updates, seasonal home tips, local events — keeps Homewise top-of-mind for people 6–18 months away from being ready | Builds a long-term audience the brokerage owns |

---

## Training & Education Hub

### Agent Training Hub (Private — Dashboard Only)

A private knowledge base managed by Homewise admins, accessible only to logged-in agents.

| Feature | Description |
|---------|-------------|
| Video library | Training videos organized by category — onboarding, contracts, compliance, platform how-tos, market knowledge |
| Document vault | Scripts, forms, checklists, marketing templates, compliance docs — all searchable |
| Onboarding track | New agents follow a required sequence of modules to complete before going active |
| Progress tracking | Admin can see exactly which agents have completed which content — nothing falls through the cracks |
| Admin content management | Admins upload, organize, tag, and update content from the admin dashboard at any time |

---

### Public Learning Center (Buyer & Seller Facing)

A public-facing education section that goes well beyond the basic buyer/seller articles already on the site.

| Feature | Description |
|---------|-------------|
| Buying 101 course | Step-by-step guided journey from "thinking about buying" to closing day — short, digestible lessons |
| Selling 101 course | Same guided format for sellers |
| Video explainers | Short videos on common questions: "What is earnest money?", "How does the inspection process work?", etc. |
| Downloadable guides | First-time buyer checklist, moving timeline, what to expect at closing |
| Progress tracking | Buyers and sellers track completed lessons when logged in |
| SEO asset | Educational real estate content ranks extremely well on Google — brings in buyers/sellers in research mode |

---

### Shared Content Layer

Some content serves both audiences. A "What happens at closing?" video is useful for a first-time buyer *and* a new agent. Admins tag content for one or both audiences on upload — no duplication of work.

---

## Chatbot Architecture — How to Build All Three

> **Engineering note:** Do not build separate chatbot systems. Build one shared engine, configured per context.

### One Engine, Three Configurations

```
/lib/chatbot/
  engine.ts          ← shared core: streaming, history, tool execution
  contexts/
    public-site.ts   ← public-facing listing/buyer chatbot
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

### The Critical Separation

The dashboard assistant needs authenticated, server-side tool calls to query live platform data (lead counts, training progress, conversation transcripts). The public chatbot must never have this access. This is handled by **what tools you include in each context bundle** — not by building separate systems.

Adding a fourth chatbot in the future = one new context file. Nothing else changes.

---

## Dashboard Assistant Chatbot (Agent-Facing, Internal)

A second, entirely separate AI chatbot that lives inside the agent dashboard. Distinct from the public-facing chatbot on the agent's personal website — this one faces *inward*, helping agents navigate and get the most out of the Homewise platform.

### As a Platform Guide
Agents ask questions instead of clicking through menus:
- "How do I connect my Google Calendar?"
- "How many new leads do I have this week?"
- "Show me the contact form submissions I haven't responded to"
- "How do I update my bio and profile photo?"

### As a Training Hub Tutor
The chatbot integrates with the Training Hub so agents can access learning content conversationally:
- "Show me the videos about writing a buyer agreement"
- "I haven't finished my onboarding — where did I leave off?"
- "Find me the home inspection checklist"
- "Walk me through how to use the CMA report generator"

Instead of browsing menus to find training content, the agent just asks. The bot surfaces the right video, document, or lesson instantly and can guide them through it step by step.

### Key Principle
One assistant that knows the entire platform inside and out — so agents spend less time figuring out the tool and more time selling.

---

## Buyer Experience — Additional Ideas

| Idea | Description | Notes |
|------|-------------|-------|
| Commute-Time Search | Search properties by drive/transit time to a specific workplace address — not just city or zip | Central Florida traffic makes this a buying decision; Mapbox foundation already in place |
| Property Comparison Tool | Side-by-side comparison of 2–4 saved properties: beds, baths, HOA fees, price/sqft, school ratings, walk score | Favorites model already tracks the data — this surfaces it comparatively |
| Open House RSVP | Buyers click "I'll be there" on a listing page; agent gets a heads-up list of attendees | `openHouseSchedule` already exists on the Listing model; generates warm leads |
| Price History Timeline | Visual chart on each listing showing original list price, reductions, and days on market over time | Builds buyer trust and reduces "why is this sitting?" questions |
| Total Cost of Ownership View | Breakdown panel on each listing: estimated mortgage + HOA + property taxes + insurance + utilities | Most buyers budget only on purchase price — this sets accurate expectations |

---

## Seller Experience — Additional Ideas

| Idea | Description | Notes |
|------|-------------|-------|
| Showing Scheduler | Sellers set availability windows; buyers/agents request showings; sellers confirm or decline — all in-platform | Currently all showing coordination goes off-platform via phone/text |
| Pre-Listing Checklist | Interactive checklist (repairs, disclosures, staging, photos) sellers work through before going live | Reduces "what do I do next?" calls to agents and sets expectations early |
| Offer Comparison Tool | Side-by-side view of multiple offers: price, financing type, contingencies, closing timeline | Agents currently do this manually in spreadsheets |

---

## Agent Dashboard — Additional Ideas

| Idea | Description | Notes |
|------|-------------|-------|
| Deal Pipeline / Transaction Tracker | Kanban board: Leads → Consultation Booked → Under Contract → Closed | The existing dashboard covers lead capture only — no visibility once a deal is in motion |
| Social Media Content Generator | AI generates ready-to-post Instagram/Facebook content from a listing: headline, caption, hashtags, suggested photo order | Agents currently write this manually or skip it entirely |
| Market Update Mailer | Agent selects a neighborhood or zip → platform generates a branded one-page market summary to send to their sphere | Agents who do this consistently get re-listings; almost none do it without tooling |
| Commission Calculator | Enter sale price → see net commission after split, fees, and costs | Agents calculate this constantly; currently done manually |

---

## Admin Dashboard — Additional Ideas

| Idea | Description | Notes |
|------|-------------|-------|
| Brokerage Performance Dashboard | Volume closed, average days to close, top producers by month, geographic heat map of where Homewise is winning deals | Admin currently sees leads/submissions only — no closed-deal business intelligence |
| Agent Compliance Tracker | Which agents have completed required training, license renewal dates, E&O insurance expiry | Real compliance exposure for a 186-agent brokerage |
| Recruitment Pipeline CRM | Track prospective agents from first contact through onboarding | Pairs with the "Join Our Team" funnel idea — without a backend to manage those conversations, leads fall through |

---

## Platform-Level Ideas

| Idea | Description | Notes |
|------|-------------|-------|
| In-Platform Messaging | Persistent chat thread between buyer/seller and their agent, within Homewise | Contact forms are one-shot today — no ongoing thread; keeps relationships inside the platform rather than drifting to personal text/email |
| Push Notifications (PWA) | Browser push for new matching listings and price drops on saved searches | Property alert model exists but delivery is email-only; push is faster and higher-engagement for active buyers |
| Document Signing Integration | Embedded DocuSign or HelloSign for offers and buyer agreements | Removes the need to leave the platform for one of the most critical steps in the transaction |

---

*Last updated: 2026-03-04*
