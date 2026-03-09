**Subject:** IDX/API Data Access Request - Licensed Agent Website (MLS ID: 261012786)

---

Dear Stellar MLS Data Services Team,

My name is Rob Speciale with MioDio LLC. I'm a developer building a custom real estate website for my client, Jon Feshan (Stellar MLS ID: 261012786), a licensed agent in the Florida market. I'm writing on his behalf to request IDX data access through your API/data delivery services.

**About the Website**

We're building a modern, RESO-compliant real estate platform for Jon that will display Stellar MLS listing data to consumers under the IDX program. The site will serve as his primary client-facing tool for property search, market analysis, and client engagement.

**Data Access Requirements**

To power the platform's features, I'm requesting access to the following:

1. **Active, Pending, and Sold Listing Data** - Full property records including address, price, status, beds/baths/sqft, lot size, year built, property type/subtype, photos, descriptions/remarks, and all standard RESO fields.

2. **Listing Agent & Office Information** - Agent name, MLS ID, phone, email, office name, and office MLS ID for proper IDX attribution and compliance with Article 19.09.

3. **Open House Schedules** - Date, time, and details for open house events tied to listings.

4. **School District & School Assignment Data** - If available through the feed (school district, elementary/middle/high school names).

5. **Geographic/Location Data** - Latitude/longitude coordinates for map-based property search.

6. **Historical/Closed Sale Data** - Sold listings with close price, close date, original list price, and days on market for comparative market analysis (CMA) and market statistics.

7. **Photo/Media URLs** - Property photos and virtual tour URLs.

**How the Data Will Be Used**

The platform includes the following consumer-facing and agent tools, all of which depend on MLS data:

- **Property Search** - Consumers search listings by location, price, beds/baths, property type, and map area (including polygon/boundary search). Results display in list and map views.
- **Property Detail Pages** - Full listing details with photos, descriptions, amenities, open house info, and agent attribution.
- **Market Statistics** - Aggregated stats per city/area (median price, avg DOM, months of inventory, sale-to-list ratio, new listings count).
- **Comparative Market Analysis (CMA)** - Automated comparable property analysis using sold and active listings in the same area.
- **Saved Searches & Alerts** - Consumers save search criteria and receive notifications when new matching listings appear.
- **Favorites & Recently Viewed** - Consumers track properties they're interested in.
- **Agent Portfolio** - Display of Jon's active, pending, and sold listings filtered by his MLS ID.

**Technical Details**

- The site is built on Next.js (React) with a PostgreSQL database.
- We plan to sync listing data on a 15-minute interval to stay within IDX compliance requirements.
- We are prepared to implement all required IDX disclaimers, attribution, and data freshness rules per Stellar MLS policies.
- Our system supports RESO Web API (OData v4) and can also work with RETS if needed.
- We are already familiar with the MLS Grid platform if that is your current delivery method.

**What I'm Requesting**

1. Access credentials (API key, OAuth2 client credentials, or RETS login) for Stellar MLS listing data
2. Developer documentation (API endpoints, data dictionary, field mappings, rate limits)
3. Any IDX license agreement or data sharing agreement that needs to be signed
4. Guidance on compliance requirements specific to Stellar MLS (disclaimers, attribution rules, data retention policies)
5. Information on what data scopes are available (e.g., full IDX feed vs. agent-only feed, geographic coverage)

I'm ready to begin integration as soon as access is granted. Please let me know what steps are needed to get started, and feel free to reach out to me or Jon with any questions.

Thank you for your time.

Best regards,
Rob Speciale
MioDio LLC
[Phone Number]
[Email Address]

On behalf of:
Jon Feshan
Stellar MLS ID: 261012786
[Jon's Phone Number]
[Jon's Email Address]
