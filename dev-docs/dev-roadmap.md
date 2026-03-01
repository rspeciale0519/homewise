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

## Phase 7: SEO, Performance, Polish, and Launch Prep
- [ ] Generate sitemap
- [ ] Generate robots.txt
- [ ] Add JSON-LD structured data
- [ ] Add OG image generation
- [ ] Add scroll animations (Framer Motion)
- [ ] Configure URL redirects from old site
- [ ] Add favicon and app icons
- [ ] Performance optimization pass
- [ ] Final verification (type-check, lint, test, build, visual)
