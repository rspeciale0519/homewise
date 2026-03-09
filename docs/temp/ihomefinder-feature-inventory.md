# iHomefinder Platform - Comprehensive Feature Inventory
## Research Date: March 2, 2026
## Purpose: Custom-build reference for real estate brokerage website

---

## EXECUTIVE SUMMARY

- iHomefinder is an all-in-one IDX, CRM, lead generation, and marketing automation platform for real estate agents, teams, and brokerages
- Three main tiers exist: **Essentials** (IDX add-on only), **Accelerate** (website + IDX + CRM), and **Maximizer** (full growth system with seller leads + AI + white-glove support)
- Core product pillars: Property Search (IDX), Lead Capture, CRM/Contact Management, Marketing Automation (email + SMS), Market Reports (MarketBoost), and Team/Brokerage Tools
- Platform embeds directly on any website (WordPress, Wix, Squarespace, Webflow) without iframes or subdomains - a key SEO differentiator
- Pricing ranges from ~$49.95/month (legacy standard) up to $160-$225+/month for full CRM/team packages; newer Accelerate/Maximizer tiers are $144.95-$224.95+/month

---

## INTRODUCTION

iHomefinder (ihomefinder.com) is a real estate technology company offering IDX property search, CRM, and lead generation tools primarily for agents and brokerages in the US and Canada. This inventory documents every feature and benefit across their platform for the purpose of designing a custom-built equivalent. The platform is known as "Optima" for its WordPress plugin variant and "MAX" for its full CRM product.

---

## PACKAGE TIERS

### Tier 1: Essentials
- IDX plugin you add to your **existing website** (not a hosted website product)
- Includes core IDX search, lead capture forms, saved searches, email alerts, market pages
- No built-in website builder; relies on agent's own WordPress, Wix, Squarespace, etc.
- No full CRM in base tier (CRM is an add-on or higher tier)

### Tier 2: Accelerate
- Everything in Essentials plus a **custom hosted website** (built on WordPress)
- Includes professional design, custom domain setup
- VIP tour call-to-actions, Calendly integration for tour scheduling
- Neighborhood guide pages included
- Agent branding and custom CSS controls
- Built-in CRM functionality

### Tier 3: Maximizer
- Everything in Accelerate plus:
- **50 exclusive seller leads per month** (predictive seller prospect program)
- AI-driven marketing automation
- Multiple user seats for team operations
- White-glove onboarding and dedicated support
- Agent-branded nurturing campaigns
- Advanced lead assignment rules
- Higher capacity for large team/brokerage use

---

## FEATURE INVENTORY: COMPLETE BREAKDOWN

---

### CATEGORY 1: IDX PROPERTY SEARCH

#### 1.1 Basic Property Search
**What it is:** A property search interface that pulls live MLS listings directly onto the agent's website.
**What it does:** Allows website visitors to search available properties by location, price, bedrooms, bathrooms, property type, and other criteria. Data refreshes automatically from 450+ MLS systems across the US/Canada.
**User benefit:** Buyers can search homes without leaving the agent's website, keeping the agent top-of-mind and capturing behavior data. No need to go to Zillow or Realtor.com.
**Agent/broker benefit:** Keeps leads on-site, captures registration data, tracks search behavior for follow-up.
**Custom build approach:** Integrate with an MLS data provider (RESO Web API, Spark API, Bridge Interactive, or a data aggregator like ListHub/Homesnap data feeds). Build search UI with Next.js server components, Prisma for local caching, and a filter/facet system. Use Elasticsearch or PostgreSQL full-text search + geospatial queries for fast results.

#### 1.2 Advanced Search Filters
**What it is:** Extended filtering controls beyond the basic search form.
**What it does:** Allows users to filter by: price range, beds/baths (min/max), square footage, lot size, year built, property type (single family, condo, townhouse, multi-family, land, commercial), amenities (pool, garage, waterfront, view, fireplace), school district, HOA yes/no, new construction, open houses only, days on market.
**User benefit:** Buyers can narrow searches to exactly what they need without wading through irrelevant listings.
**Agent/broker benefit:** Higher quality leads who have self-qualified via filters; longer time-on-site.
**Custom build approach:** Build a faceted search component with collapsible panels. Store filter state in URL query parameters for shareability/bookmarking. Use debounced API calls to avoid over-fetching. Implement a "More Filters" accordion pattern for advanced options.

#### 1.3 Map Search
**What it is:** An interactive map-based property search interface.
**What it does:** Displays listings as pins on a map (Google Maps or Mapbox). Users can pan/zoom the map to search within the visible area. Clicking a pin shows a listing card. Supports "search as I move the map" functionality.
**User benefit:** Visual search is more intuitive for buyers who are location-specific (near work, school, family). Premium map search sites get 50% more leads and 30% more listing views than form-based sites.
**Agent/broker benefit:** Higher engagement and lead capture rates; data shows significant conversion lift.
**Custom build approach:** Use Mapbox GL JS or Google Maps JavaScript API. Implement clustering for dense areas (use supercluster library). Store listing coordinates in PostGIS. Build a split-screen layout: map on right, listing cards on left, synchronized. Add "search this area" button triggered on map movement.

#### 1.4 Polygon/Draw Search
**What it is:** A tool allowing users to draw a custom boundary on the map to define their search area.
**What it does:** Users draw a freehand polygon or custom shape on the map. Only listings within that drawn area are shown. Useful for irregular search areas (e.g., "only this neighborhood, not that one").
**User benefit:** Highly precise geographic searches that match how buyers actually think about location.
**Agent/broker benefit:** Differentiating feature that shows buyers the agent's site is as powerful as national portals.
**Custom build approach:** Use Mapbox Draw or Google Maps Drawing Manager for polygon input. Convert polygon to GeoJSON, store in DB. Use PostGIS `ST_Within()` or `ST_Contains()` for geospatial queries. Render polygon as a persistent layer on the map.

#### 1.5 Property Detail Pages
**What it is:** Individual listing pages showing full details for each property.
**What it does:** Displays all MLS fields: photos (carousel/gallery), price, address, beds/baths/sqft, description, property features, listing agent info, days on market, MLS#, status (active/pending/sold). Includes embedded third-party widgets.
**User benefit:** Complete information in one place to evaluate a home without additional research.
**Agent/broker benefit:** Lead capture opportunities on every listing page; higher time-on-site.
**Custom build approach:** Dynamic Next.js route `/properties/[mlsNumber]`. Fetch from MLS API or local DB. Include photo carousel (Swiper.js or similar), full-screen gallery, print-to-PDF option. Add schema.org `RealEstateListing` structured data for SEO.

#### 1.6 Walk Score Integration
**What it is:** Embeds the Walk Score widget on listing detail pages.
**What it does:** Shows the property's walkability score (0-100), transit score, and bike score. Powered by walkscore.com API.
**User benefit:** Buyers immediately understand neighborhood walkability without separate research.
**Agent/broker benefit:** Adds value to listing pages, increases time-on-site, reduces buyer objections.
**Custom build approach:** Integrate Walk Score API (walkscore.com/professional/api.php). Fetch scores by address/lat-long. Display branded badge with score and description. Cache results in DB to avoid repeated API calls.

#### 1.7 GreatSchools Integration
**What it is:** Embeds school ratings and data on listing detail pages.
**What it does:** Shows nearby schools (elementary, middle, high school) with GreatSchools ratings (1-10). Powered by GreatSchools API.
**User benefit:** Families with children can assess school quality without leaving the listing page.
**Agent/broker benefit:** Critical data point for family buyers; significantly increases relevance of listing pages.
**Custom build approach:** Integrate GreatSchools API. Display schools sorted by type and rating. Show distance from property. Include link to GreatSchools profile for each school.

#### 1.8 Mortgage Calculator on Listing Pages
**What it is:** An embedded payment estimator on each property detail page.
**What it does:** Calculates estimated monthly payment based on price, down payment percentage, interest rate, and loan term. Shows principal+interest, and optionally taxes/insurance.
**User benefit:** Buyers immediately see affordability without leaving the page. Reduces friction in the decision process.
**Agent/broker benefit:** Increases time on listing pages; often triggers the "I can afford this" moment leading to contact.
**Custom build approach:** Build as a client-side React component. Use standard mortgage formula: M = P[r(1+r)^n]/[(1+r)^n-1]. Include fields for down payment %, interest rate (pre-populate with current rate), loan term (15/30 year). Fetch current average rates from FRED API or similar for pre-population.

#### 1.9 Open House Search / Schedule Display
**What it is:** A search filter specifically for properties with scheduled open houses, plus display of open house times on listing pages.
**What it does:** Filters search results to show only listings with upcoming open houses. Shows open house dates and times on property detail pages.
**User benefit:** Buyers planning a weekend of house tours can quickly find available open houses.
**Agent/broker benefit:** Drives physical showings; helps agents promote their own open houses.
**Custom build approach:** Store open house schedules in DB (synced from MLS feed). Add open house filter to search. Display open house schedule prominently on listing detail page. Build a "Open Houses This Weekend" widget for homepage/sidebar.

#### 1.10 Featured Listings (Own Listings Showcase)
**What it is:** A dedicated page and widgets that automatically display the agent's or broker's own MLS listings.
**What it does:** Pulls listings matching the agent's MLS ID or office ID. Creates a curated gallery of the agent's active, pending, and sold listings. Can be embedded anywhere on the site via widget/shortcode.
**User benefit:** Buyers can see the agent's current inventory at a glance.
**Agent/broker benefit:** Critical marketing tool - showcases the agent's business volume and expertise. Builds credibility.
**Custom build approach:** Match listings by agent license number or MLS agent ID from the data feed. Create a filterable gallery component. Support status filters (active/pending/sold). Include a "Listings by [Agent Name]" dedicated page.

