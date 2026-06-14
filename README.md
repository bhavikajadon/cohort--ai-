<div align="center">

# Cohort AI
### AI-Native Mini CRM — Built for the Xeno FDE Challenge

**Tommy Hilfiger India · Fashion & Apparel**

[Live Demo](https://cohort-ai-seven.vercel.app/) · [API Health](https://cohort-ai-crm.onrender.com) · [Walkthrough Video](#)

---

*A marketer types what they want in plain English. AI finds the audience, writes every message, sends it, and tracks every delivery — live.*

</div>

---

## What Is This

Cohort AI is a two-service, event-driven CRM built for a D2C fashion brand. It solves the gap between "we have customer data" and "we ran a smart campaign that moved revenue."

Most CRMs make you build segments by clicking filters, write messages manually, and check stats in a report 24 hours later. Cohort AI inverts all three:

- **Segments** — describe your audience in plain English, AI builds the SQL filter and explains *why* this audience matters right now
- **Messages** — AI writes a personalized message for every individual shopper, not a template
- **Tracking** — watch every message move through `Sent → Delivered → Opened → Clicked → Converted` in a live waterfall as it happens

The "AI" here is not a chatbot bolted on. It is embedded at every decision point in the product.

---

## Live URLs

| Service | URL |
|---------|-----|
| Frontend | https://cohort-ai-seven.vercel.app/ |
| CRM API | https://cohort-ai-crm.onrender.com|
| Channel Service | https://cohort-ai-channel.onrender.com |

📹 **Walkthrough Video:** [Loom link — add after recording]

---

## Quickstart (Local)

**Prerequisites:** Node.js 18+, npm, a free Gemini API key from [aistudio.google.com](https://aistudio.google.com)

```bash
# Clone
git clone https://github.com/bhavikajadon/cohort-ai.git
cd cohort-ai

# Install dependencies
cd crm-service     && npm install && cd ..
cd channel-service && npm install && cd ..
cd frontend        && npm install && cd ..

# Configure CRM environment
cp crm-service/.env.example crm-service/.env
# Edit crm-service/.env — add your GEMINI_API_KEY
# Set CHANNEL_SERVICE_URL=http://localhost:3001
# Set CRM_CALLBACK_URL=http://localhost:3000

# Seed the database
cd crm-service && npm run seed && cd ..

# Start all three services (three terminals)
cd crm-service     && npm run dev   # → http://localhost:3000
cd channel-service && npm run dev   # → http://localhost:3001
cd frontend        && npm run dev   # → http://localhost:5173
```

Open `http://localhost:5173` — you're live.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│              FRONTEND  (React + TypeScript + Vite)        │
│   Dashboard · Segment Builder · Campaigns · Live Tracker  │
└─────────────────────┬────────────────────────────────────┘
                      │ REST
                      ▼
┌──────────────────────────────────────────────────────────┐
│              CRM SERVICE  (Node.js + TypeScript)          │
│                                                           │
│  /customers   /segments        /campaigns   /receipts     │
│  list, stats  AI builder       create,send  callback      │
│               NL → SQL         track        ingress       │
│               reasoning card                              │
│                    │                 │                    │
│             Gemini API          sql.js DB                 │
│          (segment + messages)   (SQLite WASM)             │
└────────────────────────────┬─────────────────────────────┘
                             │ POST /api/send
                             ▼
┌──────────────────────────────────────────────────────────┐
│           CHANNEL SERVICE  (Node.js + TypeScript)         │
│                                                           │
│  Receives send request → ACKs immediately                 │
│  → simulates async delivery lifecycle                     │
│  → fires callbacks back to CRM receipt API               │
│                                                           │
│  queued → sent → delivered → opened → clicked → converted │
│                           ↘ failed (with retry)           │
│                                                           │
│  Per-channel delivery profiles (industry benchmarks):     │
│  WhatsApp 94% · SMS 89% · Email 96% · RCS 78%            │
│  Retry: 3 attempts with exponential backoff               │
└──────────────────────────────────────────────────────────┘
```

### Why Two Services

Real messaging infrastructure works exactly this way — your CRM and your channel provider (Twilio, Gupshup, etc.) are independent services that communicate via webhooks. The channel service here simulates that contract faithfully: it accepts a send request, acknowledges immediately, and fires delivery events back asynchronously. This is not a shortcut. It is the architecture.

### Key Decisions and Tradeoffs

| Decision | Choice | Why | Production alternative |
|----------|--------|-----|------------------------|
| Database | sql.js (SQLite WASM) | Zero native dependencies, deploys anywhere | Postgres + connection pool |
| AI | Gemini 1.5 Flash | Free tier, 1500 req/day, no credit card | Fine-tuned model on brand data |
| Campaign dispatch | setImmediate + axios per recipient | Simple, works for demo scale | BullMQ + Redis job queue |
| Callback retry | 3x exponential backoff | Mirrors real webhook reliability patterns | Dead letter queue (SQS) |
| Auth | None | Out of scope for this assignment | JWT + role-based access |
| SQL injection guard | Regex blocklist + parameterization | AI-generated SQL is inherently risky | Query builder layer (Knex) |

---

## AI-Native Development Workflow

This is not just a product with AI features — the development process itself was AI-native:

**Architecture design** — used AI to stress-test the two-service callback loop before writing code. Specifically asked it to find failure modes in the retry logic and delivery state machine.

**Seed data** — the 50 Tommy Hilfiger India customer profiles (realistic names, cities, spend levels, purchase histories) were generated with AI and reviewed for accuracy.

**Boilerplate acceleration** — TypeScript interfaces, SQL queries, Express route shapes were AI-assisted. Every line reviewed by me for correctness and security.

**Product decisions were mine** — the Tommy Hilfiger brand framing, the "wow" features to build, what to cut, the orange/white design system, the reasoning card UX — all human decisions. AI executed, I directed.

---

## Data Model

```sql
customers       id, name, email, phone, city,
                tier (Bronze/Silver/Gold/Platinum),
                total_spent, order_count,
                last_purchase_date, preferred_category, age_group

orders          id, customer_id, amount, items (JSON),
                category, channel, order_date

segments        id, name, filter_query (AI-generated SQL),
                natural_language_query, customer_count,
                ai_reasoning (JSON)

campaigns       id, name, segment_id, channel, message_template,
                status, sent_count, delivered_count,
                opened_count, clicked_count, converted_count, failed_count

communications  id, campaign_id, customer_id,
                personalized_message, status,
                sent_at, delivered_at, opened_at,
                clicked_at, converted_at, failed_reason
```

---

## Product KPIs (If This Went Live)

| KPI | What It Measures | Target |
|-----|-----------------|--------|
| Time-to-First-Campaign | Minutes from signup to first send | < 5 min |
| Segment Acceptance Rate | AI segments saved vs discarded | > 70% |
| Delivery Rate | Messages delivered / sent | > 90% |
| Revenue Attribution | GMV from converted communications | Primary business metric |
| AI Error Rate | Failed Gemini calls / total calls | < 2% |

---

## Design Philosophy

Three explicit tradeoffs I made based on what I read as the core evaluation:

**Depth over breadth.** The brief said "figuring out what NOT to build is part of what we're evaluating." I built two things deeply — the AI segment builder with reasoning card, and the live callback waterfall — rather than eight things shallowly.

**The channel service as a first-class citizen.** The brief said "how you model it tells us a lot." I built a separate Express service with per-channel delivery profiles, realistic timing distributions, exponential backoff retries, and a proper state machine. Most candidates will use a setTimeout.

**Tommy Hilfiger as narrative, not decoration.** Xeno works with Aditya Birla Group, which owns Tommy Hilfiger India. Using a real brand in Xeno's actual customer portfolio makes every product decision feel grounded — not a toy demo.

---

## What I Would Do With One More Week

**Technical debt I consciously took on:**

- **Queue** — campaign sends fire via `setImmediate`. At 10,000+ recipients this needs BullMQ + Redis with rate limiting and retry visibility
- **Database** — sql.js is ephemeral on free hosting. Production needs Postgres with WAL and connection pooling
- **Auth** — single marketer context, no login. Production needs JWT + role-based access (Admin, Campaign Manager, Analyst)
- **AI caching** — same NL query hit twice makes two API calls. Needs semantic cache with Redis + embedding similarity
- **Testing** — zero unit tests. Would add Vitest for services, Supertest for API routes, Playwright for E2E
- **Observability** — would add Pino for structured logging, Sentry for error tracking, `/metrics` for Prometheus

**Feature roadmap:**

- Multi-channel sequencing — WhatsApp day 1 → Email day 3 if unopened
- Cohort analytics — how does segment behaviour change post-campaign over time
- AI scheduling — "what's the best time to reach this audience this week"
- A/B message testing with statistical significance detection
- Loyalty tier upgrade campaigns — auto-trigger when a Bronze customer hits Silver threshold

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 · TypeScript · Vite · Tailwind CSS · React Query |
| CRM Backend | Node.js · TypeScript · Express · sql.js |
| Channel Service | Node.js · TypeScript · Express |
| AI | Google Gemini 1.5 Flash |
| Deployment | Render (backend) · Vercel (frontend) |

---

<div align="center">

Built by **Bhavika Jadon** for the Xeno FDE Engineering Challenge · June 2026

</div>
