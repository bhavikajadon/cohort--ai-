# cohortai — AI-Native Mini CRM
### Built for the Xeno Engineering Take-Home | Tommy Hilfiger India

> **An AI-native customer engagement platform that helps a fashion brand decide *who to talk to*, *what to say*, and *tracks every message* as it moves through the real world — in real time.**

---

## 10-Second Summary

cohortai is a two-service, event-driven mini CRM built specifically for Tommy Hilfiger India's marketing team. A marketer describes their target audience in plain English → AI translates it into a precise shopper segment with strategic reasoning → personalizes each message per customer → dispatches via a channel-simulating service → and tracks every delivery, open, click, and purchase in a live waterfall dashboard.

**What makes it different from a CRUD CRM with an AI chatbox bolted on:** the AI is embedded at every decision point — not just message drafting, but audience intelligence, churn risk scoring, channel recommendation, and revenue impact estimation. The channel service accurately models the async, callback-driven lifecycle of real messaging infrastructure.

---

## Live Demo

| Service | URL |
|---------|-----|
| 🖥️ Frontend | [cohortai.vercel.app](https://your-frontend-url) |
| 🔧 CRM API | [crm.railway.app/health](https://your-crm-url/health) |
| 📡 Channel Service | [channel.railway.app/health](https://your-channel-url/health) |

📹 **Walkthrough Video:** [Loom link here]

---

## Quickstart (Local)

**Prerequisites:** Node.js 18+, npm, an Anthropic API key

```bash
# 1. Clone
git clone https://github.com/yourusername/cohortai
cd cohortai

# 2. Install all dependencies
cd crm-service && npm install && cd ..
cd channel-service && npm install && cd ..
cd frontend && npm install && cd ..

# 3. Configure environment
cp crm-service/.env.example crm-service/.env
# Edit crm-service/.env → add your ANTHROPIC_API_KEY
# CHANNEL_SERVICE_URL=http://localhost:3001
# CRM_CALLBACK_URL=http://localhost:3000

# 4. Seed the database (Tommy Hilfiger India shoppers)
cd crm-service && npm run seed && cd ..

# 5. Start all three services (3 terminal windows)
cd crm-service && npm run dev      # → http://localhost:3000
cd channel-service && npm run dev  # → http://localhost:3001
cd frontend && npm run dev         # → http://localhost:5173
```

That's it. Open `http://localhost:5173` and you're live.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React + TypeScript)            │
│   Dashboard | Segment Builder | Campaign Manager | Live Tracker  │
└─────────────────────┬───────────────────────────────────────────┘
                      │ REST API calls
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CRM SERVICE (Node.js + TypeScript)            │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  /customers  │  │  /segments   │  │     /campaigns       │  │
│  │  list, stats │  │  AI builder  │  │ create, send, track  │  │
│  └──────────────┘  └──────┬───────┘  └──────────┬───────────┘  │
│                            │                      │              │
│                     ┌──────▼───────┐    ┌────────▼──────────┐  │
│                     │  Claude API  │    │  /receipts        │  │
│                     │  NL→SQL      │    │  callback ingress │  │
│                     │  Reasoning   │    └────────┬──────────┘  │
│                     │  Msg Compose │             │              │
│                     └──────────────┘    ┌────────▼──────────┐  │
│                                         │  SQLite (WAL)     │  │
│                                         │  customers        │  │
│                                         │  orders           │  │
│                                         │  segments         │  │
│                                         │  campaigns        │  │
│                                         │  communications   │  │
│                                         └───────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │ POST /api/send (per recipient)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  CHANNEL SERVICE (Node.js + TypeScript)          │
│                                                                  │
│  Receives send request → ACKs immediately → simulates async     │
│  delivery lifecycle → fires callbacks back to CRM               │
│                                                                  │
│  Queued → Sent → [Delivered | Failed] → Opened → Clicked        │
│                                               → Converted       │
│                                                                  │
│  Per-channel profiles: WhatsApp (94% delivery, 72% open)       │
│  SMS (89%, 45%) · Email (96%, 28%) · RCS (78%, 55%)            │
│  Retry logic: 3 attempts with exponential backoff               │
└─────────────────────────────────────────────────────────────────┘
```

### Key Architecture Decisions

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Database | SQLite (WAL mode) | Fast for single-writer workloads; WAL enables concurrent reads. At scale → Postgres + connection pooling |
| Channel service | Separate process | Models real-world architecture: CRM and channel providers are independent services. Enables independent scaling and failure isolation |
| AI batching | Max 20 customers per Claude call | Cost and latency control. At scale → async queue + per-customer fine-tuned templates |
| Callback retry | 3x exponential backoff | Mirrors how real webhook consumers handle transient failures. At scale → dead letter queue (SQS/Redis) |
| SQL injection guard | Regex blocklist + parameterization | AI-generated SQL is inherently risky. Blocklist catches obvious injections; prod would use a query-builder layer |

---

## AI-Native Workflow (How I Actually Built This)

This isn't just a product with AI features — my development workflow was AI-native:

1. **Claude for architecture design:** I used Claude to stress-test the two-service callback loop design before writing a line of code — specifically asking it to poke holes in my failure-handling approach.

2. **Claude for data modeling:** The seed data (50 realistic Indian fashion shoppers with purchase histories, tier distributions, and behavioral profiles) was generated with Claude, then reviewed and refined by me.

3. **Copilot/Claude for boilerplate:** Repetitive TypeScript (Express route shapes, type definitions, SQL queries) was AI-assisted, with me reviewing every line for correctness and reviewing the generated SQL for injection risks.

4. **Me for all product decisions:** Every product choice — the Tommy Hilfiger brand narrative, the "Wow factors" to build, what to cut, what to hardcode — was mine. AI accelerated execution; I owned direction.

---

## Product KPIs I Would Track in Production

| KPI | Measurement | Target |
|-----|-------------|--------|
| **Time-to-First-Campaign** | Minutes from signup to first campaign sent | < 5 min (friction proxy) |
| **Segment Acceptance Rate** | % of AI-built segments saved vs discarded | > 70% (AI quality proxy) |
| **Campaign Delivery Rate** | Messages delivered / messages sent | > 90% per channel |
| **Revenue Attribution** | GMV from converted communications | Primary business metric |
| **AI API Error Rate** | Failed Claude calls / total calls | < 2% |

---

## Design Philosophy

I made three explicit trade-offs based on what I identified as the core evaluation:

**1. Depth over breadth.** Rather than building 8 shallow features, I went deep on two: the AI segment builder with reasoning card, and the live callback waterfall. Both directly map to Xeno's actual product differentiation.

**2. The channel service as a first-class citizen.** I could have mocked delivery with a simple `setTimeout`. Instead I built a separate Express service with per-channel delivery profiles, exponential backoff retries, and a proper state machine for communication lifecycle. This shows I understand how real messaging infrastructure works.

**3. Tommy Hilfiger as narrative, not decoration.** Using a brand Xeno actually works with (Aditya Birla Group, which owns TH India) makes every product decision feel grounded. The seed data uses real Indian cities, realistic INR spend levels, and relevant fashion categories — not placeholder "User 1, User 2" data.

---

## What I'd Do With 1 More Week

**Technical debt I knowingly took on:**

- **Auth:** No authentication. Production needs JWT + role-based access (Brand Admin, Campaign Manager, Analyst).
- **Queue:** Campaign sends fire via `setImmediate` with `axios.post` per recipient. At 10,000+ recipients this would saturate the event loop. Production: BullMQ + Redis for job queuing, rate limiting, and retry visibility.
- **Database:** SQLite hits its limits with concurrent writes. Production: Postgres on Railway with connection pooling via `pg-pool`.
- **AI cost control:** Currently no caching of segment AI results. Same NL query hit twice → two API calls. Production: semantic cache with Redis + embedding similarity check.
- **Testing:** Zero unit tests. Would add Vitest for service layer, Supertest for API routes, Playwright for E2E.
- **Observability:** Would add structured logging (Pino), error tracking (Sentry), and a `/metrics` endpoint for Prometheus.

**Feature roadmap:**

- Multi-channel campaign sequencing (WhatsApp day 1 → Email day 3 if not opened)
- Cohort analytics — how does segment behavior change over time post-campaign?
- AI campaign scheduling — "when's the best time to reach this audience?"
- A/B message testing with statistical significance detection

---

## Data Model

```sql
customers    → id, name, email, phone, city, tier, total_spent, order_count, 
               last_purchase_date, preferred_category, age_group

orders       → id, customer_id, amount, items(JSON), category, channel, order_date

segments     → id, name, filter_query(SQL), natural_language_query, 
               customer_count, ai_reasoning(JSON)

campaigns    → id, name, segment_id, channel, message_template, status,
               sent_count, delivered_count, opened_count, clicked_count,
               converted_count, failed_count

communications → id, campaign_id, customer_id, channel, personalized_message,
                 status, sent_at, delivered_at, opened_at, clicked_at, 
                 converted_at, failed_reason
```

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite + TailwindCSS + React Query |
| CRM Backend | Node.js + TypeScript + Express + better-sqlite3 |
| Channel Service | Node.js + TypeScript + Express |
| AI | Anthropic Claude (claude-sonnet-4-6) via `@anthropic-ai/sdk` |
| Deployment | Railway (both backend services) + Vercel (frontend) |

---

*Built with 🤝 AI-assistance and 🧠 product thinking by Bhavika Jadon for the  Xeno SDE Challenge, June 2026*