#### 1.11 Supplemental / Pocket Listings
**What it is:** The ability to add listings to the site that are not in the MLS (off-market, pre-market, exclusive listings).
**What it does:** Agents manually enter property details, photos, and description to create "pocket listings" that display alongside MLS listings on their site.
**User benefit:** Buyers get access to exclusive inventory not available on public portals.
**Agent/broker benefit:** Major value-add - creates urgency and exclusivity; a reason buyers must register on the agent's site.
**Custom build approach:** Build an admin UI for manual listing entry. Store in same `listings` table with a `source: 'manual'` flag. Display in search results and featured listings with an "exclusive" badge. Gate behind registration for maximum lead capture value.

#### 1.12 Sold/Pending Listings Display
**What it is:** Shows sold and pending listings in search results and on agent pages.
**What it does:** Includes recently sold properties in search results (where MLS permits). Shows agent's sold listing history on their bio page. Pending listings show as "under contract."
**User benefit:** Buyers can research market values; sellers can see proof of agent's track record.
**Agent/broker benefit:** Demonstrates agent activity and success to potential seller leads. Validates pricing advice.
**Custom build approach:** Include status filter for `sold`/`pending` in MLS data sync. Display with status badge overlay on listing photos. Allow date range filtering for sold listings (e.g., "sold in last 6 months").

#### 1.13 IDX on Any Website Platform (No iframe/Subdomain)
**What it is:** A technical architecture that embeds IDX content directly on any website platform without iframes or subdomains.
**What it does:** Listing pages, search pages, and market reports all load on the agent's primary domain (e.g., mysite.com/search, not search.mysite.com or mysite.idxprovider.com). Content is server-rendered and indexable by search engines.
**User benefit:** Seamless browsing experience; no visible transitions to a different site/subdomain.
**Agent/broker benefit:** Critical SEO advantage - all IDX pages pass link equity to the main domain. Google indexes listing content as the agent's own content.
**Custom build approach:** This is the native architecture of a custom Next.js build. All pages live under the same domain. Use Next.js App Router with server components for full SSR/SSG. Generate listing pages with proper metadata (title, description, OG tags) for SEO.

---

### CATEGORY 2: LEAD CAPTURE

#### 2.1 Visitor Registration / Registration Wall
**What it is:** A system that prompts or requires website visitors to register (provide name/email) before viewing full listing details or saving searches.
**What it does:** Shows a registration prompt after a configurable number of listing views (e.g., after viewing 3 listings) or when attempting to save a search. Captures email, name, and optionally phone number.
**User benefit:** Registered users get personalized features (saved searches, alerts, saved listings).
**Agent/broker benefit:** Converts anonymous traffic into identifiable leads with contact info for follow-up.
**Custom build approach:** Track anonymous session view counts in cookies/localStorage. Trigger modal after threshold. Use NextAuth.js or Supabase Auth for registration. Store partial profiles in Prisma. Support "soft" registration (just email first, then name on second form) to reduce friction.

#### 2.2 Schedule a Showing Request
**What it is:** A contact form embedded on listing detail pages specifically for requesting property showings.
**What it does:** Pre-fills the listing address. Collects name, email, phone, preferred date/time. Sends notification to agent via email/SMS/app push. Leads entered into CRM automatically.
**User benefit:** One-click pathway from listing to showing appointment without calling.
**Agent/broker benefit:** High-intent leads - showing requests are the strongest conversion signal. Immediate notification allows fast follow-up.
**Custom build approach:** Build a `ShowingRequest` form component. Create a `/api/showing-requests` POST endpoint. Send agent notification via email (Resend) and optionally SMS (Twilio). Store in Prisma with lead linkage. Add to agent's task queue for follow-up.

#### 2.3 Request More Information Form
**What it is:** A contact form on listing pages for buyers to ask questions about a specific property.
**What it does:** Pre-fills property address. Collects name, email, phone, message. Routes to listing agent or buyer's agent. Creates lead record in CRM.
**User benefit:** Easy way to inquire without a phone call.
**Agent/broker benefit:** Captures leads who are researching but not yet ready for a showing. Good for nurturing.
**Custom build approach:** Simple contact form on each listing page with the listing address pre-filled in the message. POST to `/api/inquiries`. Store inquiry linked to both lead and listing in DB.

#### 2.4 Valuation Request Form ("Sell My Home" Widget)
**What it is:** A form where homeowners enter their address to get an estimated home value.
**What it does:** Collects property address (postal code, beds, baths), name, email, phone. Shows a results page with recently sold comparable properties. Creates a seller lead in CRM.
**User benefit:** Homeowners get a market-based estimate of their home's value.
**Agent/broker benefit:** Captures seller leads - the most valuable lead type. The "what's my home worth" call-to-action converts at high rates.
**Custom build approach:** Build a multi-step form: Step 1 (address/property details), Step 2 (contact info), Step 3 (results with comps). Pull sold comps from MLS data matching postal code, beds, baths. Display as a listing grid. Send agent notification. Enter lead into seller nurture campaign. Can be embedded as a widget on any page.

#### 2.5 General Contact Form
**What it is:** Standard website contact form.
**What it does:** Collects name, email, phone, message. Routes to agent. Creates lead record.
**User benefit:** Easy way to reach out for any inquiry.
**Agent/broker benefit:** Captures leads from any page of the site.
**Custom build approach:** Standard Next.js form with Zod validation. POST to `/api/contact`. Email notification via Resend. Store as lead in Prisma.

#### 2.6 Lead Source Tracking
**What it is:** A system that tracks which marketing channel each lead came from.
**What it does:** Agents append a custom `?leadSource=` parameter to their website URLs used in ads/campaigns. When a lead registers after clicking that URL, their source is recorded. Alternatively uses UTM-style parameters. Source is displayed in the CRM lead record.
**User benefit:** No direct user benefit; this is an internal analytics tool.
**Agent/broker benefit:** Shows which advertising channels (Facebook ads, Google Ads, email campaigns, flyers) generate the most leads and clients. Allows ROI-based budget decisions.
**Custom build approach:** Capture UTM parameters and `leadSource` query params on landing. Store in cookie/sessionStorage. When lead registers, write the source data to their lead record in DB. Build a "Lead Sources" report in the admin dashboard with lead counts and conversion rates by source.

#### 2.7 Open House Lead Entry (Mobile App)
**What it is:** The ability to enter open house attendees as leads directly from the mobile app at the event.
**What it does:** Agent uses Optima Leads app to enter visitor name/contact info at an open house. Lead is immediately created in CRM and entered into an open house follow-up drip campaign.
**User benefit:** Open house visitors receive follow-up with listings in that neighborhood.
**Agent/broker benefit:** Turns in-person open house visitors into a digital nurture pipeline. No paper sign-in sheets needed.
**Custom build approach:** Build a mobile-friendly "quick add lead" form in the agent app. Optionally a QR code-based self-sign-in for visitors. Auto-tag leads with `source: 'open_house'` and trigger open house follow-up campaign.

#### 2.8 Forced vs. Soft Registration Options
**What it is:** Configuration options for when and how aggressively to prompt lead registration.
**What it does:** "Forced" registration shows a login/register wall immediately or after a set number of views. "Soft" registration is a polite prompt that can be dismissed. Multiple styles available (modal, banner, inline).
**User benefit:** Soft registration is less intrusive; users can choose to register for more features.
**Agent/broker benefit:** Balance between capturing all possible leads (forced) vs. maximizing browsing engagement (soft). A/B testing which approach converts better.
**Custom build approach:** Build a configurable registration prompt system. Store threshold config in DB. Track view counts per session. Support multiple display modes (modal, slide-in, inline). A/B test configurations with analytics.

---

### CATEGORY 3: SAVED SEARCHES & PROPERTY ALERTS

#### 3.1 Saved Searches
**What it is:** A feature allowing registered users to save their current search criteria for future reference.
**What it does:** Users name and save their filter combination (e.g., "3-bed condos in Downtown under $500k"). Saved searches appear in the user's account dashboard for one-click re-running.
**User benefit:** Don't have to re-enter filters every visit. Quick access to their specific searches.
**Agent/broker benefit:** Registration prompt - saving a search requires an account. Creates ongoing engagement hook.
**Custom build approach:** Store search criteria as JSON in a `SavedSearch` table linked to user. Build "Save This Search" button in search results. Create a "My Searches" dashboard section. Support multiple saved searches per user.

#### 3.2 Email Listing Alerts (New Listings)
**What it is:** Automated daily emails sent when new listings matching a saved search criteria appear in the MLS.
**What it does:** Every time a new listing hits the MLS matching the saved search criteria (price, location, beds, etc.), the system sends an email alert to the registered user. Sent daily if there is activity.
**User benefit:** Never miss a new listing that matches exactly what they're looking for. Delivered to inbox automatically.
**Agent/broker benefit:** Keeps agent top-of-mind daily. Every email is branded. Drives repeat site visits. Creates ongoing engagement without manual effort.
**Custom build approach:** Build a nightly cron job (`/api/cron/listing-alerts`). For each active saved search, query new listings since last check. If matches found, send personalized email via Resend with listing photos, prices, and links to agent's site. Track email opens/clicks. Mark listings as "alerted" to avoid duplicates. Use a `ListingAlert` table to track history.

