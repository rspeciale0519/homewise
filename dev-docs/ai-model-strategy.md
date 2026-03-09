# Homewise FL — AI Model Strategy & Cost Analysis

> **Last updated:** March 2026
> **Status:** Recommended (not yet implemented — currently all features use Claude Sonnet 4)

---

## Executive Summary

The platform has 11 AI-powered API endpoints, 3 chatbot variants, and 4 background AI jobs. All generation features currently run on a single model (`claude-sonnet-4-20250514` at $3/$15 per M tokens). Embeddings use OpenAI `text-embedding-3-small`.

This document recommends a **three-tier model strategy** that reduces costs by ~56% while maintaining quality where it matters most (customer-facing chatbots). The strategy uses Claude Sonnet 4.6 for chatbot tool use, GPT-5 Mini for mid-tier features, and GPT-5 Nano for simple analytical outputs.

---

## Current Architecture

### Providers

| Provider | SDK | Used For |
|---|---|---|
| Anthropic | `@anthropic-ai/sdk` | All 11 generation features + 3 chatbots |
| OpenAI | `openai` | Embeddings only (`text-embedding-3-small`) |

### Key Files

| File | Purpose |
|---|---|
| `src/lib/ai/index.ts` | `aiComplete()` and `aiStream()` — core Anthropic completion functions |
| `src/lib/ai/embeddings.ts` | OpenAI embedding generation + cosine similarity search |
| `src/lib/ai-pricing.ts` | Per-model pricing constants for cost tracking |
| `src/lib/chatbot/public-site.ts` | Public chatbot with `search_listings` + `get_listing_details` tools |
| `src/lib/chatbot/agent-website.ts` | Agent chatbot with `get_agent_listings` + `qualify_lead` + `schedule_contact` tools |
| `src/lib/chatbot/dashboard.ts` | Dashboard chatbot with `get_lead_stats` + `get_tasks` + `search_contacts` + `find_training` + `get_pipeline_summary` tools |
| `src/app/api/ai/*/route.ts` | Individual AI feature endpoints |
| `src/app/api/admin/ai-usage/route.ts` | Usage analytics and cost estimation |

### Current Model & Pricing

All generation features use `claude-sonnet-4-20250514`:
- Input: $3.00 / 1M tokens
- Output: $15.00 / 1M tokens
- No prompt caching enabled
- No model tiering

---

## Complete Feature Inventory

### Chatbot Systems (3 variants)

All use Claude tool_use for structured function calling with multi-turn conversations.

| Chatbot | Location | Tools | Max Tokens | Temperature |
|---|---|---|---|---|
| Public Site | `src/lib/chatbot/public-site.ts` | `search_listings`, `get_listing_details` | 2048 | 0.7 |
| Agent Website | `src/lib/chatbot/agent-website.ts` | `get_agent_listings`, `qualify_lead`, `schedule_contact` | 2048 | 0.7 |
| Dashboard | `src/lib/chatbot/dashboard.ts` | `get_lead_stats`, `get_tasks`, `search_contacts`, `find_training`, `get_pipeline_summary` | 2048 | 0.7 |

### AI API Endpoints (11 features)

| Feature | Route | Input Tokens (avg) | Output Tokens (avg) | Max Tokens | Temp |
|---|---|---|---|---|---|
| Listing Description | `ai/listing-description` | 1,200 | 1,500 | 2000 | 0.8 |
| Campaign Generator | `ai/campaign-generator` | 750 | 2,000 | 3000 | 0.7 |
| Market Insights | `ai/market-insights` | 300 | 200 | 300 | 0.6 |
| CMA Report | `ai/cma` | 1,200 | 1,200 | 2000 | 0.4 |
| Social Post Generator | `ai/social-post` | 400 | 1,000 | 1500 | 0.8 |
| Lead Scoring | `ai/lead-scoring` | 600 | 200 | 300 | 0.3 |
| Home Valuation | `ai/home-valuation` | 900 | 1,200 | 1500 | 0.7 |
| Follow-up Draft | `ai/follow-up-draft` | 600 | 350 | 500 | 0.7 |
| Listing Insights | `ai/listing-insights` | 550 | 350 | 500 | 0.4 |
| Mortgage Advisor | `ai/mortgage-advisor` | 600 | 1,500 | 2000 | 0.5 |
| Meeting Prep | `ai/meeting-prep` | 1,000 | 1,200 | 1500 | 0.5 |

### Background Jobs (Inngest)

| Job | Schedule | AI Model | Notes |
|---|---|---|---|
| SEO Content Generator | Monthly (1st at 3am UTC) | Claude Sonnet | ~24 neighborhood guides/month |
| Listing Embeddings (batch) | Every 6 hours | text-embedding-3-small | Up to 100 listings per run |
| Listing Embeddings (event) | On `mls/listing.synced` | text-embedding-3-small | Single listing per event |
| Smart Listing Alerts | Daily at 9am UTC | text-embedding-3-small | Semantic search for balanced/discovery modes |
| Lead Scoring Cron | Daily at 2am UTC | None (rule-based) | No AI — pure scoring algorithm |
| Drip Campaign Processing | Every 10 minutes | None (template-based) | No AI — token substitution |

