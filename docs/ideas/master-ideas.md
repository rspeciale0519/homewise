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

*Last updated: 2026-03-03*