#### 3.3 Price Change Alerts
**What it is:** Email notifications when a listing in a saved search has a price reduction.
**What it does:** When a listing's price decreases, the system sends an alert to users who have that listing saved or who have a saved search that matches the listing.
**User benefit:** Buyers following a property or area are immediately notified when sellers reduce prices. Creates urgency.
**Agent/broker benefit:** Timely, relevant touchpoints that don't feel like marketing. High open rates.
**Custom build approach:** During the MLS data sync job, detect price changes by comparing current price with previously stored price. Trigger alert email to all users with matching saved searches or the listing saved to their favorites.

#### 3.4 Sold Listing Alerts
**What it is:** Notifications when a listing sells (where MLS permits).
**What it does:** When a property in a user's saved search area sells, alerts are sent showing the sold price. Helps buyers track market activity.
**User benefit:** Buyers can see what's actually selling and at what price - free market intelligence.
**Agent/broker benefit:** Positions the agent as a market data resource. Supports conversations about offer strategy.
**Custom build approach:** Detect status changes to "sold" in MLS sync. Send alert email with sold price and days on market. Only send where MLS data agreement permits sold price display.

#### 3.5 Weekly Open House Reports (MarketBoost)
**What it is:** Automated weekly emails listing open houses in the user's area of interest.
**What it does:** Every Thursday, the system sends an email with all upcoming open houses (through the following week) in areas matching the user's saved searches. Branded to the agent.
**User benefit:** Convenient weekly digest helps buyers plan weekend viewing trips.
**Agent/broker benefit:** Regular branded touchpoint on a reliable schedule. Promotes agent's own open houses.
**Custom build approach:** Thursday cron job. Aggregate open house events from MLS data for saved search areas. Compile into a weekly digest email template. Send via Resend. Track open rates.

#### 3.6 Monthly Market Stats Reports (MarketBoost)
**What it is:** Automated monthly emails summarizing market statistics for the user's area of interest.
**What it does:** Monthly email with market data for the saved search area: median price, number of sales, average days on market, inventory levels, sale-to-list price ratio, 6-month trends. Branded to the agent.
**User benefit:** Ongoing market education. Helps buyers understand timing and pricing context.
**Agent/broker benefit:** Positions agent as a market expert. High perceived value = low unsubscribe rate. Monthly touchpoint without cold outreach.
**Custom build approach:** First-of-month cron. Aggregate MLS stats by zip code/city/neighborhood. Generate market report with charts (Chart.js). Send templated email. Store report snapshots in DB for historical comparison.

---

### CATEGORY 4: MARKET STATISTICS (MARKETBOOST)

#### 4.1 Market Statistics Pages
**What it is:** Dynamic web pages showing real-time market data for specific neighborhoods, cities, or zip codes.
**What it does:** Displays: active listing count, median list price, median sold price, sale-to-list price ratio, average days on market, months of inventory. Data updates daily from MLS. 6 months of trend data shown in graphs.
**User benefit:** Buyers and sellers get professional-grade market intelligence directly on the agent's website without going to Zillow or Redfin.
**Agent/broker benefit:** SEO value from unique market data content. Sellers use it to validate pricing. Positions agent as local market expert. Can embed on neighborhood pages.
**Custom build approach:** Build a `MarketStats` data model. Daily cron to aggregate sold/active/pending listings by area (zip code, city, subdivision). Calculate metrics. Store as JSON snapshots. Build a Market Stats page component with Chart.js visualizations. Generate dynamic pages for every market area the agent covers (e.g., `/markets/san-francisco-ca`, `/markets/mission-district`).

#### 4.2 Market Reports by Area (Saved Search-Based)
**What it is:** Market reports generated from any saved search criteria (not just geographic areas).
**What it does:** Agent creates a "Market" (saved search) in their account - e.g., "3-bedroom condos in Midtown $400k-$600k". The system generates a live market report for that specific subset of the market. Can be embedded on any page on the site.
**User benefit:** Hyper-specific market data for exactly the buyer's criteria - not just "the market" generally.
**Agent/broker benefit:** Allows creation of niche market report pages that rank for long-tail SEO terms (e.g., "2-bedroom condos for sale in [neighborhood]").
**Custom build approach:** Allow agent to define "markets" as saved search criteria. Generate report pages at `/markets/[slug]`. Pre-compute stats for each market definition. Allow embedding via a widget/iframe. Support embedding on custom neighborhood pages.

#### 4.3 Embedded Market Report Widgets
**What it is:** Small embeddable data widgets showing key market stats that can be placed on any page.
**What it does:** Shows a summary of market data (e.g., "Median Price: $485k | 23 Active Listings | 12 Days on Market") as an inline widget. Links to the full market report page.
**User benefit:** Quick data summary on neighborhood pages without navigating away.
**Agent/broker benefit:** Adds data richness to community/neighborhood content pages. Improves SEO content quality signals.
**Custom build approach:** Build a reusable `MarketStatsWidget` component that accepts a market area as a prop. Render inline with compact stats. Link to full market report.

---

### CATEGORY 5: CRM - CONTACT MANAGEMENT

#### 5.1 Lead/Contact Database
**What it is:** The core CRM - a database of all leads and contacts captured from the website, imported, or manually added.
**What it does:** Stores: name, email, phone, source, registration date, notes, tags, status (lead/active client/past client), assigned agent, lead type (buyer/seller). Displays full activity history (website visits, listings viewed, emails opened, forms submitted).
**User benefit:** No direct user-facing benefit; this is an internal agent tool.
**Agent/broker benefit:** Central hub for managing all relationships. Never lose a lead. Full context for every conversation.
**Custom build approach:** Build a `Contact` model in Prisma with all fields. Build an admin CRM dashboard at `/admin/contacts`. Full-text search. Filtering by status, source, agent, date range. Sortable columns. Export to CSV.

#### 5.2 Contact Activity Timeline
**What it is:** A chronological log of everything a lead has done on the website and in communications.
**What it does:** Displays: registration date/time, listings viewed (with photo and address), searches performed, listings saved, emails received/opened/clicked, forms submitted (showing requests, inquiries, valuations), notes added by agent, drip campaign emails sent, text messages sent.
**User benefit:** No direct user benefit; internal agent tool.
**Agent/broker benefit:** Before calling a lead, agent can review exactly what properties they've been looking at, when they were last active, and what communications they've received. Enables highly personalized conversations.
**Custom build approach:** Build an `ActivityEvent` table in Prisma with polymorphic event types. Log all relevant events. Build a timeline component in the CRM contact detail view. Group events by date.

#### 5.3 Lead Rating / Scoring (Star System)
**What it is:** An automated rating system that assigns a 1-3 star score to each lead based on their website activity.
**What it does:** Analyzes property searches, listing views, emails opened, forms submitted. Top third of active leads get 3 stars, middle third get 2 stars, bottom third get 1 star. Inactive leads (6+ months) get 0 stars. Updates continuously.
**User benefit:** No direct benefit; internal tool.
**Agent/broker benefit:** Instant prioritization. Agents can sort their lead list by star rating to focus on the most engaged prospects first. No manual assessment needed.
**Custom build approach:** Build a lead scoring algorithm. Assign points: listing view (+1), saved listing (+3), saved search (+5), email open (+2), email click (+5), showing request (+10), valuation request (+10). Decay scores over time (multiply by 0.95 per day of inactivity). Calculate percentile rank among all active leads. Map to 1/2/3 star display.

#### 5.4 Lead Segmentation / Tags
**What it is:** The ability to tag and segment contacts into groups.
**What it does:** Add tags to contacts (e.g., "buyer," "seller," "past client," "investor," "relocating," "pre-approval needed"). Filter and search contacts by tag. Assign to drip campaigns by tag.
**User benefit:** No direct benefit; internal tool.
**Agent/broker benefit:** Targeted communications. Different messages for buyers vs. sellers vs. past clients. Bulk actions on segments.
**Custom build approach:** Build a `tags` many-to-many relationship in Prisma. Multi-select tag input in CRM. Filter contacts by tag. Use tags as criteria in automation rules.

#### 5.5 Notes
**What it is:** Free-form notes attached to a contact record.
**What it does:** Agents type notes about a contact: phone call summaries, property preferences, personal details, next steps. Notes are timestamped and attributed to the agent who wrote them.
**User benefit:** No direct benefit; internal tool.
**Agent/broker benefit:** Institutional memory for every relationship. Can see conversation history months later. Essential for teams where multiple agents interact with the same contact.
**Custom build approach:** Build a `Note` model linked to `Contact`. Rich text editor (Tiptap or TipTap). Timestamps and author attribution. Show in activity timeline.

#### 5.6 Tasks / Reminders
**What it is:** A to-do system for managing follow-up actions tied to contacts.
**What it does:** Create tasks with due dates, linked to a contact (e.g., "Call John Smith on Tuesday about 123 Main St"). View tasks in a prioritized list. Mark complete. Recurring tasks supported.
**User benefit:** No direct benefit; internal tool.
**Agent/broker benefit:** Never miss a follow-up. Task list surfaces the highest-priority actions each day.
**Custom build approach:** Build a `Task` model in Prisma. Task creation from contact record. Due date picker. Priority levels. Daily digest email to agent with upcoming tasks. Notification in agent dashboard.

