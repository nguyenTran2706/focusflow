# FocusFlow

> Team productivity SaaS — Kanban boards, real-time collaboration, AI-assisted task breakdown, whiteboards, chat, and Stripe billing.

FocusFlow turns fuzzy goals into actionable boards. Drop in a one-line objective and Claude proposes a starting set of cards; your team works them in real time with live presence, optimistic updates, collaborative whiteboards, and built-in chat.

---

## Why this exists

Every project tool treats you like a data-entry clerk — you still do the breakdown, the prioritization, the standup write-up. FocusFlow shifts that work onto an AI assistant, then keeps the workspace alive with presence-first realtime so remote teams feel each other working.

## Architecture

```
       ┌──────────────────────────┐
       │   React + Vite (web)     │
       │   port 5173              │
       └───────────┬──────────────┘
                   │ REST + Pusher (realtime)
                   ▼
       ┌──────────────────────────┐       ┌───────────────┐
       │   NestJS API             │──────▶│   MongoDB     │
       │   port 3001              │       │   (Prisma)    │
       └───┬───────┬──────┬───────┘       └───────────────┘
           │       │      │
   Stripe ─┘   Clerk    Resend       internal HTTP
   webhook    webhook   email              │
                                           ▼
                              ┌──────────────────────────┐
                              │   NestJS AI Worker       │──────▶ Anthropic Claude
                              │   port 3002              │
                              └──────────────────────────┘
```

**Three services, not a monolith** — the AI worker is isolated so it can be rate-limited, restarted, and metered independently of the main API.

## Feature pillars

| Pillar | Deliverable |
|---|---|
| **Kanban fundamentals** | Workspaces → Boards → Sprints → Columns → Cards → Comments, with fractional-rank ordering |
| **Real-time collaboration** | Pusher-driven presence, live moves, optimistic UI with server reconciliation |
| **Whiteboards** | Collaborative drawing/diagramming canvas with shareable join links |
| **Team chat** | Real-time messaging per workspace |
| **AI assistance** | Task breakdown, summarize, prioritize — metered per plan |
| **Billing** | Stripe Checkout + webhooks, plan gating (Free / Pro / Pro Max) |
| **Auth & multi-tenancy** | Clerk authentication, workspace invites, membership-scoped authorization on every query |
| **Internationalization** | English, Vietnamese, Japanese, Korean, Simplified Chinese |

## Tech stack

- **Frontend** — React 19, Vite, TypeScript, Tailwind + shadcn/ui, TanStack Query, Zustand, i18next
- **Backend** — NestJS 11 (TypeScript), Prisma, MongoDB
- **Auth** — Clerk (`@clerk/express`), Svix webhook verification
- **Real-time** — Pusher Channels
- **AI** — Anthropic SDK, Claude Sonnet 4.6
- **Payments** — Stripe Checkout + webhooks
- **Email** — Resend (transactional)
- **Testing** — Vitest (web), Jest (api, ai-worker)
- **Infra** — GitHub Actions CI, Fly.io / Render deployment, MongoDB Atlas

## Monorepo layout

```
focusflow/
├── apps/
│   ├── web/         # React + Vite frontend
│   ├── api/         # NestJS REST API (boards, chat, whiteboards, auth, billing)
│   └── ai-worker/   # NestJS service calling Anthropic
├── docs/            # wireframes, architecture notes
├── scripts/         # dev helpers, i18n tooling
└── .github/         # CI workflows
```

## Local development

```bash
# 1. Clone and install (npm workspaces hoists deps)
git clone https://github.com/<user>/focusflow.git
cd focusflow
npm install

# 2. Copy env template and fill in real values (Clerk, Stripe, Pusher, Anthropic, Resend, MongoDB)
cp .env.example .env

# 3. Run all services
npm run dev          # spawns web + api + ai-worker concurrently

# …or run each in its own terminal
npm run dev:web      # http://localhost:5173
npm run dev:api      # http://localhost:3001/api
npm run dev:ai       # http://localhost:3002/ai
```

Requires Node >=20 and a MongoDB instance reachable at `DATABASE_URL`.

## License

UNLICENSED — portfolio project, not for redistribution.