---

## Recommended Three-Tier Model Strategy

### Tier 1 — Claude Sonnet 4.6 ($3.00 / $15.00 per M tokens)

**Use for:** Customer-facing chatbots requiring tool_use (function calling).

Claude has the most reliable tool_use implementation for multi-step function calling patterns (search → get details → respond). These are the most visible, brand-critical features.

| Feature | Rationale |
|---|---|
| Public Site Chatbot | Customer-facing, natural conversation, multi-tool orchestration |
| Agent Website Chatbot | Personalized agent tone, lead qualification, scheduling |

### Tier 2 — GPT-5 Mini ($0.25 / $2.00 per M tokens)

**Use for:** Content generation, structured analysis, internal chatbot. Quality is strong for guided/templated outputs at 93% less cost than Sonnet on input and 87% less on output.

| Feature | Rationale |
|---|---|
| Dashboard Chatbot | Internal-facing, simpler tool use, data queries |
| CMA Reports | Structured JSON output with narrative sections |
| Campaign Generator | Template-guided creative writing |
| SEO Content Generator | Long-form but data-driven content |
| Listing Descriptions | Creative but structured (3 variations) |
| Meeting Prep | Data summarization, JSON output |
| Home Valuations | Templated narrative with comp data |
| Mortgage Advisor | Structured financial scenarios |
| Social Posts | Short-form, formulaic content |
| Follow-up Drafts | Short email/SMS, templated style |

### Tier 3 — GPT-5 Nano ($0.05 / $0.40 per M tokens)

**Use for:** Short analytical outputs, JSON responses, data-to-text summaries. These features have low temperature settings and produce brief, structured outputs.

| Feature | Rationale |
|---|---|
| Market Insights | 2-3 sentence summary from database stats |
| Lead Scoring | JSON: score (0-100) + 2-sentence brief |
| Listing Insights | JSON: performance summary + suggestions array |

### Embeddings — text-embedding-3-small ($0.02 per M tokens)

**No change.** Already the optimal model — 5x cheaper than ada-002 with better quality.

| Feature | Usage |
|---|---|
| Listing embeddings (batch + event-driven) | 1,536 dimensions, stored in Prisma `Listing.embedding` |
| Smart alerts semantic search | Cosine similarity for balanced/discovery mode |
| Chatbot property search | Fallback semantic search in public chatbot |

---

## Monthly Cost Estimates

### By Usage Scale

| Scale | Active Agents | Total AI Calls/mo | Monthly Cost | Per-Agent Cost |
|---|---|---|---|---|
| Low | 5 | ~3,000 | ~$11 | ~$2.20 |
| Medium | 20 | ~8,500 | ~$35 | ~$1.75 |
| High | 50 | ~24,000 | ~$95 | ~$1.90 |
| Scale | 100 | ~53,000 | ~$248 | ~$2.48 |

### Medium Scenario Breakdown (20 agents)

| Tier | Model | Input Tokens/mo | Output Tokens/mo | Cost |
|---|---|---|---|---|
| Tier 1 | Claude Sonnet 4.6 | 2,800K | 1,400K | $29.40 |
| Tier 2 | GPT-5 Mini | 2,380K | 2,250K | $5.10 |
| Tier 3 | GPT-5 Nano | 875K | 475K | $0.23 |
| Embeddings | text-embedding-3-small | 10,000K | — | $0.20 |
| **Total** | | **6,055K** | **4,125K** | **~$34.93** |

### Scale Scenario Breakdown (100 agents)

| Tier | Model | Input Tokens/mo | Output Tokens/mo | Cost |
|---|---|---|---|---|
| Tier 1 | Claude Sonnet 4.6 | 21,000K | 10,500K | $220.50 |
| Tier 2 | GPT-5 Mini | 12,000K | 11,000K | $25.00 |
| Tier 3 | GPT-5 Nano | 4,500K | 2,400K | $1.19 |
| Embeddings | text-embedding-3-small | 50,000K | — | $1.00 |
| **Total** | | **37,500K** | **23,900K** | **~$247.69** |

### Comparison vs. Current (All Claude Sonnet)

| Scale | Current (all Sonnet) | Recommended (3-tier) | Savings |
|---|---|---|---|
| Medium (20 agents) | ~$80 | ~$35 | 56% |
| Scale (100 agents) | ~$500 | ~$248 | 50% |

---

## Cost Optimization Levers

### 1. Prompt Caching (Anthropic)

Anthropic offers 90% off cached input reads. Chatbot system prompts + tool definitions (~1,500-2,000 tokens) are identical across every call.

