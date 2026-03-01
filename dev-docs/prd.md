# Product Requirements Document — Homewise FL

## Business Context

Home Wise Realty Group, Inc. is a central Florida real estate brokerage with 186+ agents serving Orange, Seminole, Osceola, Volusia, and Lake counties. Their current website (www.homewisefl.com) uses an outdated template-era design that does not reflect the quality of their services.

This project rebuilds the website as a modern, high-performance Next.js application targeting Compass/Redfin-level design quality while preserving all existing functionality.

## Target Users

1. **Home Buyers** — Searching for properties in central Florida, researching the buying process
2. **Home Sellers** — Looking to list their property, wanting home evaluations, seeking selling advice
3. **Prospective Agents** — Reviewing the brokerage's agent roster and company info
4. **Existing Agents** — Directing clients to their profile page

## Functional Requirements

### Agent Directory
- Filterable directory of all agents (186+)
- Filter by language spoken, last name initial (A-Z bar)
- Paginated results (20 per page)
- Individual agent profile pages with photo, bio, contact info, languages, designations

### Property Search
- Search interface with filters: location, price range, beds, baths, sqft, property type
- Mock data initially; provider abstraction layer for future IDX/MLS integration
- Listing cards with image, price, address, specs

### Seller Resources
- Landing page linking to 4 article subpages
- Articles: Home Staging Tips, Sell Your Home Fast, Sounds & Smells, Seller Advice
- Home Evaluation request form (multi-section with property details)

### Buyer Resources
- Landing page linking to 4 article subpages
- Articles: Preparing to Buy, Choosing a Location, Moving Tips, Condo vs House

### Forms
- Contact form (name, email, phone, message) — persisted to database
- Home Evaluation form (contact + address + property details + selling info) — persisted to database
- Client-side validation with Zod, server-side validation, loading/success states

### About Page
- Company overview, mission, service areas, buyer/seller service descriptions
- Embedded contact form

### Homepage
- Hero section with search widget
- Promotional cards (Home Updates, Home Buying, Home Selling)
- Featured listings carousel
- Company description with stats

## Non-Functional Requirements

- **Performance:** Lighthouse 90+ on all 4 categories
- **Responsive:** Mobile-first, tested at 375/768/1024/1440px breakpoints
- **SEO:** Sitemap, robots.txt, JSON-LD structured data, OG images, proper meta tags
- **Accessibility:** Semantic HTML, proper heading hierarchy, ARIA labels, keyboard navigation
- **Security:** Zod validation at all API boundaries, security headers, no exposed credentials
- **Maintainability:** TypeScript strict mode, 450 LOC max per source file, Server Components by default

## Success Metrics

- All existing site functionality preserved in modern form
- Build succeeds with zero TypeScript/lint errors
- All tests pass
- Old URL redirects return 301 to new paths
- Sub-3-second page loads on 3G
- Ready for real data swap when client provides agent roster and IDX credentials
