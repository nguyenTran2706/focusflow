# syntax=docker/dockerfile:1.6
# Multi-stage build for the FocusFlow NestJS API (monorepo workspace apps/api)

FROM node:20-alpine AS builder
WORKDIR /repo

# OpenSSL is required by Prisma's query engine on Alpine
RUN apk add --no-cache openssl

# Copy manifests first for better layer caching
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/ai-worker/package.json ./apps/ai-worker/

# Install all workspace deps (dev included — needed for nest build)
RUN npm ci --include=dev --workspaces --include-workspace-root

# Copy the rest of the repo
COPY . .

# Generate Prisma client and build the API
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma \
 && npm run build -w apps/api


FROM node:20-alpine AS runner
WORKDIR /repo

RUN apk add --no-cache openssl tini

ENV NODE_ENV=production
ENV PORT=3001

# Copy manifests and install prod-only deps for api + root
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
RUN npm ci --omit=dev --workspaces --include-workspace-root --workspace=apps/api

# Copy built artifacts and Prisma schema/client from builder
COPY --from=builder /repo/apps/api/dist ./apps/api/dist
COPY --from=builder /repo/apps/api/prisma ./apps/api/prisma
COPY --from=builder /repo/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /repo/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3001

WORKDIR /repo/apps/api
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main"]
