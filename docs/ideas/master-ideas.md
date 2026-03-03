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

*Last updated: 2026-03-03*
