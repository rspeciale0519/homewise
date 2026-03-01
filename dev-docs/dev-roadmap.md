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
- [ ] Create 10 content data files with modernized copy
- [ ] Build content components (service-card, service-grid, article-layout)
- [ ] Build sellers landing page with 5 service cards
- [ ] Build 4 seller article pages (staging, sell-fast, sounds-smells, seller-advice)
- [ ] Build buyers landing page
- [ ] Build 4 buyer article pages (preparing, location, moving-tips, condo-vs-house)
- [ ] Build about page
- [ ] Verify all pages render and links work

## Phase 5: Agent Directory
- [ ] Create mock agent data (15 agents)
- [ ] Create Prisma seed script
- [ ] Run database seed
- [ ] Create agent types and filter schema
- [ ] Build agent API route with pagination
- [ ] Build agent components (card, grid, filters)
- [ ] Build agent directory page
- [ ] Build agent profile page
- [ ] Write API tests
- [ ] Verify filters, pagination, and profiles

## Phase 6: Forms, API Routes, Property Search, and Validation
- [ ] Create Zod schemas (contact, home-evaluation)
- [ ] Write schema tests (TDD)
- [ ] Build contact API route
- [ ] Build home evaluation API route
- [ ] Write API tests
- [ ] Build form components (contact-form, home-eval-form, form-success)
- [ ] Build home evaluation page
- [ ] Integrate contact form into about page
- [ ] Create property search provider interface + mock implementation
- [ ] Build property search components (filters, listing-card, listing-grid)
- [ ] Build property search API route
- [ ] Build property search page
- [ ] Verify forms, validation, persistence, and search

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
