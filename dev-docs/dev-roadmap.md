# Development Roadmap — Homewise FL

## Phase 0: Project Documentation
- [x] Create PRD (dev-docs/prd.md)
- [x] Create Development Roadmap (this file)
- [x] Create README.md

## Phase 1: Project Scaffold and Core Configuration
- [x] Initialize Next.js 15 with TypeScript, Tailwind, ESLint
- [x] Initialize git repository on develop branch
- [x] Configure TypeScript strict mode
- [x] Install production and dev dependencies
- [x] Create Prisma schema (Agent, ContactSubmission, HomeEvaluation)
- [x] Create lib files (prisma singleton, cn utility, constants)
- [x] Create environment files
- [x] Configure Tailwind with brand colors and fonts
- [x] Add npm scripts (type-check, test, db:push, db:seed)
- [x] Verify build passes

## Phase 2: Layout System, Navigation, and UI Primitives
- [x] Configure Cormorant Garamond + DM Sans fonts (exact logo colors #2E276D navy, #DB2526 crimson)
- [x] Build root layout with global metadata
- [x] Create navigation data structure
- [x] Build sticky header with glass-morphism and dropdowns
- [x] Build mobile navigation drawer
- [x] Build footer with 4-column grid
- [x] Build UI primitives (button, card, input, select, textarea, badge, pagination, skeleton, container)
- [x] Build shared components (social-links, section-heading, cta-banner)
- [x] Create marketing route group layout
- [x] Create not-found and loading pages
- [x] Verify build passes

## Phase 3: Homepage
- [x] Build hero section with cinematic vignette overlay and staggered CSS animations
- [x] Build search widget with frosted glass design (location, price, beds, baths)
- [x] Build promotional cards (3-card grid with hover lift + accent bar)
- [x] Create mock listings data (12 Florida properties)
- [x] Build featured listings carousel (Embla, auto-advance, dot pagination)
- [x] Build company description section with stats grid
- [x] Assemble homepage with CtaBanner
- [x] Verify build passes

## Phase 4: Content Pages (Sellers, Buyers, Articles)
- [x] Create 10 content data files with modernized copy
- [x] Build content components (service-card, service-grid, article-layout)
- [x] Build sellers landing page with 5 service cards
- [x] Build 4 seller article pages (staging, sell-fast, sounds-smells, seller-advice)
- [x] Build buyers landing page
- [x] Build 4 buyer article pages (preparing, location, moving-tips, condo-vs-house)
- [x] Build about page
- [x] Build home evaluation placeholder page
- [x] Verify all pages render and links work

## Phase 5: Agent Directory
- [x] Create mock agent data (15 agents)
- [x] Create Prisma seed script
- [x] Create agent types and filter schema (Zod validation)
- [x] Build agent API route with pagination
- [x] Build agent components (card, grid, filters with A-Z bar)
- [x] Build agent directory page with search, language, and letter filters
- [x] Build agent profile page with editorial layout
- [x] Write API tests (20 tests passing)
- [x] Verify filters, pagination, profiles, type-check, and build

## Phase 6: Forms, API Routes, Property Search, and Validation
- [x] Create Zod schemas (contact, home-evaluation, property-filter)
- [x] Write schema tests (TDD — 9 contact + 11 home-eval = 20 tests)
- [x] Build contact API route
- [x] Build home evaluation API route
- [x] Write API tests
- [x] Build form components (contact-form, home-eval-form, form-success)
- [x] Build home evaluation page with real multi-step form
- [x] Integrate contact form into about page
- [x] Create property search provider interface + mock implementation
- [x] Build property search components (search-filters, listing-card, listing-grid)
- [x] Build property search API route
- [x] Build property search page with hero, filters, grid, pagination
- [x] Verify forms, validation, persistence, and search (40 tests passing, build clean)

## Phase 6.5: Missing Pages from Original Site
- [x] Build Home Inspection buyer article (/buyers/home-inspection)
- [x] Build Buyer Request lead-gen form (/buyers/request) with Zod + Prisma
- [x] Build Property Updates/Alerts sign-up (/property-updates) with Zod + Prisma
- [x] Build Property Detail page (/properties/[id]) with stats, overview, mortgage estimate
- [x] Build Community index page (/communities) with 8 Central Florida cities
- [x] Build Community detail pages (/communities/[slug]) with stats, highlights, sidebar CTAs
- [x] Add Prisma models (BuyerRequest, PropertyAlert)
- [x] Add API routes (buyer-request, property-alerts)
- [x] Update navigation with Home Inspection and Communities links
- [x] Update buyers-resources data with Home Inspection card
- [x] Verify type-check, 40 tests passing, build clean (50 routes)

## Phase 6.75: MLS Foundation (Property Data Infrastructure)
- [x] Add Listing, WalkScoreCache, SchoolCache, SyncState Prisma models
- [x] Extend Property interface and PropertyFilters with 25+ optional fields
- [x] Create provider factory pattern (mock/stellar via PROPERTY_PROVIDER env var)
- [x] Create StellarMlsProvider reading from Prisma Listing table
- [x] Create seed script with 12 Central FL listings
- [x] Create Inngest MLS Grid sync infrastructure (15-min cron, OAuth2, RESO upsert)
- [x] Add Mapbox GL map-based search with clusters, bounds, and polygon draw
- [x] Add advanced filters (year built, lot size, HOA, amenities, open houses, school district)
- [x] Add sort selector and sold status badges with close price
- [x] Integrate Walk Score API with 30-day DB cache
- [x] Integrate GreatSchools API with 7-day DB cache
- [x] Add photo gallery, open house widget, and detail page sub-components
- [x] Add featured listings from Prisma on homepage
- [x] Add agent MLS listings widget and paginated agent listings page
- [x] Add IDX/Stellar MLS compliance disclaimer
- [x] Add admin MLS sync dashboard with manual trigger
- [x] Verify type-check and build pass (84 routes)

## Phase 7: SEO, Performance, Polish, and Launch Prep
- [x] Generate sitemap
- [x] Generate robots.txt
- [x] Add JSON-LD structured data
- [x] Add OG image generation
- [x] Add scroll animations (Framer Motion)
- [x] Configure URL redirects from old site
- [x] Add favicon and app icons
- [x] Performance optimization pass
- [x] Final verification (type-check, lint, test, build, visual)

## Phase 8: Platform Completion — Security & Auth Hardening
- [x] Add requireAdminApi() to 14 unprotected admin API routes
- [x] Create requireAuthApi() helper for non-admin authenticated routes
- [x] Add auth to 10 AI API routes (mortgage-advisor stays public)
- [x] Add auth to /api/chat for dashboard and agent configs
- [x] Add Zod input validation to all 11 AI API routes
- [x] Add Resend webhook signature verification (svix)
- [x] Wire up behavioral automation dispatch via Inngest

## Phase 9: Platform Completion — ESLint Migration & Code Quality
- [x] Create eslint.config.mjs flat config (ESLint 9)
- [x] Archive .eslintrc.json
- [x] Fix all lint errors
- [x] Update .env.example with all required environment variables

## Phase 10: Completion Pass — Remaining Feature Gaps

### Gap 1: Trend Charts (feature/trend-charts)
- [x] Install recharts
- [x] Create MarketTrendChart component (dual-axis area chart, brand colors, delta indicators)
- [x] Replace 6-month trends table in market-stats-view.tsx with MarketTrendChart
- [x] Create TeamPerformanceChart component (bar chart, metric toggle)
- [x] Add TeamPerformanceChart to team-performance-view.tsx

### Gap 2: CMA PDF Export (feature/cma-pdf-export)
- [ ] Install @react-pdf/renderer
- [ ] Create CmaReportDocument PDF component
- [ ] Create POST /api/ai/cma/pdf route
- [ ] Create /admin/cma page with CMA tool UI

### Gap 3: AI Model Tiering (feature/ai-model-tiering)
- [ ] Add AiFeatureConfig Prisma model
- [ ] Seed 14 feature config rows
- [ ] Add openAiComplete(), getModelForFeature(), aiCompleteForFeature() to AI service layer
- [ ] Update 11 AI API routes to use aiCompleteForFeature()
- [ ] Update ChatbotEngine to resolve model per feature key
- [ ] Create Model Config tab on /admin/ai-usage
