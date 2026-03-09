# Stellar MLS Data Delivery - Research Findings

## Summary of Findings (2026-03-05)

---

## Two API Options Available

Stellar MLS offers **two** RESO-compliant Web API platforms for IDX data delivery. RETS is **not available** — they explicitly moved away from it.

### 1. MLS Grid (Primary - Already in Our Codebase)
- **Docs:** https://docs.mlsgrid.com/
- **API v2.0:** https://docs.mlsgrid.com/api-documentation/api-version-2.0
- **Registration:** https://app.mlsgrid.com/register
- **Vendor Guide PDF:** Available from Stellar's site

### 2. Bridge API (Alternative)
- **Docs:** https://bridgedataoutput.com/docs/platform/Introduction
- **Registration Guide PDF:** Available from Stellar's site
- **VRETS Bridge API Guide:** Available from Stellar's site

---

## MLS Grid Technical Details (Our Existing Integration Target)

### Authentication
- OAuth2 with long-term bearer tokens
- Token generated via MLS Grid web portal after subscription approval
- Header: `Authorization: Bearer access_token`

### API Endpoint
- Base URL: `https://api.mlsgrid.com/v2/`
- OData-based Web API

### Available Resources
| Resource | Expandable Resources | Description |
|----------|---------------------|-------------|
| Property | Media, Rooms, UnitTypes | All listings for sale or lease |
| Member | Media | Agent/member data |
| Office | Media | Office data |
| OpenHouse | - | Open house events |
| Lookup | - | Lookup/enum values |

### Rate Limits
- Max 2 requests per second
- Max 7,200 requests per hour
- Max 4 GB downloaded per hour
- Max 40,000 requests per 24-hour period
- Max 5,000 records per request (default 500)
- With $expand, max drops to 1,000 records per request

### Replication Model (NOT Real-Time)
- Data replication only — no real-time query API
- MLS Grid imports data from MLSs every ~1 minute
- Consumers replicate using `ModificationTimestamp` filtering
- Initial import: filter `MlgCanView eq true`
- Ongoing replication: filter by `ModificationTimestamp gt [last_sync_time]`
- Pagination via `@odata.nextLink` in response

### Key Signal Fields
| Field | Purpose |
|-------|---------|
| `ModificationTimestamp` | Record data changed — update local copy |
| `MlgCanView` | false = remove from local database |
| `PhotosChangeTimestamp` | Media records changed — re-download |
| `MediaModificationTimestamp` | Specific image changed — re-download |
| `MlgCanUse` | Array indicating allowed use cases: IDX, VOW, BO, PT |

### Media Handling
- **MUST download and host locally** — cannot hotlink MLS Grid media URLs
- MediaURL is for download only, NOT for display on website
- Recommend CloudFront or similar CDN for caching
- MediaKey is the unique identifier per media record

### Deleted Records
- `MlgCanView = false` → remove from local DB
- Records with `MlgCanView = false` are **removed from feed entirely after 7 days**
- No delete flag for expanded resources — replace entire subdocument

### MlgCanUse Field (Use Case Permissions)
- `IDX` — Public display on IDX websites + CRM/transaction tools
- `VOW` — Virtual Office Website (behind login, broker-consumer relationship required)
- `IDX + VOW` — Both public and VOW use
- `BO` — Back Office only (analytics, CMA, market analysis, agent-facing)
- `PT` — Participant/Broker only access

### Searchable Fields (Limited for Replication)
- `OriginatingSystemName` (REQUIRED in every query)
- `ModificationTimestamp`
- `MlgCanView`
- `StandardStatus`
- `PropertyType`
- Max 5 `or` operators per query (prefer `in` operator)

### Data Format
- RESO Data Dictionary compliant field names
- All date fields in UTC
- Dynamic fields — not all fields present on every record
- Local/non-standard fields prefixed with MLS-specific prefix
- MLS Grid-specific fields prefixed with "Mlg"
- gzip compressed responses

---

## Onboarding Process (What We Need To Do)

### Step 1: Vendor Registration
1. Go to https://app.mlsgrid.com/register
2. Create vendor account (MioDio LLC)
3. Provide contact info for person executing data license

### Step 2: Set Up Data Subscription
1. MLS Grid sends email to finalize account
2. Select "Subscriptions" to set up data subscription
3. Provide product details
4. Select Stellar MLS as the MLS
5. **Sign the IDX Master Data License Agreement**

### Step 3: Add Brokerage (Jon Feshan's Broker)
1. Enter broker customer contact info in MLS Grid portal
2. Select their MLS (Stellar MLS)
3. MLS Grid emails the broker a data license agreement link
4. **Broker must accept** the three-party agreement

