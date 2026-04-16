# FocusFlow

> Team Kanban board with AI-assisted task breakdown, real-time collaboration, and Stripe billing.

FocusFlow turns fuzzy goals into actionable boards. Drop in a one-line objective and Claude proposes a starting set of cards; your team works them in real time with live presence, optimistic updates, and an activity feed.

**Status:** scaffolding complete, milestone 1 (auth + workspaces) in progress.

---

## Why this exists

Every project tool treats you like a data-entry clerk — you still do the breakdown, the prioritization, the standup write-up. FocusFlow shifts that work onto an AI assistant, then keeps the board alive with presence-first realtime so remote teams feel each other working.

## Architecture

```
       ┌──────────────────────────┐
       │   React + Vite (web)     │
       │   port 5173              │
       └───────────┬──────────────┘
                   │ REST + WebSocket
                   ▼
       ┌──────────────────────────┐       ┌───────────────┐
       │   NestJS API             │──────▶│   Postgres    │
       │   port 3001              │       │   (Prisma)    │
       └───────┬───────┬──────────┘       └───────────────┘
               │       │
   Stripe ─────┘       │ internal HTTP
   webhook             ▼
              ┌──────────────────────────┐
              │   NestJS AI Worker       │──────▶ Anthropic Claude
              │   port 3002              │
              └──────────────────────────┘
```

**Three services, not a monolith** — the AI worker is isolated so it can be rate-limited, restarted, and metered independently of the main API.

## Feature pillars

| Pillar | Deliverable |
|---|---|
| **Kanban fundamentals** | Workspaces → Boards → Columns → Cards → Comments, with fractional-rank ordering |
| **Real-time** | Socket.IO presence, live moves, optimistic UI with server reconciliation |
| **AI assistance** | `breakdown`, `summarize`, `prioritize`, daily standup — all metered per plan |
| **Billing** | Stripe Checkout + webhooks, plan gating middleware (Free / Pro / Team) |
| **Auth & multi-tenancy** | JWT, workspace invites, membership-scoped authorization on every query |

## Tech stack

- **Frontend** — React 19, Vite, TypeScript, Tailwind + shadcn/ui, TanStack Query, Zustand
- **Backend** — NestJS 11 (TypeScript), Prisma, Postgres, Socket.IO
- **AI** — Anthropic SDK, Claude Opus 4.6
- **Payments** — Stripe Checkout + webhooks
- **Testing** — Vitest (web), Jest (api, ai-worker)
- **Infra** — Docker, GitHub Actions, Fly.io, Neon Postgres

## Monorepo layout

```
focusflow/
├── apps/
│   ├── web/         # React + Vite frontend
│   ├── api/         # NestJS REST + WebSocket API
│   └── ai-worker/   # NestJS service calling Anthropic
├── docs/            # wireframes, architecture notes
├── scripts/         # dev helpers
└── .github/         # CI workflows
```

## Local development

```bash
# 1. Clone and install (npm workspaces hoists deps)
git clone https://github.com/<user>/focusflow.git
cd focusflow
npm install

# 2. Copy env template and fill in real values
cp .env.example .env

# 3. Run each service in its own terminal
npm run dev:web      # http://localhost:5173
npm run dev:api      # http://localhost:3001/api
npm run dev:ai       # http://localhost:3002/ai
```

Requires Node >=20 and a Postgres instance reachable at `DATABASE_URL`.

## Milestones

1. **Auth + workspaces** — register/login, workspace creation, invites *(in progress)*
2. **Kanban CRUD** — boards, columns, cards over REST
3. **Real-time** — Socket.IO + optimistic UI + presence
4. **AI worker** — task breakdown, then summarize + prioritize
5. **Stripe billing** — Checkout, webhooks, plan gating
6. **Polish & deploy** — Docker, CI/CD, Fly.io + Neon, case-study writeup

## License

UNLICENSED — portfolio project, not for redistribution.