#### 5.7 Calendar Sync (Google/Outlook/Apple)
**What it is:** Bi-directional sync of CRM tasks and appointments with external calendar apps.
**What it does:** CRM tasks and appointments sync to Google Calendar, Outlook, or Apple Calendar. Changes in either direction propagate. Keeps agent's schedule in one place.
**User benefit:** No direct benefit; internal tool.
**Agent/broker benefit:** Agents use their preferred calendar app; CRM tasks appear alongside personal appointments. No need to check two systems.
**Custom build approach:** Use Google Calendar API for Google sync. Use Exchange Web Services (EWS) or Microsoft Graph API for Outlook. Use CalDAV for Apple Calendar. Build OAuth connection flow in settings. Sync tasks with `VEVENT` format.

#### 5.8 Pipeline / Transaction Tracking
**What it is:** A visual pipeline showing where each contact/deal sits in the sales process.
**What it does:** Kanban-style board with stages: New Lead → Contacted → Actively Searching → Showing → Offer Made → Under Contract → Closed / Lost. Drag-and-drop to move contacts through stages. Shows dollar value at each stage.
**User benefit:** No direct benefit; internal tool.
**Agent/broker benefit:** Visual business health overview. Tracks production toward annual goals. Identifies where leads are getting stuck.
**Custom build approach:** Build a Kanban board component. Store pipeline stage in `Contact.pipelineStage`. Drag-and-drop with @dnd-kit. Show count and aggregate value at each stage. Build a goal tracker ("$500k closed / $2M goal").

#### 5.9 Goals / Production Reporting
**What it is:** Dashboard showing agent performance against set goals.
**What it does:** Agent sets annual goals (e.g., 20 transactions, $300k GCI). Dashboard shows progress: transactions closed, closed volume, active pipeline value, conversion rates by lead source.
**User benefit:** No direct benefit; internal tool.
**Agent/broker benefit:** Business planning and accountability. Especially valuable for teams where brokers can see individual agent performance.
**Custom build approach:** Goals settings screen. Transaction tracking model. Dashboard with progress bars and charts. Chart.js for visualizations. Team view shows all agents' production.

---

### CATEGORY 6: MARKETING AUTOMATION

#### 6.1 Drip Email Campaigns
**What it is:** Automated sequences of pre-written emails sent to leads on a schedule.
**What it does:** Agent creates or uses pre-built campaigns (buyer campaign, seller campaign, past client campaign). Each campaign has N emails, with configurable delay between each (e.g., Day 1, Day 3, Day 7, Day 14...). New leads are automatically assigned to campaigns based on rules (lead source, type). Drag-and-drop email reordering.
**User benefit:** Receives relevant information and listing recommendations without the agent having to manually reach out.
**Agent/broker benefit:** Automated, consistent follow-up on every lead without manual effort. Proven to increase conversion vs. no follow-up.
**Custom build approach:** Build `Campaign`, `CampaignEmail`, and `LeadCampaignEnrollment` models. Cron job checks for pending emails to send. Support personalization tokens ({{first_name}}, {{listing_address}}, etc.). Track email sends, opens, clicks per enrollment.

#### 6.2 Pre-Built Campaign Templates
**What it is:** Ready-to-use campaign sequences for common scenarios.
**What it does:** iHomefinder provides pre-written email sequences for: New Buyer Lead, Active Buyer, Seller Lead, Past Client Re-engagement, Open House Follow-up, Internet Lead. Agent can use as-is or customize.
**User benefit:** More relevant, contextual emails rather than generic blasts.
**Agent/broker benefit:** Agents can launch with zero copywriting. Professional, proven sequences out of the box.
**Custom build approach:** Build a template library. Include 5-7 pre-built campaign templates with placeholder copy. Allow cloning and editing. Store in `CampaignTemplate` table.

#### 6.3 Smart Content (AI-Powered Listing Recommendations in Emails)
**What it is:** AI-generated personalized listing recommendations embedded in drip emails.
**What it does:** Based on each lead's search activity (criteria, viewed listings, saved listings), the system generates a personalized list of current listings to include in the email. Every recipient's email shows different listings tailored to their behavior.
**User benefit:** Receives emails with listings they actually care about, not irrelevant properties.
**Agent/broker benefit:** Higher email open/click rates. More relevance = more engagement = more conversion. No manual listing selection needed.
**Custom build approach:** When generating a drip email for a lead, query their most recent search criteria and saved listings. Run a match query against current active MLS listings. Include top 3-5 matches with photos/price/address. Can use a simple scoring algorithm (exact criteria match, recency) rather than true ML for v1.

#### 6.4 Behavioral Trigger Automation
**What it is:** Rules that automatically trigger actions when a lead takes a specific action on the website.
**What it does:** Examples: "When a lead saves a listing → Send email with similar listings." "When a lead who has been inactive for 30 days visits the site → Send re-engagement email + notify agent." "When a lead submits a showing request → Assign to high-priority campaign + send agent notification."
**User benefit:** Receives timely, contextual responses to their actions.
**Agent/broker benefit:** Automation responds faster than any human could. Captures lead intent at the exact right moment.
**Custom build approach:** Build an automation rules engine. Store rules in DB as condition/action pairs. Conditions: `event_type = 'listing_saved'`, `days_since_last_visit > 30`, etc. Actions: `send_email`, `notify_agent`, `add_to_campaign`, `assign_to_agent`. Run rules evaluation on every event.

#### 6.5 Assignment Rules (Automation-Based Lead Assignment)
**What it is:** Rules that automatically assign new leads to specific agents or campaigns based on criteria.
**What it does:** Rules like: "All leads from Zillow → Assign to Agent Johnson → Add to 'Zillow Buyer' campaign." "All leads with estimated budget >$750k → Assign to luxury agent → Add to 'Luxury Buyer' campaign." "All seller leads → Add to 'Seller Nurture' campaign."
**User benefit:** No direct benefit; internal tool.
**Agent/broker benefit:** Ensures no lead falls through the cracks. Appropriate agent/campaign for every lead type without manual sorting.
**Custom build approach:** Build an `AutomationRule` model with trigger conditions and action definitions. UI for building rules with a condition builder. Process rules on lead creation. Fall-through "catch all" rule as a safety net.

#### 6.6 SMS/Text Message Campaigns
**What it is:** Text message delivery integrated into drip campaigns alongside email.
**What it does:** Campaign emails can have companion text messages. Leads who opted into texts receive SMS messages on the campaign schedule. Supports personalization tokens in texts. Supports SMS, MMS (images), and emoji. Agent gets a dedicated 10-digit phone number. Responses to texts come to the agent. Uses Twilio for delivery.
**User benefit:** Receives more immediate, attention-grabbing notifications via text.
**Agent/broker benefit:** Text messages have dramatically higher open rates than email (98% vs 20%). Hybrid email+text campaigns outperform either alone.
**Custom build approach:** Integrate Twilio SMS API. Build consent capture in registration forms (legally required). Provision dedicated phone numbers. Add SMS steps to campaign builder. Handle incoming replies (Twilio webhook → store in conversation thread). Track delivery receipts.

#### 6.7 Birthday & Anniversary Automated Messages
**What it is:** Automated emails/texts sent automatically on contacts' birthdays and closing anniversaries.
**What it does:** Store birthday and closing date in contact record. System automatically sends a personalized greeting email or text on those dates.
**User benefit:** Feels remembered and valued by their agent.
**Agent/broker benefit:** Relationship-building at scale. Closing anniversary is a perfect trigger for a "Are you thinking of selling?" message. Top agents use this for past client re-engagement.
**Custom build approach:** Birthday/anniversary date fields in `Contact` model. Daily cron checks for today's birthdays and anniversaries. Send personalized email template. Include a gentle CTA ("We'd love to help you again or refer a friend").

#### 6.8 AI Facebook Post Automation
**What it is:** Automated, AI-generated posts to the agent's Facebook Business Page.
**What it does:** System generates listing posts, market update posts, or engagement posts and publishes them automatically to the agent's connected Facebook page. Posts are personalized based on contact/audience behavior.
**User benefit:** No direct user benefit; audience sees relevant content.
**Agent/broker benefit:** Consistent social media presence without manual effort. Keeps Facebook page active.
**Custom build approach:** Integrate Facebook Graph API for page posting. Build a post template library. Use AI generation (OpenAI API) to write varied listing descriptions. Schedule posts with a queue system.

---

### CATEGORY 7: EMAIL MARKETING

#### 7.1 Email Campaign Builder
**What it is:** A drag-and-drop or template-based tool for creating custom email campaigns.
**What it does:** Agent designs email with their branding, logo, color scheme, and custom content. Can add listing galleries, market stats, text blocks, CTAs. Preview on desktop and mobile before sending.
**User benefit:** Receives professionally designed emails that are easy to read and act on.
**Agent/broker benefit:** Professional brand presentation in email. Ability to create one-off emails for special announcements (new listing, price reduction, market update).
**Custom build approach:** Use React Email for server-side HTML email rendering. Build a template editor or provide pre-built templates. Support personalization variables. Integrate with Resend for delivery. Build email preview functionality.

#### 7.2 Broadcast/Blast Emails
**What it is:** The ability to send a single email to a segment or all contacts at once.
**What it does:** Agent selects a contact segment (or all contacts), writes/selects an email, and sends it to everyone at once. Used for market updates, new listing announcements, newsletter.
**User benefit:** Receives timely updates about new listings and market conditions from their trusted agent.
**Agent/broker benefit:** Efficient mass communication. One email reaches entire database simultaneously.
**Custom build approach:** Build a "Send Campaign" flow. Select audience (all contacts, segment by tag, saved search). Choose email template or compose. Preview send count. Send via Resend in batches (respect rate limits). Track delivery/open/click stats per broadcast.

