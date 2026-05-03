# Deploying the FocusFlow API to Fly.io

This guide walks you through deploying the NestJS backend (`apps/api`) to Fly.io.
The frontend (`apps/web`) stays on Vercel.

---

## 1. One-time account + CLI setup

1. Create a Fly.io account: https://fly.io/app/sign-up (free, requires a card for verification but the hobby tier is free).
2. Install the `flyctl` CLI:
   - **Windows (PowerShell):** `iwr https://fly.io/install.ps1 -useb | iex`
   - **macOS / Linux:** `curl -L https://fly.io/install.sh | sh`
3. Log in:
   ```
   fly auth login
   ```
   This opens a browser. After login the CLI is authenticated.

You do **not** need to manually fetch a "secret key" — `fly auth login` stores a token in `~/.fly/config.yml` and every `fly` command uses it.

---

## 2. Create the Fly app

From the repo root (`focusflow/`):

```
fly launch --no-deploy --copy-config --name focusflow-api --region sin
```

- `--no-deploy` → don't deploy yet, we need to set secrets first.
- `--copy-config` → use the `fly.toml` already in the repo.
- `--name` must be globally unique on Fly. If `focusflow-api` is taken, pick another (e.g. `focusflow-api-tony`) and update `app = "..."` in `fly.toml`.
- `--region sin` → Singapore. Change to `hkg` (Hong Kong), `nrt` (Tokyo), etc. if you prefer.

Decline when it asks about Postgres / Redis / Tigris — you use MongoDB Atlas externally.

---

## 3. Set secrets

Every secret from your current Render setup must be re-set on Fly. Run these once
(replace each `...` with the real value — same values you have on Render):

```
fly secrets set \
  DATABASE_URL="..." \
  CLERK_SECRET_KEY="..." \
  CLERK_WEBHOOK_SECRET="..." \
  ANTHROPIC_API_KEY="..." \
  STRIPE_SECRET_KEY="..." \
  STRIPE_WEBHOOK_SECRET="..." \
  STRIPE_PRICE_ID_PRO="..." \
  STRIPE_PRICE_ID_PRO_MAX="..." \
  PUSHER_APP_ID="..." \
  PUSHER_KEY="..." \
  PUSHER_SECRET="..." \
  RESEND_API_KEY="..." \
  FROM_EMAIL="noreply@yourdomain.com" \
  AI_WORKER_URL="..." \
  CORS_ORIGIN="https://your-frontend.vercel.app" \
  WEB_APP_URL="https://your-frontend.vercel.app"
```

> On Windows PowerShell replace the `\` line continuations with backticks `` ` ``,
> or just put it all on one line.

**Important — the two new ones for collaboration:**
- `WEB_APP_URL` — controls the `/invite/...` and `/boards/...` links in invitation emails. **Set this to your Vercel frontend URL** (e.g. `https://focusflow.vercel.app`). Otherwise links default to `http://localhost:5173` and won't work for your friends.
- `CORS_ORIGIN` — must match your frontend origin or the browser blocks API calls.

To list secrets later: `fly secrets list`. To remove one: `fly secrets unset NAME`.

---

## 4. Deploy

```
fly deploy
```

First deploy takes 3–6 minutes (Docker build + push). Subsequent deploys are faster
because layers are cached.

When it finishes:
```
fly status
fly logs           # tail logs
fly open           # open https://focusflow-api.fly.dev in browser
```

Hit `https://<app>.fly.dev/api` in a browser — you should get the root response
from `app.controller.ts` (not a 404).

---

## 5. Point the frontend at the new API

In **Vercel** (or wherever the frontend is deployed), update the env var that points
to the API base URL — typically `VITE_API_URL` or `VITE_API_BASE_URL` — to:

```
https://focusflow-api.fly.dev/api
```

(Use whatever name your `apps/web` code uses. Search for `import.meta.env.VITE_API`
under `apps/web/src` to confirm.)

Redeploy the frontend so the new env var takes effect.

Also update:
- **Clerk dashboard** → if you have webhook URLs pointing at Render, change them to `https://focusflow-api.fly.dev/api/...`.
- **Stripe dashboard** → same for the Stripe webhook endpoint.
- **Resend dashboard** → no change needed unless you had webhooks.

---

## 6. Verify, then retire Render

1. Test in production:
   - Sign in.
   - Create a board, invite a friend's email (requires step 7 below for non-self emails).
   - Click a copy-link — verify the URL points at your Vercel frontend, not localhost.
   - Open a board in two browsers and confirm Pusher real-time updates still work.
2. Once happy, on Render: pause or delete the `focusflow-api` service so it stops billing/cold-starting.
3. You can keep `render.yaml` in the repo as a fallback or delete it.

---

## 7. Fix the "can only invite my own email" issue

This is **not** related to Fly — it's because Resend's default sender
`onboarding@resend.dev` only allows sending to the verified account owner.

To send to anyone:
1. In Resend dashboard → **Domains** → **Add Domain**.
2. Add a domain you own (e.g. `focusflow.app`).
3. Add the DNS records Resend shows you (SPF, DKIM, optionally DMARC) at your registrar (Namecheap / Cloudflare / etc.).
4. Wait for Resend to verify (usually <30 min).
5. Update the secret:
   ```
   fly secrets set FROM_EMAIL="noreply@yourdomain.com"
   ```
6. Done — invites now go to any email.

If you don't own a domain yet, you cannot bypass this. Cheapest fix: buy a `.dev`
or `.app` domain (~$12/yr) on Cloudflare or Namecheap.

---

## Common commands

| Task | Command |
|---|---|
| Tail logs | `fly logs` |
| SSH into the running machine | `fly ssh console` |
| Restart | `fly apps restart focusflow-api` |
| Scale memory | `fly scale memory 1024` |
| Add a region | `fly regions add nrt` |
| Roll back | `fly releases` then `fly deploy --image <previous>` |
| Delete app | `fly apps destroy focusflow-api` |

---

## Troubleshooting

- **Build fails on `prisma generate`** → make sure `apps/api/prisma/schema.prisma` is committed and `openssl` is installed in the Dockerfile (it is).
- **`Application error` after deploy** → `fly logs`. Most often a missing secret. Run `fly secrets list` and compare with the list in section 3.
- **CORS errors in browser** → `CORS_ORIGIN` doesn't match the frontend origin exactly. No trailing slash. Multiple origins can be comma-separated.
- **Pusher / WebSocket not working** → Pusher uses its own infra, your Fly app only signs auth requests. If real-time fails, check `PUSHER_*` secrets and `PUSHER_CLUSTER=ap4`.
- **Health check failing** → the check hits `GET /api`. If you removed the root controller, change `path` in `fly.toml` to a route you know exists, or switch to a TCP check.
