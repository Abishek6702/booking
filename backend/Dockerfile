# syntax=docker/dockerfile:1.7

# ==============================================================================
# TravelMate backend — single-container modular monolith
#
# Two-stage build:
#   1. `deps`    — installs npm packages + runs `prisma generate` via the
#                  project's `postinstall` hook. Requires DATABASE_URL and
#                  DIRECT_URL as build ARGs because prisma.config.ts calls
#                  env("DATABASE_URL") at generate time.
#   2. `runtime` — slim runtime image. Receives node_modules (including the
#                  generated Prisma client) and the source tree. The app runs
#                  through `tsx` directly (no separate compile step).
#
# Why DATABASE_URL is needed at build time:
#   prisma.config.ts uses `env("DATABASE_URL")` which Prisma resolves when
#   `prisma generate` runs. The postinstall hook triggers generate during
#   `npm ci`, so the URL must be available as a build-time ARG — it is NOT
#   used to open a real database connection during the build; Prisma only
#   reads it to embed the datasource URL in the generated client.
# ==============================================================================

ARG NODE_VERSION=22-alpine

# ────────────────────────────────────────────────────────────────────────────
# Stage 1: deps
# ────────────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS deps

# bcrypt and Prisma engines need build toolchain + glibc-compat shims.
RUN apk add --no-cache \
      python3 \
      make \
      g++ \
      libc6-compat \
      openssl

WORKDIR /app

# ── Build-time database URL injection ────────────────────────────────────────
# These ARGs are declared here so Docker accepts them from `--build-arg` /
# compose `build.args`. They are set as ENV so the prisma.config.ts `env()`
# call resolves during `npm ci` → `postinstall` → `prisma generate`.
#
# IMPORTANT: these values are NOT baked into the final runtime image — they
# only exist in the intermediate `deps` stage. The runtime stage sets its own
# DATABASE_URL from the container's environment at startup.
ARG DATABASE_URL
ARG DIRECT_URL
ENV DATABASE_URL=${DATABASE_URL} \
    DIRECT_URL=${DIRECT_URL}

# Copy only the files needed for dependency installation first so Docker can
# cache this layer independently of source-code changes.
COPY package.json package-lock.json* ./
COPY prisma ./prisma
COPY prisma.config.ts ./

# `npm ci` is reproducible and runs the `postinstall` hook
# (`prisma generate`) which writes the Prisma client into node_modules.
ENV CI=true \
    NODE_ENV=production
RUN npm ci --include=dev

# ────────────────────────────────────────────────────────────────────────────
# Stage 2: runtime
# ────────────────────────────────────────────────────────────────────────────
FROM node:${NODE_VERSION} AS runtime

# Runtime needs openssl for Prisma engines and tini as PID 1 so SIGTERM
# reaches Node properly during graceful shutdown.
RUN apk add --no-cache openssl tini libc6-compat

WORKDIR /app

# Copy resolved dependencies + generated Prisma client from the deps stage.
# DATABASE_URL / DIRECT_URL from the deps stage are NOT copied here — the
# runtime container receives them from docker-compose environment: at startup.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/package-lock.json ./package-lock.json
COPY --from=deps /app/prisma ./prisma
COPY --from=deps /app/prisma.config.ts ./prisma.config.ts

# Copy application source. `tsx` runs TypeScript directly; no compile step.
COPY tsconfig.json ./tsconfig.json
COPY src ./src

# Persistent uploads directory — bind-mounted as a Docker volume in compose.
RUN mkdir -p /app/uploads

# Drop privileges. The official node image ships with a `node` user (uid 1000).
RUN chown -R node:node /app
USER node

ENV NODE_ENV=production \
    PORT=4000

EXPOSE 4000

# `tini` reaps zombies and forwards signals so the graceful shutdown handler
# in src/server.ts runs on `docker stop`.
ENTRYPOINT ["/sbin/tini", "--"]

CMD ["npm", "run", "start"]