#### 7.3 Email Open/Click Tracking
**What it is:** Tracking whether recipients open emails and click links within them.
**What it does:** Embeds a 1x1 tracking pixel for open tracking. Wraps all links through a redirect for click tracking. Records opens/clicks in each contact's activity timeline. Updates lead score.
**User benefit:** No direct benefit; internal analytics.
**Agent/broker benefit:** See which leads are engaging with email content. Email activity is a strong buying intent signal. Triggers behavioral automation rules.
**Custom build approach:** Use Resend webhooks for delivery events (delivered, opened, clicked, bounced). Store events in `EmailEvent` table linked to contact. Update lead score. Fire automation rules on click events.

#### 7.4 Branded Email Appearance
**What it is:** All outgoing emails are branded to the agent (name, photo, brokerage, logo, color scheme).
**What it does:** Emails sent by the system display the agent's name as sender, include their headshot, brokerage logo, and color scheme. Recipients see a consistent, professional brand identity.
**User benefit:** Recognizes who the email is from immediately; builds trust.
**Agent/broker benefit:** Brand recognition. Consistent identity across all touchpoints.
**Custom build approach:** Build email template with configurable branding variables (agent name, photo URL, brokerage name, logo URL, brand color hex). Store in agent profile settings. Apply to all outgoing system emails.

---

### CATEGORY 8: AGENT & BROKER WEBSITE TOOLS

#### 8.1 Hosted Website Builder
**What it is:** A complete website hosting and design solution included in higher plan tiers.
**What it does:** Provides a WordPress-based website with professional templates, hosting, and custom domain setup. Agent provides their domain; site is hosted on iHomefinder's infrastructure. Includes all IDX pages pre-integrated.
**User benefit:** Professional website experience; fast page loads; works across devices.
**Agent/broker benefit:** No need to hire a web developer. A complete, IDX-integrated website in one package.
**Custom build approach:** This is the project itself - a custom Next.js website with integrated property search. Hosted on Vercel. Custom domain configured by client.

#### 8.2 Agent Bio Pages
**What it is:** Individual profile pages for each agent within a brokerage website.
**What it does:** Displays: agent photo, name, title, bio/about text, contact info, social media links, languages spoken, certifications/designations, service areas. Automatically populates the agent's active, pending, and sold listings from MLS.
**User benefit:** Buyers/sellers can research individual agents before choosing who to work with.
**Agent/broker benefit:** Each agent gets a searchable, branded profile. Auto-populated listings showcase their production.
**Custom build approach:** `Agent` model in Prisma. Admin UI for agent profile management. Auto-pull listings by agent MLS ID. Public page at `/agents/[slug]`. Include listings carousel, contact form.

#### 8.3 Agent Roster Page
**What it is:** A directory of all agents in the brokerage.
**What it does:** Grid/list display of all agents with photo, name, title, and specialty. Links to individual agent bio pages. Filterable by specialty, language, service area.
**User benefit:** Easy browsing of all available agents to find the right fit.
**Agent/broker benefit:** Presents the full team professionally. Helps clients self-sort to the right agent, improving match quality.
**Custom build approach:** `/agents` page pulling all `Agent` records. Filter bar (specialty, language, area). Card grid layout. Links to individual bio pages.

#### 8.4 Neighborhood / Community Pages
**What it is:** Custom content pages for specific neighborhoods or communities.
**What it does:** Agent creates custom pages with local photos, neighborhood description, lifestyle information, and embedded IDX content (market stats, listing search filtered to that neighborhood, map search). Pages are SEO-optimized for "homes for sale in [neighborhood]" queries.
**User benefit:** Get deep, relevant information about specific neighborhoods in one place.
**Agent/broker benefit:** Major SEO opportunity. Each neighborhood page can rank for high-intent local search terms. Establishes agent as the local expert.
**Custom build approach:** `Neighborhood` model in Prisma with slug, name, description, boundaries. CMS-editable rich text. Auto-embed listing search filtered to neighborhood boundaries. Market stats widget. Photo gallery. Internal link structure between related neighborhoods.

#### 8.5 Custom CSS / Design Configuration
**What it is:** Tools allowing agents/developers to customize the visual appearance of IDX pages and website.
**What it does:** Design settings panel for colors, fonts, photo display style, listing card layout. For advanced users, a custom CSS editor to override any style. On WordPress, full theme compatibility.
**User benefit:** Cohesive visual experience matching the agent's brand.
**Agent/broker benefit:** Professional, branded appearance rather than a generic template.
**Custom build approach:** Design tokens/variables in CSS (brand primary color, secondary color, font family). Settings page in admin to configure these. Apply to all components via CSS custom properties.

#### 8.6 IDX Widgets
**What it is:** Embeddable mini-components that display listing data or search tools on any page.
**What it does:** Available widgets include: Quick Search bar, Featured Listings gallery, Market Stats summary, Listing Carousel (newest/price reduced/open houses), Property Map, Lead Capture form, "What's My Home Worth" button. Each is configurable and can be embedded via shortcode (WordPress) or HTML snippet (other platforms).
**User benefit:** Engaging, interactive elements throughout the site increase usefulness.
**Agent/broker benefit:** Listings and search tools on every page of the site (blog posts, about page, contact page). Every page becomes a lead capture opportunity.
**Custom build approach:** Build each widget as a standalone React component. Support embedding via script tag on non-Next.js pages. For the main site, compose directly as components. Configurable via props (e.g., `<ListingCarousel type="newest" count={6} />`).

#### 8.7 Mortgage Calculator Widget (Standalone)
**What it is:** A standalone mortgage calculator that can be placed on any page.
**What it does:** Accepts price (or uses a configurable default), down payment %, interest rate, loan term. Displays monthly payment breakdown. Can be placed on pages like "Buyers Guide," "Financing," or homepage.
**User benefit:** Financial planning tool accessible outside of individual listings.
**Agent/broker benefit:** Useful educational content that drives bookmarking and return visits. Can lead into a "Get Pre-Approved" CTA linking to a preferred lender.
**Custom build approach:** Same calculator component as the listing-page version, deployed standalone with configurable default price. Include "Get Pre-Approved" CTA linking to lender contact form.

---

### CATEGORY 9: SEARCH ENGINE OPTIMIZATION (SEO)

#### 9.1 SEO-Friendly URL Structure
**What it is:** Clean, descriptive URLs for all IDX pages.
**What it does:** Listing pages have URLs like `/homes-for-sale/123-main-st-san-francisco-ca-94102` rather than `/listing?id=12345`. Search pages have URLs like `/homes-for-sale/san-francisco-ca`. These are indexable by Google.
**User benefit:** More readable/memorable URLs.
**Agent/broker benefit:** Google prefers descriptive, keyword-rich URLs. Essential for ranking for "homes for sale in [city]" queries.
**Custom build approach:** Generate slugs from listing address. Use Next.js dynamic routes with descriptive slugs. Implement canonical tags. Handle listing expirations with 301 redirects or 410 responses.

#### 9.2 Metadata / Title Tags / Meta Descriptions
**What it is:** Configurable SEO metadata for all IDX pages.
**What it does:** Each listing page gets a unique title tag (e.g., "3BR/2BA Home at 123 Main St, San Francisco CA - $1.2M | [Agent Name]"). Each market page gets a city/area-specific title. Meta descriptions are auto-generated from listing data.
**User benefit:** Informative search result snippets in Google.
**Agent/broker benefit:** Better click-through rates from search results. Google uses title tags for ranking.
**Custom build approach:** Use Next.js `generateMetadata()` function for each dynamic page. Build templates: listing pages use address/price/beds/baths. Search pages use city/state/property type. Add Open Graph tags for social sharing previews.

#### 9.3 Structured Data / Schema Markup
**What it is:** Machine-readable metadata embedded in page HTML following schema.org standards.
**What it does:** Adds `RealEstateListing` schema to listing pages with price, address, bed/bath count, photo URLs, listing status. Eligible for rich results in Google Search (price, photos in search snippets).
**User benefit:** Richer, more informative Google search result snippets.
**Agent/broker benefit:** Higher click-through rates from search results. Potential for Google rich results/knowledge panels.
**Custom build approach:** Add JSON-LD schema in Next.js page `<Head>`. Use `schema.org/RealEstateListing` type. Include `address`, `numberOfBedrooms`, `numberOfBathroomsTotal`, `price`, `image`, `description`, `url` fields.

#### 9.4 Sitemap Generation
**What it is:** An auto-generated XML sitemap of all listing and content pages.
**What it does:** Generates a sitemap.xml file listing all listing detail pages, market pages, neighborhood pages, and blog posts. Submits (or allows submission) to Google Search Console.
**User benefit:** No direct benefit; helps Google discover pages.
**Agent/broker benefit:** Ensures all listing pages are discovered and indexed by Google quickly.
**Custom build approach:** Use Next.js sitemap generation (`next-sitemap` package or custom route). Generate dynamic sitemap including all listing pages, neighborhood pages, market pages. Include `lastmod` dates based on listing update timestamps. Auto-update on each data sync.

