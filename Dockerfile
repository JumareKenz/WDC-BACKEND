# syntax=docker/dockerfile:1.7
#
# Multi-stage build for the WDC backend.
#   builder  — installs deps and compiles TypeScript
#   pruner   — produces a deps-only node_modules for the runtime stage
#   runtime  — distroless Node 20, non-root, minimal surface
#
# Build:  docker build -t wdc-backend:dev .
# Run:    docker run --rm -p 3000:3000 --env-file .env.local wdc-backend:dev

ARG NODE_VERSION=20.18.0
ARG PNPM_VERSION=10.33.0

FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=true
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /app

# --- builder ---
FROM base AS builder
COPY package.json pnpm-lock.yaml* ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile=false
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN pnpm build

# --- pruner: production-only deps ---
FROM base AS pruner
COPY package.json pnpm-lock.yaml* ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --prod --frozen-lockfile=false

# --- runtime: distroless ---
FROM gcr.io/distroless/nodejs20-debian12:nonroot AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

COPY --from=pruner --chown=nonroot:nonroot /app/node_modules ./node_modules
COPY --from=builder --chown=nonroot:nonroot /app/dist ./dist
COPY --from=builder --chown=nonroot:nonroot /app/package.json ./package.json

USER nonroot:nonroot
EXPOSE 3000

# Distroless's default entrypoint is `node`; we just pass the script.
CMD ["dist/main.js"]
