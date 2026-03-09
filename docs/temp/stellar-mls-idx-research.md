# Stellar MLS IDX Access Research Report
## Comprehensive Guide for Licensed Florida Real Estate Brokers

**Research Date:** March 2026
**Scope:** IDX access to Stellar MLS for licensed Florida brokers — membership, API options, costs, compliance, and technical integration

---

## EXECUTIVE SUMMARY

- Stellar MLS (formerly My Florida Regional MLS / MFRMLS) is the largest MLS in Florida and the 3rd largest in the United States, serving 18+ counties including all major Central Florida counties (Orange, Seminole, Osceola, Lake, Volusia, Hillsborough, etc.) plus Puerto Rico.
- A licensed Florida broker must join Stellar MLS through one of its shareholder REALTOR associations — there is no direct-join path. The primary central Florida gateway is the **Orlando Regional REALTOR Association (ORRA)**.
- As of 2025, Stellar MLS has **discontinued legacy RETS** in favor of two modern API options: **MLS Grid** (RESO Web API) and **Bridge Interactive API** (RESO Web API). Both are RESO Data Dictionary compliant.
- IDX data access is available either through a **third-party IDX vendor** (IDX Broker, Showcase IDX, iHomefinder) or through **direct API access** via MLS Grid or Bridge Interactive — the latter requires a three-party data license agreement.
- Total annual cost for MLS membership + IDX tools typically ranges from **$700–$1,500/year** for a single-broker office (MLS subscription + IDX provider subscription), excluding one-time setup fees.
- Full IDX setup from joining an association to live data on a website typically takes **4–8 weeks**.

---

## 1. WHAT IS STELLAR MLS?

### Background and History

My Florida Regional MLS (MFRMLS), founded in 1993, officially rebranded to **Stellar MLS** in June 2019. It is:
- The **#1 largest MLS in Florida**
- The **#3 largest MLS in the United States**
- Operated as a cooperative owned by its member REALTOR associations

### Geographic Coverage

Stellar MLS covers **18 counties in Florida** plus Puerto Rico. The core Central Florida counties include:

| County | Covered |
|--------|---------|
| Orange County | Yes |
| Seminole County | Yes |
| Osceola County | Yes |
| Lake County | Yes |
| Volusia County | Yes |
| Polk County | Yes |
| Hillsborough County | Yes |
| Pinellas County | Yes |
| Pasco County | Yes |
| Manatee County | Yes |
| Sarasota County | Yes |
| Charlotte County | Yes |
| Sumter County | Yes |

Additionally, in 2024, Stellar MLS had residential sales recorded in **65 of Florida's 67 counties**, indicating broad listing reach beyond its core territory.

### Scale

- Hundreds of thousands of active listings
- Members across Central and Southwest Florida plus Puerto Rico
- More than 30 tools and products included with membership

---

## 2. MEMBERSHIP STRUCTURE

### Shareholder Associations (Who Runs Stellar MLS)

Stellar MLS is owned by its shareholder REALTOR associations. The 14 current shareholders include:

| Association | Region |
|-------------|--------|
| Orlando Regional REALTOR Association (ORRA) | Orange, Seminole, Osceola |
| Osceola County Association of REALTORS (OSCAR) | Osceola |
| West Volusia Association of REALTORS | Volusia |
| REALTORS Association of Lake & Sumter Counties (RALSC) | Lake, Sumter |
| Greater Tampa REALTORS | Hillsborough |
| Pinellas REALTOR Organization (now Suncoast Tampa Association) | Pinellas |
| West Pasco Board of REALTORS | Pasco |
| REALTOR Association of Sarasota & Manatee (RASM) | Sarasota, Manatee |
| Lakeland REALTORS | Polk |
| East Polk County Association of REALTORS | Polk |
| Bartow Board of REALTORS | Polk |
| Englewood Area Board of REALTORS | Charlotte |
| Punta Gorda-Port Charlotte-North Port Association | Charlotte |
| Venice Area Board of REALTORS | Sarasota |