#### 9.5 Express Content (Blog Content Add-on)
**What it is:** A content writing service that publishes regular blog posts to the agent's website.
**What it does:** Provides 13 blog posts per 12-week cycle ($500/period). 10 posts are topic-based (agent selects categories: first-time buyers, luxury, investment, etc.). 3 posts are syndicated national market statistics from iHomefinder's blog. Posts include category-appropriate stock images.
**User benefit:** More useful content on the agent's site.
**Agent/broker benefit:** Fresh, unique content signals to Google that the site is active. Long-tail keyword coverage. Establishes agent as a thought leader.
**Custom build approach:** Build a blog/CMS system (can use MDX or a headless CMS like Sanity/Contentful). For content generation, can use AI writing tools (OpenAI API). Establish a content calendar. Each post gets full SEO treatment (title, meta, schema). Internal linking strategy between blog posts and neighborhood pages.

---

### CATEGORY 10: INTEGRATIONS

#### 10.1 Third-Party Lead Import (30+ Sources)
**What it is:** The ability to receive leads from external real estate portals directly into the CRM.
**What it does:** Supports lead import from: Zillow, Zillow Premier Agent, Trulia, Realtor.com, HomeFinder, HotPads, Homes.com, BoomTown, Market Leader, Facebook Lead Ads, KW eEdge, and 25+ others. Leads flow in automatically via email parsing or API.
**User benefit:** No direct benefit; internal tool.
**Agent/broker benefit:** Single inbox for all leads regardless of source. Automatic campaign assignment by source. No leads lost in email or different portals.
**Custom build approach:** Build email parsing for portal lead notification emails (use regex to extract name/email/phone/message from forwarded emails). Build API connectors for platforms that offer them. Build a lead intake webhook endpoint that portals can POST to. Store all leads in unified `Contact` table with `source` field.

#### 10.2 Zapier Integration
**What it is:** Connection to Zapier's automation platform for integration with 8,000+ apps.
**What it does:** Triggers available: New Lead Created. Actions available: Add Contact. This enables connections to: Salesforce, HubSpot, Mailchimp, Follow Up Boss, Google Sheets, Slack, and thousands more. No-code automation building.
**User benefit:** No direct benefit; internal tool.
**Agent/broker benefit:** Extend the platform without custom development. Connect to preferred tools.
**Custom build approach:** Build a webhook system for outbound events. Build an inbound webhook endpoint for receiving data from Zapier. Alternatively, use a native Zapier developer account to create official Zapier triggers/actions.

#### 10.3 Follow Up Boss Integration
**What it is:** Direct integration with Follow Up Boss CRM.
**What it does:** New iHomefinder leads automatically flow into Follow Up Boss with full activity data (search behavior, listings viewed). Existing Follow Up Boss users can use iHomefinder IDX while keeping their preferred CRM.
**User benefit:** No direct benefit; internal tool.
**Agent/broker benefit:** Teams already on Follow Up Boss don't have to switch CRMs to use iHomefinder IDX.
**Custom build approach:** Follow Up Boss has an API. Build a connector that sends new leads to FUB API with activity data. Use webhook from iHomefinder side to trigger the sync.

#### 10.4 Google Analytics Integration
**What it is:** Connection to Google Analytics (GA4) for website traffic analysis.
**What it does:** IDX pages fire standard GA4 events. Custom events for IDX-specific actions (search performed, listing viewed, lead registered). Traffic sources, page views, session data all tracked in GA4 dashboard.
**User benefit:** No direct benefit; internal analytics.
**Agent/broker benefit:** Full website analytics including IDX page performance. Integration with paid advertising attribution (Google Ads conversion tracking).
**Custom build approach:** Implement GA4 via `@next/third-parties/google` or Google Tag Manager. Define custom events for all key actions: `search_performed`, `listing_viewed`, `lead_registered`, `showing_requested`, `valuation_requested`. Push to dataLayer.

#### 10.5 Calendly Integration
**What it is:** Integration with Calendly for automated appointment scheduling.
**What it does:** Replaces manual back-and-forth scheduling. A "Schedule a Tour" button on listings opens a Calendly booking page showing the agent's real-time availability. Booking confirmation sent to both parties.
**User benefit:** Book a tour appointment in seconds without calling.
**Agent/broker benefit:** Automates scheduling for buyers. Reduces phone-tag. Appointments sync to agent's calendar automatically.
**Custom build approach:** Embed Calendly widget inline on listing pages or showing request form. Pass listing address as a prefilled question in the Calendly booking form. Alternatively, build a native availability/booking system using calendar API.

#### 10.6 CRM-to-CRM Lead Forwarding
**What it is:** The ability to forward leads captured in iHomefinder to external CRM systems.
**What it does:** Supported forwarding targets: Chime, FiveStreet, Follow Up Boss, IXACT Contact, LionDesk, Mailchimp, RealtyJuggler, Top Producer, Wise Agent. New leads are automatically sent to the connected CRM.
**User benefit:** No direct benefit; internal tool.
**Agent/broker benefit:** Agents using specific CRM tools don't lose iHomefinder-captured leads. Flexibility to use best-in-class tools.
**Custom build approach:** Build a webhook/API connector for each supported CRM. Store CRM connection settings per agent. On lead creation, fire outbound webhook to connected CRMs.

---

### CATEGORY 11: TEAM & BROKERAGE TOOLS

#### 11.1 Smart Lead Routing
**What it is:** Automated assignment of incoming leads to specific agents on a team.
**What it does:** Routes based on: property location/zip code, price range, lead source, property type, language preference, agent specialty. If an agent doesn't accept a lead within 5 minutes, automatically re-routes to the next available agent.
**User benefit:** Buyer/seller gets connected to the most appropriate agent for their needs.
**Agent/broker benefit:** Ensures instant response to all leads. Right agent for every lead. No lead left unattended.
**Custom build approach:** Build a routing rules engine. Store rules in DB (condition: price_range, action: assign_to_agent). Round-robin option for equal distribution. Timeout re-routing logic (if not accepted in X minutes, reassign). Agent mobile push notification for new lead assignment.

#### 11.2 Team Performance Dashboard
**What it is:** A management view showing all agents' lead activity and production metrics.
**What it does:** Shows per-agent: new leads this month, contacts attempted, showings scheduled, offers made, closings, and pipeline value. Identifies top performers and those who need coaching. Team-wide totals for goal tracking.
**User benefit:** No direct benefit; management tool.
**Agent/broker benefit:** Broker visibility into team performance without micromanaging. Accountability tool. Identifies where training is needed.
**Custom build approach:** Admin-only `/admin/team-performance` dashboard. Aggregate activity metrics by agent. Chart.js graphs for trends. Sortable/filterable agent table. Date range selector.

#### 11.3 Shared Lead Visibility
**What it is:** The ability for team members with permission to see each other's leads and activity.
**What it does:** Team admin can grant visibility permissions. A showing coordinator can see all showings. A manager can see all agent pipelines. Shared notes and activity timelines across the team.
**User benefit:** No direct benefit; internal tool.
**Agent/broker benefit:** Team transparency. No duplicated outreach to the same lead from different agents.
**Custom build approach:** Role-based access control (RBAC) in Prisma. `Agent` → `Team` → `Lead` relationships. Permission levels: own leads only, team leads view, team leads edit, admin (all).

#### 11.4 Agent-Branded Nurturing (From Brokerage Site)
**What it is:** The ability for individual agent's emails/campaigns to be sent from the brokerage's IDX but branded to the specific assigned agent.
**What it does:** When a lead is assigned to an agent, all automated emails (listing alerts, drip campaigns, market reports) are sent from that agent's name/photo, not the brokerage. Maintains personal relationship even though the brokerage owns the lead.
**User benefit:** Receives personalized communications from "their" agent.
**Agent/broker benefit:** Brokerage retains lead ownership while agents get personal relationships with their leads.
**Custom build approach:** Email templates use agent-level branding variables. When sending an email for a lead, look up assigned agent and use their profile data (name, photo, email signature, brokerage logo). Agent can customize their email signature/photo.

#### 11.5 Multiple MLS Support
**What it is:** The ability for brokerages operating in multiple MLS areas to manage all MLS feeds in one account.
**What it does:** Each additional MLS connection feeds its listings into the same IDX search. A broker in a state with multiple MLS boards can show all listings across all boards in one unified search.
**User benefit:** Buyers search one site and see all relevant listings regardless of which MLS board covers the area.
**Agent/broker benefit:** No need for multiple websites or accounts. Complete market coverage.
**Custom build approach:** Data source architecture supports multiple feed connectors (`DataSource` model with MLS credentials). Each listing tagged with its source MLS. Search aggregates across all sources. Deduplication logic for listings on multiple boards.

---

### CATEGORY 12: MOBILE APP (OPTIMA LEADS)

