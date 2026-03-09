# MLS Grid Setup Instructions — Rob Speciale / MioDio LLC (Vendor)

## Step 1: Register on MLS Grid
- Go to https://app.mlsgrid.com/register
- Create a vendor account for **MioDio LLC**
- Provide your contact info (you'll be the person executing the data license)

## Step 2: Finalize Account
- Check your email for MLS Grid's account finalization link
- Complete the verification process

## Step 3: Set Up Data Subscription
- Log into your MLS Grid account
- Go to **Subscriptions**
- Set up a new data subscription:
  - Product: Homewise FL real estate platform
  - MLS: **Stellar MLS**
  - Subscription type: **IDX**
- Sign the **IDX Master Data License Agreement** on behalf of MioDio LLC

## Step 4: Add Jon as Broker Customer
- In your MLS Grid vendor portal, add Jon Feshan as a broker customer
- Enter Jon's contact info and brokerage details
- Select **Stellar MLS** as his MLS
- MLS Grid will automatically email Jon a link to sign the three-party agreement

## Step 5: Wait for Jon + Stellar Approval
- Jon must accept the data license agreement (see his instructions)
- Stellar MLS then reviews and approves the request
- You'll be notified by MLS Grid once approved

## Step 6: Generate API Token
- Log into MLS Grid
- Go to your subscription
- Click the **Token tab**
- Generate your API token/key

## Step 7: Begin Data Replication
- Base URL: `https://api.mlsgrid.com/v2/`
- Header: `Authorization: Bearer [your_token]`
- Query by Stellar's `OriginatingSystemName` (check metadata for exact value)
- Start with initial import, then switch to ongoing replication using `ModificationTimestamp`

---

## Do Now (Parallel Actions)

- [ ] Register at https://app.mlsgrid.com/register
- [ ] Fill out Stellar's Data Delivery Questionnaire: https://sprw.io/stt-kmbHU
- [ ] Send the email we drafted to datadelivery@stellarmls.com
- [ ] Request a **sample data set** from Stellar (mention "still in development" in the questionnaire so we can test our sync engine)
- [ ] Give Jon his instructions document so he knows what to expect

---

## Cost
- MLS Grid vendor account: **Free**
- IDX data feed: **Free** (covered by Jon's Stellar MLS membership)
- Back Office feed (optional, for CMA/sold data analytics): **$450/year per office** — discuss with Jon whether to add this now or later