- Cache write: 1.25x base input ($3.75/M)
- Cache read: 0.1x base input ($0.30/M) — 90% discount
- Break-even: 2 reads per 5-minute cache window

At the Scale scenario, caching could save ~30% on Tier 1 costs (~$65/month).

### 2. Batch API (50% off)

Non-real-time features can use async batch processing:
- SEO Content Generator (monthly cron)
- Lead Scoring (daily cron)
- Embedding generation (6-hour cron)

### 3. Future: Replace Sonnet with GPT-5.1 for Chatbots

GPT-5.1 ($1.25/$10.00) could replace Claude Sonnet for chatbots, cutting Tier 1 costs by ~55%. Requires:
- Rewriting streaming/tool-use logic for OpenAI format
- A/B testing conversation quality with real users
- Validating function calling reliability

This is a potential Phase 2 optimization once the platform has production traffic to compare against.

---

## Model Pricing Reference (March 2026)

### Models Used in This Strategy

| Model | Provider | Input $/1M | Cached $/1M | Output $/1M | Context |
|---|---|---|---|---|---|
| Claude Sonnet 4.6 | Anthropic | $3.00 | $0.30 | $15.00 | 200K (1M beta) |
| GPT-5 Mini | OpenAI | $0.25 | $0.025 | $2.00 | 400K |
| GPT-5 Nano | OpenAI | $0.05 | $0.005 | $0.40 | 128K |
| text-embedding-3-small | OpenAI | $0.02 | — | — | 8K |

### Other Models Considered

| Model | Input $/1M | Output $/1M | Why Not Selected |
|---|---|---|---|
| GPT-5.4 | $2.50 | $15.00 | Same output cost as Sonnet; no tool_use advantage |
| GPT-5.2 | $1.75 | $14.00 | Expensive for non-chatbot; cheaper options sufficient |
| GPT-5.1 | $1.25 | $10.00 | Future candidate for chatbot replacement (Phase 2) |
| Claude 3.5 Haiku | $0.80 | $4.00 | GPT-5 Mini is 3x cheaper with comparable quality |
| Claude Haiku 4.5 | $1.00 | $5.00 | More expensive than 3.5 Haiku with marginal improvement |
| GPT-4.1-nano | $0.10 | $0.40 | GPT-5 Nano is half the input cost, likely better quality |
| Gemini 2.0 Flash | $0.10 | $0.40 | Adds third provider SDK; no advantage over GPT-5 Nano |
| Groq (Llama 3.1 8B) | $0.05 | $0.08 | Quality gap for real estate domain; reliability concerns |
| Mistral Large 3 | $0.50 | $1.50 | Would require third SDK; GPT-5 Mini fills same niche |

---

## Implementation Requirements

### Code Changes

1. **Add OpenAI chat completion function** to `src/lib/ai/index.ts` — a new `openAiComplete()` function alongside the existing `aiComplete()`. The OpenAI SDK package is already installed for embeddings.

2. **Per-feature model config** — a mapping that assigns each feature to its tier/model. Each AI route already accepts a `model` parameter.

3. **Update `src/lib/ai-pricing.ts`** — add GPT-5 Mini and GPT-5 Nano pricing for accurate cost tracking in the admin AI usage dashboard.

4. **Enable prompt caching** — add `cache_control` blocks to chatbot system prompts in `src/lib/chatbot/*.ts`.

### No Changes Needed

- Usage logging (`AiUsageLog`) already tracks model, tokens, and latency per call
- Admin AI usage dashboard already calculates costs from the pricing config
- Rate limiting works per-instance regardless of model
- Embedding pipeline stays on OpenAI as-is

---

## Usage Assumptions

All estimates assume the following per-feature monthly call volumes at the **Medium** scale (20 active agents):

| Feature | Calls/mo | Basis |
|---|---|---|
| Public Site Chatbot | 2,500 | ~4 conversations/agent/day |
| Agent Website Chatbot | 1,000 | ~2 conversations/agent/day |
| Dashboard Chatbot | 1,500 | ~4 queries/agent/day |
| Listing Descriptions | 100 | ~5/agent/month |
| Campaign Generator | 50 | ~2-3/agent/month |
| Market Insights | 1,000 | Auto-loaded on city pages |
| CMA Reports | 200 | ~10/agent/month |
| Social Posts | 300 | ~15/agent/month |
| Lead Scoring | 500 | ~25 contacts scored/agent/month |
| Home Valuations | 100 | ~5/agent/month |
| Follow-up Drafts | 400 | ~20/agent/month |
| Listing Insights | 500 | Auto-loaded on listing detail views |
| Mortgage Advisor | 200 | ~10/agent/month |
| Meeting Prep | 200 | ~10/agent/month |
| SEO Content (cron) | 24 | 6 cities × 4 neighborhoods, monthly |
| Embeddings (cron) | ~500 | New/updated listings per month |
| Smart Alerts (cron) | ~200 | Daily for all saved searches with alerts |