#### 12.1 Mobile App for iOS and Android
**What it is:** A native mobile application for agents (not the website's consumer app).
**What it does:** Provides: prioritized lead list, lead activity timeline, contact details, ability to call/email/text leads, notes entry, task management, new lead notifications, CRM pipeline view.
**User benefit:** No direct consumer benefit; agent tool.
**Agent/broker benefit:** Full CRM access anywhere. Immediate response to lead notifications. Essential for agents who are always in the field.
**Custom build approach:** Build a React Native or Expo app. API-driven (connects to same Next.js API backend). Push notifications via Firebase Cloud Messaging (FCM). Key screens: Lead List, Lead Detail, Task List, Pipeline View, Quick Add Lead.

#### 12.2 Push Notifications for Agent
**What it is:** Real-time push notifications to the agent's phone for key lead events.
**What it does:** Sends push notification when: a lead registers on the site, a lead saves a search, a lead saves a listing, a lead submits a showing request, a lead submits a valuation request, a lead submits a contact inquiry, a previously inactive lead returns to the site.
**User benefit:** No direct benefit; internal tool.
**Agent/broker benefit:** Instant awareness of high-intent actions. Enables fast follow-up, which dramatically increases conversion.
**Custom build approach:** Firebase Cloud Messaging (FCM) for push delivery. Create notification subscriptions for each event type. Agent can configure which events trigger pushes in settings. Store FCM device token in `Agent` model.

#### 12.3 Quick-Add Lead (Mobile)
**What it is:** The ability to manually add a lead from the mobile app at any time.
**What it does:** Simple form: name, email, phone, source, notes. Lead is immediately created in CRM and entered into appropriate drip campaign.
**User benefit:** No direct benefit; internal tool.
**Agent/broker benefit:** Capture leads from open houses, networking events, or anywhere without a laptop. Lead immediately starts receiving automated follow-up.
**Custom build approach:** Quick-add form in mobile app with minimal required fields. POSTs to `/api/leads`. Triggers campaign assignment automation.

---

### CATEGORY 13: SELLER LEAD TOOLS

#### 13.1 Predictive Seller Lead Program (Maximizer Tier)
**What it is:** A service that identifies homeowners likely to sell in the next 6-12 months and delivers them as leads.
**What it does:** Uses third-party data (public records, property data, behavioral signals) to predict which homeowners are likely to sell. Delivers 50 such leads per month to the agent. Agent receives contact information for potential sellers before they've listed or contacted an agent.
**User benefit:** Sellers are contacted proactively by a local expert.
**Agent/broker benefit:** First-mover advantage in connecting with potential sellers. Before they list = before they interview competitors.
**Custom build approach:** This is a third-party data service. To replicate: partner with a predictive analytics provider (SmartZip, Offrs, or build using public records/property data). Alternatively, focus on attracting inbound seller leads via the valuation tool and content marketing rather than outbound predictive leads.

#### 13.2 Home Valuation Widget
**What it is:** A "What's My Home Worth?" lead capture form/widget for seller leads.
**What it does:** Widget placed on website (homepage, sidebar, dedicated landing page). Homeowner enters address, beds, baths. Step 2 asks for contact info. Results page shows recently sold comparable properties in the same zip code. Lead created in CRM tagged as seller lead.
**User benefit:** Gets a free, instant market-based home value estimate.
**Agent/broker benefit:** Captures seller leads who are researching their options. High-converting call-to-action. Leads are warm (already considering selling).
**Custom build approach:** Multi-step form component. Step 1: address inputs. Step 2: contact info (gated). Step 3: results page with sold comps grid (pulled from MLS data by zip code + beds/baths match). Create `Lead` with `type: 'seller'`, tag with `valuation_request`. Trigger seller drip campaign automatically.

#### 13.3 Seller Drip Campaign
**What it is:** A specialized drip campaign designed for seller leads (different from buyer campaigns).
**What it does:** Sequence of emails focused on: home valuation context, market stats for their neighborhood (comparable sold prices, days on market), selling process education, agent's listing services, and soft CTAs to schedule a listing consultation.
**User benefit:** Receives relevant information about selling their specific home in their specific market.
**Agent/broker benefit:** Nurtures seller leads who aren't ready immediately. Studies show most seller leads close 6-18 months after first contact.
**Custom build approach:** Pre-built "Seller Nurture" campaign template in the campaign library. Smart content inserts sold comps from the seller's neighborhood. Monthly market reports specifically for their zip code.

---

### CATEGORY 14: ANALYTICS & REPORTING

#### 14.1 Website Activity Reports
**What it is:** Reports on website traffic and user behavior within the IDX system.
**What it does:** Shows: daily/monthly new visitors, returning visitors, total property searches, listings viewed, leads registered, forms submitted. Charts for trends over time. Breakdowns by traffic source.
**User benefit:** No direct benefit; internal analytics.
**Agent/broker benefit:** Understand what's working on the site. Identify high-performing pages. Track growth.
**Custom build approach:** Store all page view and event data in an `analytics_events` table. Build reporting dashboard at `/admin/analytics`. Chart.js for visualizations. Date range filters.

#### 14.2 Lead Conversion Reporting
**What it is:** Reports tracking how many visitors become leads, and how many leads become clients.
**What it does:** Funnel report: Visitors → Registrations → Active Leads → Showings → Offers → Closed. Conversion rates at each stage. Breakdown by traffic source (which source has the best conversion rate to closed business?).
**User benefit:** No direct benefit; internal analytics.
**Agent/broker benefit:** Know your numbers. Calculate cost per lead by source. Optimize marketing spend.
**Custom build approach:** Build a conversion funnel model. Track each transition event. Calculate rates between stages. Show trend over time.

#### 14.3 Email Campaign Analytics
**What it is:** Per-campaign and per-email metrics for all email communications.
**What it does:** Shows: sent count, delivery rate, open rate, click rate, unsubscribe rate, bounce rate. Per-email-template performance. Which drip campaign has the best engagement? Which subject line works best?
**User benefit:** No direct benefit; internal analytics.
**Agent/broker benefit:** Optimize email campaigns based on data. Improve open rates with better subject lines. Remove low-performing emails from sequences.
**Custom build approach:** Resend webhooks → `EmailEvent` table. Aggregate by campaign/template. Build email analytics report dashboard.

#### 14.4 Lead Source Analysis
**What it is:** Reports showing which traffic sources generate the most (and highest quality) leads.
**What it does:** Breaks down lead count and conversion rate by source: organic search, paid ads (Facebook, Google), email campaigns, direct traffic, referral, each portal (Zillow, Realtor.com, etc.).
**User benefit:** No direct benefit; internal analytics.
**Agent/broker benefit:** ROI analysis on advertising spend. Stop investing in low-converting sources.
**Custom build approach:** Capture and store `leadSource` on every contact. Build source report aggregating counts and conversion rates by source value.

---

### CATEGORY 15: SOCIAL MEDIA INTEGRATION

#### 15.1 Facebook IDX App (Optima Social)
**What it is:** A Facebook app that adds property search and featured listings to a Facebook Business Page.
**What it does:** Adds "Search Homes" and "Featured Listings" tabs to Facebook Business Page. Facebook visitors can search MLS listings and view agent's listings without leaving Facebook. Lead forms capture registrations directly in Facebook.
**User benefit:** Can search homes on the agent's Facebook page - lower barrier than navigating to a separate website.
**Agent/broker benefit:** Leverages Facebook audience. Lead capture on social platform.
**Custom build approach:** Facebook's Canvas apps for custom Page tabs are limited (Facebook has restricted many integrations). More effective modern approach: use Facebook Lead Ads with iHomefinder's lead import, and use Facebook/Instagram for organic listing sharing.

#### 15.2 Social Media Sharing on Listings
**What it is:** Share buttons on listing detail pages allowing visitors to share listings to social media.
**What it does:** Share to Facebook, Twitter/X, and other platforms from any listing page. Shares include property photo, address, and price via Open Graph meta tags.
**User benefit:** Can share a great listing with friends/family easily.
**Agent/broker benefit:** Viral distribution of listings at no cost. Each share extends reach to the sharer's network.
**Custom build approach:** Add share buttons to listing detail pages. Use native web share API or specific platform share URLs. Ensure Open Graph meta tags (og:image, og:title, og:description) are set for each listing page so previews look great in shares.

#### 15.3 Agent Social Media Widget
**What it is:** A widget displaying links to the agent's social media profiles.
**What it does:** Shows icons/links to agent's Facebook, Twitter, LinkedIn, Instagram, YouTube profiles on the website (typically in sidebar or footer).
**User benefit:** Easy way to follow/connect with the agent on preferred platforms.
**Agent/broker benefit:** Grow social media following from website audience.
**Custom build approach:** Social media URL fields in agent profile. Render social icon links wherever the agent bio/contact info is displayed.

---

### CATEGORY 16: MISCELLANEOUS / ADDITIONAL FEATURES

#### 16.1 Ringless Voicemail Drop (Third-Party Integration)
**What it is:** The ability to send a pre-recorded voicemail message to leads without their phone ringing (via Drop Cowboy or similar service).
**What it does:** Agent records a short voicemail message. Service delivers it directly to leads' voicemail inboxes without ringing their phone. Integrated via Zapier with iHomefinder lead data.
**User benefit:** Receives a personal voicemail from their agent without an intrusive call.
**Agent/broker benefit:** Personal touch at scale. Voicemails get listened to; they feel like real personal outreach even when automated.
**Custom build approach:** Integrate Drop Cowboy API or Slybroadcast API. Add voicemail drop as a step option in campaign/automation builder. Agent records audio message. Campaign triggers voicemail drop via API call.

#### 16.2 MLS Coverage (450+ MLS Systems)
**What it is:** Pre-established data connections to 450+ MLS boards across the US and Canada.
**What it does:** Any agent in any supported market can sign up and get immediate access to their local MLS data. iHomefinder handles the MLS data agreements, licensing, and compliance.
**User benefit:** Accurate, comprehensive listing data for buyers in their market.
**Agent/broker benefit:** No need to negotiate MLS data agreements individually. Turn-key coverage.
**Custom build approach:** This requires MLS data agreements with each board. For a custom build serving a specific brokerage in specific markets: establish direct RESO API connections to the specific MLS boards served. Alternatively, use a data aggregator/middleware (Bridge Interactive, Spark API, Homesnap, ATTOM Data) to access broad MLS coverage.

#### 16.3 Data Refresh / Listing Accuracy
**What it is:** Automatic, frequent updates of MLS listing data to ensure accuracy.
**What it does:** Listing data syncs from MLS multiple times daily. New listings appear quickly after hitting the MLS. Status changes (active → pending → sold) update promptly. Price changes reflect within hours.
**User benefit:** Sees accurate, current listing data (not stale information).
**Agent/broker benefit:** Credibility and trust. Stale data loses buyer confidence.
**Custom build approach:** Build a sync worker (can run on a cron or as a persistent background process). Use RESO Web API incremental queries to fetch only changed listings since last sync. Update DB. Trigger alert processing for price changes and new listings. Target: sync every 15-30 minutes during business hours, hourly overnight.

#### 16.4 White Label Partner Program
**What it is:** A program for web developers and agencies to resell iHomefinder under their own brand.
**What it does:** Partners get white-label access with their own branding on the control panel, help center, and client-facing materials. API access for account provisioning. 25-50% discount on retail pricing. Partner portal for managing all client accounts.
**User benefit:** No direct benefit; developer/agency program.
**Agent/broker benefit:** Agents using a web developer who is an iHomefinder partner get streamlined setup and support.
**Custom build approach:** For the custom platform we're building: this is the product itself. Build a multi-tenant architecture where each brokerage/agent has their own account. Build an admin portal for managing all accounts. Consider a reseller/white-label pricing model.

---

## FEATURE COVERAGE MATRIX BY TIER

| Feature | Essentials | Accelerate | Maximizer |
|---------|-----------|-----------|----------|
| IDX Search | Yes | Yes | Yes |
| Map Search | Yes | Yes | Yes |
| Polygon Search | Yes | Yes | Yes |
| Lead Capture Forms | Yes | Yes | Yes |
| Saved Searches | Yes | Yes | Yes |
| Email Alerts (New/Price/Sold) | Yes | Yes | Yes |
| Featured Listings | Yes | Yes | Yes |
| Pocket/Supplemental Listings | Yes | Yes | Yes |
| Market Pages (MarketBoost) | Yes | Yes | Yes |
| Open House Search | Yes | Yes | Yes |
| Walk Score | Yes | Yes | Yes |
| GreatSchools | Yes | Yes | Yes |
| Mortgage Calculator | Yes | Yes | Yes |
| Lead Source Tracking | Yes | Yes | Yes |
| Hosted Website | No | Yes | Yes |
| Neighborhood Pages | No | Yes | Yes |
| Calendly Integration | No | Yes | Yes |
| VIP Tour CTAs | No | Yes | Yes |
| Full CRM | Add-on | Yes | Yes |
| Drip Campaigns | Add-on | Yes | Yes |
| SMS Text Campaigns | Add-on | Yes | Yes |
| Smart Content (AI emails) | Add-on | Yes | Yes |
| Marketing Automation | Add-on | Yes | Yes |
| Google/Apple Calendar Sync | Add-on | Yes | Yes |
| Multiple Agent Seats | No | Limited | Yes |
| Smart Lead Routing | No | Limited | Yes |
| Team Performance Dashboard | No | No | Yes |
| 50 Seller Leads/Month | No | No | Yes |
| Predictive Seller Leads | No | No | Yes |
| White-Glove Support | No | No | Yes |
| AI Facebook Posts | No | No | Yes |
| Agent Roster Pages | No | Yes | Yes |
| Express Content (Blog) | Add-on | Add-on | Add-on |

---

## TECHNICAL ARCHITECTURE IMPLICATIONS FOR CUSTOM BUILD

### Data Layer
- Primary MLS data source: RESO Web API (industry standard) or Bridge Interactive
- Database: PostgreSQL with PostGIS extension for geospatial queries
- ORM: Prisma (already in use)
- Caching: Redis for hot listing data, search results
- Search: Elasticsearch or Postgres full-text + PostGIS for fast geospatial queries

### Application Layer
- Framework: Next.js 14+ App Router (already in use)
- SSR: Server components for listing pages (SEO critical)
- Real-time: WebSocket or SSE for push notifications to agent dashboard
- Background jobs: Bull/BullMQ or Inngest for email campaigns, data sync, alert processing
- File storage: Supabase Storage or Cloudflare R2 for listing photos cache

### Email/SMS Layer
- Email: Resend (transactional) + React Email (templates)
- SMS: Twilio (dedicated numbers, MMS support)
- Push notifications: Firebase Cloud Messaging (FCM)

### Analytics
- Internal: Custom event tracking stored in PostgreSQL
- External: GA4 integration for traffic analytics

### Integrations Priority (High → Low)
1. MLS data feed (RESO API) - CRITICAL
2. Email delivery (Resend) - CRITICAL
3. Walk Score API - HIGH
4. GreatSchools API - HIGH
5. Twilio SMS - HIGH
6. Google Calendar API - MEDIUM
7. Zapier webhooks - MEDIUM
8. Facebook Graph API - LOW
9. Drop Cowboy (voicemail) - LOW

---

## BIBLIOGRAPHY / SOURCES

1. iHomefinder Platform Pricing - https://www.ihomefinder.com/platform-pricing/
2. iHomefinder Pricing - https://www.ihomefinder.com/pricing/
3. iHomefinder Features Index - https://www.ihomefinder.com/features/
4. IDX Search Features - https://www.ihomefinder.com/features/idx-search/
5. Lead Capture Features - https://www.ihomefinder.com/features/lead-capture/
6. Market Statistics/MarketBoost - https://www.ihomefinder.com/features/real-estate-market-statistics/
7. Brokerage Team CRM - https://www.ihomefinder.com/features/brokerage-team-crm/
8. MAX Feature Page - https://www.ihomefinder.com/features/max/
9. IDX for Any Website - https://www.ihomefinder.com/features/idx-for-any-website/
10. Integrations - https://www.ihomefinder.com/features/integrations/
11. Real Estate Website Content Services - https://www.ihomefinder.com/features/real-estate-website-content-services/
12. Guide to iHomefinder Account Features - https://www.ihomefinder.com/blog/agent-and-broker-resources/guide-to-ihomefinder-account-features/
13. Guide to iHomefinder IDX Widgets - https://www.ihomefinder.com/blog/product-news-and-tips/guide-to-ihomefinder-idx-widgets/
14. Optima Leads App - https://www.ihomefinder.com/blog/product-news-and-tips/optima-leads-app-for-agents/
15. "Sell My Home" Widget - https://www.ihomefinder.com/blog/product-news-and-tips/sell-my-home-widget/
16. Introduction to Marketing Automation - https://www.ihomefinder.com/blog/product-news-and-tips/introduction-to-ihomefinder-marketing-automation/
17. Email Feature Guide - https://www.ihomefinder.com/blog/product-news-and-tips/email-feature-guide/
18. Text Messaging Marketing Automation (IDXCentral) - https://help.idxcentral.com/text-messaging-marketing-automation
19. MarketBoost Automated Reports (IDXCentral) - https://help.idxcentral.com/ihomefinder-marketboost-automated-website-and-email-reports
20. Real Estate Lead Scoring Tools - https://www.ihomefinder.com/blog/agent-and-broker-resources/real-estate-lead-scoring-tools/
21. New Feature: Lead Rating - https://www.ihomefinder.com/blog/product-news-and-tips/new-feature-lead-rating-for-your-real-estate-leads/
22. Lead Source Tracking - https://www.ihomefinder.com/blog/agent-and-broker-resources/optimize-your-website-traffic-with-lead-source-tracking/
23. Featured Listings Basics - https://www.ihomefinder.com/blog/agent-and-broker-resources/featured-listings-basics/
24. Open House Lead Management - https://www.ihomefinder.com/blog/agent-and-broker-resources/making-the-most-of-open-house-leads/
25. Real Estate SEO Features Overview - https://www.ihomefinder.com/blog/agent-and-broker-resources/real-estate-seo-features-overview/
26. Zapier Integration Announcement - https://www.ihomefinder.com/blog/product-news-and-tips/announcing-zapier-integrations/
27. Calendar Sync Feature - https://www.ihomefinder.com/blog/product-news-and-tips/new-calendar-sync-and-email-marketing-features/
28. White Labeling for Developers - https://www.ihomefinder.com/blog/web-developer-resources/white-labeling-for-real-estate-website-developers/
29. iHomeFinder Review (UnifyRealEstate 2025) - https://unifyrealestate.com/idx/ihomefinder/
30. iHomefinder vs IDX Broker Comparison (RealtyCandy 2025) - https://realtycandy.com/ihomefinder-vs-idx-broker-a-comprehensive-2025-comparison/
31. iHomefinder Reviews (Capterra) - https://www.capterra.com/p/205125/iHomefinder/
32. iHomefinder Reviews (GetApp) - https://www.getapp.com/all-software/a/ihomefinder/
33. Drop Cowboy iHomefinder Integration - https://www.dropcowboy.com/integrations/ihomefinder-crm
34. Optima Express WordPress Plugin - https://wordpress.org/plugins/optima-express/
35. iHomefinder AI in Real Estate - https://www.ihomefinder.com/blog/agent-essentials-real-estate-coaching/ai-in-real-estate-for-agents/