**Customer (non-voting) associations** include: Lake Wales Association of REALTORS, Puerto Rico Association of REALTORS, and Okeechobee County Board of REALTORS.

### Key Point for Central Florida Brokers

For brokers in the **Orange/Seminole/Osceola/Lake/Volusia** area, the primary gateway is **ORRA (Orlando Regional REALTOR Association)** at [orlandorealtors.org](https://www.orlandorealtors.org).

---

## 3. HOW A BROKER JOINS STELLAR MLS

### Step-by-Step Process

**Step 1: Choose your local REALTOR association**
- Brokers in central Florida: Join **ORRA** → [orlandorealtors.org/realtors](https://www.orlandorealtors.org/realtors)
- Brokers in Lake/Sumter counties: Join **RALSC** → [ralsc.org](https://ralsc.org)
- Brokers in Osceola: Join **OSCAR** → [osceolarealtors.org](https://www.osceolarealtors.org)
- Brokers in Sarasota/Manatee: Join **RASM** → [myrasm.com](https://www.myrasm.com)

**Note: "MLS-Only" Broker Memberships exist.** Brokers who do NOT want full REALTOR membership can apply for an **MLS-Only** designation. RASM offers this explicitly: [myrasm.com/mls-only-broker-or-agent](https://www.myrasm.com/mls-only-broker-or-agent/). This is cheaper — you pay for MLS access but not full REALTOR dues.

**Step 2: Submit your application**
- ORRA's At-Large Broker/Salesperson Application: [orlandorealtors.org/clientuploads/PDFs/Applications/AtLarge_Broker_Form_2025_Updated.pdf](https://www.orlandorealtors.org/clientuploads/PDFs/Applications/AtLarge_Broker_Form_2025_Updated.pdf)
- RASM's MLS-Only Application: [myrasm.com/clientuploads/PDFs/Applications/MLS_Only_Residential_Broker_or_Agent_05.2025.pdf](https://www.myrasm.com/clientuploads/PDFs/Applications/MLS_Only_Residential_Broker_or_Agent_05.2025.pdf)
- The association processes the MLS application and enrolls you in Stellar MLS

**Step 3: Pay fees**
- One-time New Member Setup Fee: **$150** (Stellar MLS)
- One-time New Office Setup Fee: **$150** (Stellar MLS)
- Annual MLS subscription (billed by Stellar, May-May billing cycle)
- Local association dues (billed by your association)

**Step 4: Complete mandatory education**
New members must complete three required classes within 60 days (all classes are free and offered online):
1. **Starting with Stellar** (orientation)
2. **MLS Basic** (core MLS usage)
3. **MLS Compliance 101** (rules and regulations)

Classes are free through ORRA: [orlandorealtors.org/mlsclasses](https://www.orlandorealtors.org/mlsclasses)

**Step 5: Activate IDX**
Once your MLS account is active, you can apply for IDX access through your chosen vendor or directly through Stellar's data delivery portal.

### Broker Resources Hub
- [stellarmls.com/join/brokers](https://www.stellarmls.com/join/brokers)
- [stellarmls.com/join](https://www.stellarmls.com/join)
- [stellarmls.com/join/associations](https://www.stellarmls.com/join/associations)

---

## 4. IDX ACCESS REQUIREMENTS

### What IDX Is

IDX (Internet Data Exchange), also called Broker Reciprocity, is the cooperative program where Stellar MLS participants grant permission to display each other's listings on their websites. All Stellar MLS member participants are automatically enrolled in the IDX program (they must opt-out if they do not want their listings shared).

### Eligibility

- Must hold an active Florida real estate **broker's license**
- Must be an active Stellar MLS **participant** (member)
- Must agree to Stellar MLS IDX Rules and Regulations (Article 19)
- Must use an **approved IDX vendor** or go through the direct data license agreement process

### IDX Application Process (Vendor Route — Easiest)

1. Join an association and become a Stellar MLS member
2. Sign up with an approved IDX vendor (IDX Broker, Showcase IDX, iHomefinder, etc.)
3. Your vendor submits an IDX license request to your local board on your behalf
4. Your local board approves the IDX licensing request
5. The vendor sets up your data feed — typically live in **2–3 weeks** after board approval

### IDX Application Process (Direct API Route — Developers)

1. Join an association and become a Stellar MLS member
2. Choose MLS Grid or Bridge Interactive
3. Complete the Stellar MLS Data Delivery Questionnaire: [stellarmls.com/data-delivery](https://www.stellarmls.com/data-delivery)
4. Execute a three-party data license agreement (Broker + Developer/Vendor + Stellar MLS)
5. Register with MLS Grid or Bridge Interactive for API credentials
6. Stellar MLS can provide a **sample data set** if still in development

---

## 5. API AND DATA FEED TECHNOLOGY OPTIONS

### Overview: No More RETS

Stellar MLS deprecated legacy RETS (Real Estate Transaction Standard) support. As of 2025, all new integrations use **RESO Web API** (REST-based, OData v4 query syntax, JSON responses, OAuth 2.0 authentication).

There are two official API pathways:

---

### Option A: MLS Grid

**What it is:** MLS Grid is a joint venture backed by multiple large MLSs that provides a single, standardized RESO Web API feed. Stellar MLS is a partner MLS.

**Key features:**
- RESO Data Dictionary compliant
- Pull data to store on your own servers (full replication) OR make live API calls
- Supports real-time and batch retrieval
- Used for building fully custom IDX websites
- Good for brokers working with custom developers

**How to get access:**
1. Broker must be an active Stellar MLS member
2. Your developer/vendor registers on MLS Grid: [mlsgrid.com](https://www.mlsgrid.com)
3. Execute the three-party data license agreement
4. Full technical documentation: [docs.mlsgrid.com](https://docs.mlsgrid.com)

**Stellar MLS's MLS Grid setup guide (PDF):**
[stellarmls.com/content/uploads/2019/05/Stellar_MLS-MLSGrid_Access-Data-Guide_Broker-new.pdf](https://www.stellarmls.com/content/uploads/2019/05/Stellar_MLS-MLSGrid_Access-Data-Guide_Broker-new.pdf)

---

### Option B: Bridge Interactive (Bridge API)

**What it is:** Bridge Interactive (a CoStar Group company, formerly related to CoreLogic) provides a RESO Web API data feed from Stellar MLS directly to developers.

**Key features:**
- RESO Data Dictionary compliant
- **No fee charged by Bridge Interactive** — fees are between broker and Stellar MLS
- RESTful API with comprehensive documentation
- Good for custom development projects

**How to get access:**
1. Be an active Stellar MLS member
2. Register on Bridge Data Output: [bridgedataoutput.com/register](https://bridgedataoutput.com/register)
3. From the Data Access section, request API access for Stellar MLS
4. Also register your account in MLS Grid for the agreement layer
5. Contact Stellar MLS Data Services: **datadelivery@stellarmls.com**

**Bridge Interactive developer info:** [bridgeinteractive.com/developers/bridge-api](https://www.bridgeinteractive.com/developers/bridge-api/)

---

### Trestle by CoreLogic

Trestle (by CoreLogic) is a separate RESO Web API platform. Based on search results, **Stellar MLS does not appear to use Trestle** — they use MLS Grid and Bridge Interactive instead. If you need Trestle, that would be for other MLSs (e.g., ABOR, ACTRIS in Texas). Brokers seeking Trestle access for other MLSs can visit: [trestle.corelogic.com/SubscriptionWizard](https://trestle.corelogic.com/SubscriptionWizard/)

---

### Technical Specifications

| Specification | Detail |
|--------------|--------|
| Protocol | RESO Web API (REST over HTTP) |
| Query Syntax | OData v4 |
| Response Format | JSON |
| Authentication | OAuth 2.0 |
| Transport Security | TLS (HTTPS) |
| Data Update Frequency | Continuously updated throughout the day |
| Replication Model | Pull-based (polling) with nextLink pagination |
| Upcoming Features (2025-2026) | Add/Edit via API, Webhooks/EntityEvents for push notifications |

**Rate Limits:** Rate limits are set by the MLS at the API endpoint level. If you exceed them, use the `nextLink` URL in the JSON header to paginate. Page size limits are also affected by:
- Number of fields selected in the query
- Time of day (based on Eastern timezone)
- Use of `$expand` reduces page size to 1/4 of normal

---

## 6. THIRD-PARTY IDX PROVIDERS

For brokers who do not want to build custom solutions, these approved third-party vendors connect directly to Stellar MLS:

### IDX Broker
- **Stellar MLS approved vendor:** Yes (SMLS-WebAPI)
- **Pricing:** Lite plan from ~$55/month; Platinum from ~$90/month
- **Setup timeline:** 2–3 weeks after board approval
- **Info:** [idxbroker.com/mls/stellar-mls-smls-webapi](https://www.idxbroker.com/mls/stellar-mls-smls-webapi)

### Showcase IDX
- **Stellar MLS supported:** Yes
- **Pricing:** Essentials plan at ~$84.95/month
- **Strengths:** Modern UI, SEO-focused, WordPress integration
- **Info:** [showcaseidx.com/mls-coverage/stellar-mls-stellar](https://showcaseidx.com/mls-coverage/stellar-mls-stellar/)

### iHomefinder
- **Stellar MLS supported:** Yes (licensed vendor, serves FL and Puerto Rico)
- **Pricing:** From ~$39.99–$150/month depending on plan
- **Strengths:** WordPress plugin, CRM features, strong MLS coverage
- **Info:** [ihomefinder.com/resources/idx-coverage/stellar-mls-idx-website-solutions](https://www.ihomefinder.com/resources/idx-coverage/stellar-mls-idx-website-solutions/)

### SimplyRETS
- **Stellar MLS supported:** Yes (via RESO Web API connection)
- **Pricing:** One-time $99 connection fee + monthly subscription (developer-focused)
- **Strengths:** Developer-friendly API wrapper, JSON responses, great for custom builds
- **Info:** [simplyrets.com](https://simplyrets.com)

### DaknoIDX
- **Stellar MLS supported:** Yes (My Florida Regional MLS / Stellar)
- **Strengths:** Custom website builds integrated with Stellar MLS data
- **Info:** [dakno.com/idx-mfr](https://www.dakno.com/idx-mfr)

### BuyingBuddy
- **Stellar MLS supported:** Yes
- **Strengths:** IDX plugin with CRM and lead capture
- **Info:** [buyingbuddy.com/mls/idx/stellar-mls](https://buyingbuddy.com/mls/idx/stellar-mls)

### MLSImport (WordPress)
- **Stellar MLS supported:** Yes (RESO Web API)
- **Strengths:** Direct import into WordPress, good for custom themes
- **Info:** [mlsimport.com/stellar-mls](https://mlsimport.com/stellar-mls/)

---

## 7. COSTS SUMMARY

### One-Time Fees (Stellar MLS)

| Fee | Amount |
|-----|--------|
| New Member Setup Fee | $150 |
| New Office Setup Fee | $150 |
| New Company Processing Fee | $300 |
| Total One-Time (New Broker) | ~$450–$600 |

### Annual Ongoing Fees

| Fee | Amount | Notes |
|-----|--------|-------|
| Stellar MLS Annual Subscription | ~$300–$500/year per broker | Billed May-May; exact amount updated annually |
| Local Association Dues (ORRA, RASM, etc.) | $200–$700/year | Varies by association; MLS-only is cheaper than full REALTOR |
| IDX Provider (third-party vendor) | $480–$1,080/year | $40–$90/month depending on vendor |
| IDX Provider (MLS Grid / Bridge — direct) | $0 from Stellar/API provider | No API access fee; cost is broker's own development |
| Credit Card Processing Fee (2025) | +3% | Effective May 2025 for CC payments to Stellar MLS |

**Realistic annual total for a solo broker (ORRA + IDX Broker):**
- Stellar MLS subscription: ~$400/year
- ORRA dues (REALTOR membership): ~$685/year
- IDX Broker Lite: ~$660/year
- **Total: ~$1,745/year**

**MLS-Only broker path (lower cost):**
- If you join as MLS-Only (available through RASM, etc.), you skip full REALTOR dues
- MLS-only fee is lower but you lose REALTOR association benefits
- Contact the association directly for the exact MLS-only rate

**Note:** Stellar MLS announced fee adjustments beginning May 2025. Check the billing resources page for current rates: [stellarmls.com/resources/billing-resources](https://www.stellarmls.com/resources/billing-resources)

---

## 8. TIMELINE: FROM ZERO TO LIVE IDX

| Phase | Estimated Time |
|-------|---------------|
| Choose association and submit application | 1–3 days |
| Association processes application and activates MLS account | 3–7 business days |
| Complete mandatory education (3 online classes) | 1–2 days (self-paced) |
| Sign up with IDX vendor / submit IDX licensing request | 1–2 days |
| Board approves IDX licensing | 1–5 business days |
| Vendor activates data feed and configures your site | 7–14 business days |
| **Total: Start to Live IDX** | **3–6 weeks typical** |

For **direct API access (MLS Grid or Bridge Interactive)**:
- Add time for three-party agreement review and execution: +1–3 weeks
- Add development time: variable
- **Total: 4–8 weeks or more**

Reciprocal listing applications (for out-of-area brokers wanting to list on Stellar) are processed within 48 business hours once submitted.

---

## 9. IDX COMPLIANCE REQUIREMENTS (ARTICLE 19)

Stellar MLS Article 19 governs all IDX display rules. Full rules are at:
- [rules.stellarmls.com/hc/en-us/sections/14692095841559-Article-19-Stellar-MLS-IDX-Rules-and-Regulations](https://rules.stellarmls.com/hc/en-us/sections/14692095841559-Article-19-Stellar-MLS-IDX-Rules-and-Regulations)

### Key Display Requirements

**Broker/Listing Identification**
- The IDX display must identify the **listing firm** and contact info (email or phone) provided by the listing participant
- Must be in a "reasonably prominent location" in "readily visible color and typeface" not smaller than median size used in the listing display
- Your own brokerage name and contact must also be clearly displayed

**Data Freshness**
- IDX data must be refreshed **at least every 12 hours** (industry standard; Stellar updates continuously)
- Sold/withdrawn listings must be removed within a defined timeframe

**Listing Selection**
- You may filter what listings appear on your site based on objective criteria (geography, price, property type, listing type)
- You CANNOT selectively suppress listings based on the identity of the listing broker (anti-discrimination rule)

**Compensation Display**
- You CANNOT use IDX data to display a platform of offers of compensation from multiple brokers to buyer brokers (post-NAR settlement rule)
- You MAY display your OWN brokerage's compensation on listings you represent in an IDX feed with broker approval

**Market Time**
- You ARE allowed to display market time (days on market) for IDX listings

**Public Marketing Timing Rule**
- If a listing is marketed publicly (website, email blast, etc.), it MUST be entered into Stellar MLS within **1 business day** of public marketing beginning
- Failure results in a Level III automatic penalty of **$500 for the first offense**

**Opt-Out**
- Listings are automatically opted into IDX. Sellers may request opt-out. Participants can manage this on a listing-by-listing basis.

### Full Rules Documents
- [rules.stellarmls.com](https://rules.stellarmls.com/hc/en-us) (full online rules index)
- [Stellar MLS Rules and Regulations PDF (April 2025)](https://irp.cdn-website.com/3d0f9886/files/uploaded/Stellar_MLS_Rules_and_Regulations_as_of_04-25-2025.pdf)
- [Stellar MLS Rules and Regulations PDF (September 2025)](https://irp.cdn-website.com/3d0f9886/files/uploaded/9-16-2025-Rules_and_Regulations.pdf)
- [MLS Compliance 101 Handout (PDF)](https://docs.stellarmls.com/Compliance101_Handout.pdf)

---

## 10. QUICK REFERENCE: KEY URLs AND CONTACTS

| Resource | URL |
|----------|-----|
| Stellar MLS Main Site | [stellarmls.com](https://www.stellarmls.com) |
| Join Stellar MLS (Broker) | [stellarmls.com/join/brokers](https://www.stellarmls.com/join/brokers) |
| Associations List | [stellarmls.com/join/associations](https://www.stellarmls.com/join/associations) |
| API Options Page | [stellarmls.com/api-options](https://www.stellarmls.com/api-options) |
| Data Delivery Solutions | [stellarmls.com/data-delivery](https://www.stellarmls.com/data-delivery) |
| Data Delivery Resources (PDFs) | [stellarmls.com/documents/data-delivery](https://www.stellarmls.com/documents/data-delivery) |
| Billing Resources | [stellarmls.com/resources/billing-resources](https://www.stellarmls.com/resources/billing-resources) |
| Broker Resources | [stellarmls.com/resources/broker-resources](https://www.stellarmls.com/resources/broker-resources) |
| IDX Rules (Article 19) | [rules.stellarmls.com](https://rules.stellarmls.com/hc/en-us) |
| MLS Grid Developer Docs | [docs.mlsgrid.com](https://docs.mlsgrid.com) |
| Bridge Interactive Registration | [bridgedataoutput.com/register](https://bridgedataoutput.com/register) |
| ORRA (Orlando) | [orlandorealtors.org](https://www.orlandorealtors.org) |
| ORRA At-Large Broker Application | [orlandorealtors.org/clientuploads/PDFs/Applications/AtLarge_Broker_Form_2025_Updated.pdf](https://www.orlandorealtors.org/clientuploads/PDFs/Applications/AtLarge_Broker_Form_2025_Updated.pdf) |
| OSCAR (Osceola) | [osceolarealtors.org](https://www.osceolarealtors.org) |
| RALSC (Lake/Sumter) | [ralsc.org](https://ralsc.org) |
| RASM (Sarasota/Manatee — MLS-Only) | [myrasm.com/mls-only-broker-or-agent](https://www.myrasm.com/mls-only-broker-or-agent/) |
| Data Delivery Email | datadelivery@stellarmls.com |

---

## 11. RECOMMENDED PATH FOR A CENTRAL FLORIDA BROKER (ORANGE/SEMINOLE/OSCEOLA)

1. **Join ORRA** as an At-Large Broker (if not located in a specific shareholder county) OR join the association for your county (OSCAR for Osceola, RALSC for Lake)
2. **Complete the three mandatory online classes** (free, self-paced)
3. **Choose your IDX approach:**
   - **Fastest/easiest:** Sign up with IDX Broker or Showcase IDX — they handle the MLS board approval and data feed setup for you
   - **Custom development:** Contact datadelivery@stellarmls.com, complete the questionnaire, execute the three-party MLS Grid agreement, and have your developer integrate with [docs.mlsgrid.com](https://docs.mlsgrid.com)
4. **Budget approximately $1,500–$2,500 for year one** (setup fees + annual MLS sub + association dues + IDX vendor)
5. **Plan for 4–6 weeks** from application submission to having live IDX data on your site

---

## SOURCES

- [Stellar MLS — Broker Join Page](https://www.stellarmls.com/join/brokers)
- [Stellar MLS — MLS Membership](https://www.stellarmls.com/join)
- [Stellar MLS — API Options](https://www.stellarmls.com/api-options)
- [Stellar MLS — Data Delivery Solutions](https://www.stellarmls.com/data-delivery)
- [Stellar MLS — Data Delivery Resources (PDFs)](https://www.stellarmls.com/documents/data-delivery)
- [Stellar MLS — Billing Resources & FAQ](https://www.stellarmls.com/resources/billing-resources)
- [Stellar MLS — Broker Resources](https://www.stellarmls.com/resources/broker-resources)
- [Stellar MLS — Shareholders List](https://www.stellarmls.com/about/shareholders)
- [Stellar MLS — Associations List](https://www.stellarmls.com/join/associations)
- [Stellar MLS — Article 19 IDX Rules](https://rules.stellarmls.com/hc/en-us/sections/14692095841559-Article-19-Stellar-MLS-IDX-Rules-and-Regulations)
- [Stellar MLS — Article 19.09: Criteria for IDX Display](https://rules.stellarmls.com/hc/en-us/articles/14692948973335-Article-19-09-Criteria-for-IDX-Display)
- [Stellar MLS — Rules & Regulations Full PDF (April 2025)](https://irp.cdn-website.com/3d0f9886/files/uploaded/Stellar_MLS_Rules_and_Regulations_as_of_04-25-2025.pdf)
- [Stellar MLS — Rules & Regulations Full PDF (September 2025)](https://irp.cdn-website.com/3d0f9886/files/uploaded/9-16-2025-Rules_and_Regulations.pdf)
- [ORRA — At-Large Broker Application](https://www.orlandorealtors.org/clientuploads/PDFs/Applications/AtLarge_Broker_Form_2025_Updated.pdf)
- [ORRA — Dues and Fees 2025-2026](https://www.orlandorealtors.org/clientuploads/Membership/2025-_2026_Update_ORRA_Dues_and_Fees.pdf)
- [RASM — MLS Only Broker or Agent](https://www.myrasm.com/mls-only-broker-or-agent/)
- [RASM — MLS Only Application PDF (May 2025)](https://www.myrasm.com/clientuploads/PDFs/Applications/MLS_Only_Residential_Broker_or_Agent_05.2025.pdf)
- [Osceola County Association of REALTORS — Stellar MLS](https://www.osceolarealtors.org/stellar-mls/)
- [MLS Grid Documentation](https://docs.mlsgrid.com)
- [MLS Grid Main Site](https://www.mlsgrid.com)
- [Bridge Interactive — Developer API](https://www.bridgeinteractive.com/developers/bridge-api/)
- [IDX Broker — Stellar MLS Approved Vendor](https://www.idxbroker.com/mls/stellar-mls-smls-webapi)
- [Showcase IDX — Stellar MLS Coverage](https://showcaseidx.com/mls-coverage/stellar-mls-stellar/)
- [iHomefinder — Stellar MLS IDX Solutions](https://www.ihomefinder.com/resources/idx-coverage/stellar-mls-idx-website-solutions/)
- [SimplyRETS — Developer API](https://simplyrets.com/idx-developer-api)
- [Realtyna — Stellar MLS Coverage](https://realtyna.com/mls-coverage/mls/stellar-mls/)
- [Realtyna Blog — RESO API Improvements for Stellar MLS](https://realtyna.com/blog/4-improvements-stellar-mls-mfrmls-agents-can-see-today-by-switching-to-reso-api/)
- [GlobeNewswire — MFRMLS Becomes Stellar MLS (2019)](https://www.globenewswire.com/en/news-release/2019/06/04/1864098/0/en/My-Florida-Regional-MLS-Becomes-Stellar-MLS.html)
- [Stellar MLS — MLS Grid Transition from RETS PDF](https://www.stellarmls.com/content/uploads/2019/05/Stellar_MLS-MLS_Grid-TransitioningFromRETStoWebAPI.pdf)
- [Stellar MLS — MLS Grid Broker Access Guide PDF](https://www.stellarmls.com/content/uploads/2019/05/Stellar_MLS-MLSGrid_Access-Data-Guide_Broker-new.pdf)
- [MLSImport — Stellar MLS](https://mlsimport.com/stellar-mls/)
- [BuyingBuddy — Stellar MLS IDX](https://buyingbuddy.com/mls/idx/stellar-mls)
- [RALSC — Dues & Fees](https://ralsc.org/membership/realtors/dues-fees/)
- [2025 Stellar MLS Annual Billing Packet](https://irp.cdn-website.com/3d0f9886/files/uploaded/FINAL_LSC_Packet_2025_Stellar_MLS_Annual_Billing_(2).pdf)
- [MLS Compliance 101 Handout (PDF)](https://docs.stellarmls.com/Compliance101_Handout.pdf)