### Step 4: MLS Approval
1. Stellar MLS is notified of the license request
2. Stellar MLS approves (or denies)
3. Once approved, vendor is notified to finalize

### Step 5: API Access
1. Generate API token in MLS Grid portal
2. Begin data replication

### Three-Party Agreement Required
- Between: **Broker** (Jon's broker), **Vendor** (MioDio LLC), and **Stellar MLS**
- This is non-negotiable for all data delivery options

---

## Data Delivery Product Types & Pricing

| Product | Use Case | Pricing | Requirements |
|---------|----------|---------|-------------|
| **IDX** | Public-facing property search website | **Free** (no additional cost mentioned) | Three-party agreement, working application |
| **Firm Internal Use (Back Office)** | Agent-only CRM, internal tools behind login | $450/year per office, capped at $7,500 | Behind login, not public, periodic audits |
| **VOW (Virtual Office Website)** | Client-facing behind login (mobile workforce) | $450/year per office, capped at $7,500 | Behind login, broker-consumer relationship |
| **Vendor Product** | Multi-broker SaaS product | $7,500/year per product + $2,500 per additional | Must have 1+ Stellar broker, quarterly client lists |
| **Broker Data Release** | Full firm data access | Separate agreement | Broker-only, direct agreement with Stellar |

---

## Impact on Homewise FL Project

### What Aligns Well
1. **MLS Grid is already our integration target** — the codebase already has MLS Grid sync code with OAuth2, RESO field mapping, and replication logic
2. **RESO Data Dictionary compliance** — our Prisma schema already maps RESO fields
3. **15-minute sync interval** — MLS Grid actually updates every ~1 minute, so our 15-min cadence is well within limits
4. **Rate limits are generous** — 40K requests/day and 2 RPS is more than sufficient for our replication model

### What Needs Attention

#### 1. **IDX vs. Back Office Scope**
Our platform has features that span BOTH IDX and Back Office use cases:
- **IDX-eligible features:** Property search, detail pages, favorites, saved searches, alerts, agent portfolio — these are fine for public display
- **Back Office features (may require separate license):** CMA tool, listing performance insights, market analytics with sold data — the `MlgCanUse` field determines what data can power these
- **Action:** We need to check whether our IDX license covers CMA/market stats usage, or if we need a separate Back Office subscription ($450/yr)

#### 2. **MlgCanView Handling**
- Our sync must respect `MlgCanView = false` and DELETE records from our database
- Records disappear from the feed after 7 days — we need timely replication
- **Action:** Verify our existing sync code checks `MlgCanView` on every record

#### 3. **MlgCanUse Filtering**
- We need to store and respect the `MlgCanUse` array on each listing
- Public-facing pages must ONLY show records with `IDX` in `MlgCanUse`
- CMA/analytics features may need `BO` permission
- **Action:** Add `MlgCanUse` field to our Prisma schema and filter accordingly

#### 4. **Media Must Be Self-Hosted**
- We CANNOT hotlink MLS Grid media URLs on our website
- We must download all photos and serve from our own infrastructure (S3/CDN)
- **Action:** Implement photo download pipeline and CloudFront/S3 hosting

#### 5. **OriginatingSystemName Required**
- Every API query MUST include `OriginatingSystemName` filter
- For Stellar MLS, we need to know their exact system name value
- **Action:** Get this value during onboarding (likely something like "stellar" or "mfrmls")

#### 6. **Three-Party Agreement**
- Jon can't sign alone — his **broker** must also be party to the agreement
- **Action:** Jon needs to involve his broker in the approval process

#### 7. **Working Application Requirement**
- Stellar requires ability to demonstrate a fully working application
- They offer sample data sets if still in development
- **Action:** Request sample data set during onboarding to build/test against

### Email Update
The email we drafted to `datadelivery@stellarmls.com` is still valid, but we should ALSO:
1. Fill out the online questionnaire at https://sprw.io/stt-kmbHU
2. Register as a vendor at https://app.mlsgrid.com/register
3. Both can happen in parallel with the email

---

## Recommended Next Steps (Priority Order)

1. **Fill out the Stellar MLS Data Delivery Questionnaire** — https://sprw.io/stt-kmbHU
2. **Register MioDio LLC on MLS Grid** — https://app.mlsgrid.com/register
3. **Send the email** to datadelivery@stellarmls.com (already drafted)
4. **Confirm Jon's broker** is willing to sign the three-party agreement
5. **Request sample data set** so we can test our sync engine
6. **Update codebase** to handle `MlgCanView`, `MlgCanUse`, and media self-hosting
