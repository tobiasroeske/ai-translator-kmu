# =============================================================================
# Meeting Intelligence — Production Dockerfile
# =============================================================================
# Multi-stage build keeps the final image lean (~150MB vs ~1GB+).
# We use Next.js "standalone" output so the runner stage only needs the
# minimal server bundle — no full node_modules at runtime.
#
# Usage:
#   docker build -t meeting-intelligence .
#   docker run -p 3000:3000 --env-file .env.local meeting-intelligence
# =============================================================================

# Pinning to a specific Node LTS patch version makes builds reproducible.
ARG NODE_VERSION=24-alpine
# Pin pnpm to match the local version declared in package.json#packageManager.
# Avoids "corepack prepare pnpm@latest" resolving to a different version in CI.
ARG PNPM_VERSION=11.5.0

# =============================================================================
# Stage 1 — deps
# Install ALL dependencies (incl. devDeps) so the builder has what it needs.
# This layer is cached independently — it only rebuilds when lock file changes.
# =============================================================================
FROM node:${NODE_VERSION} AS deps

# libc6-compat is required on Alpine for certain native Node bindings.
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Install the exact pnpm version declared in package.json#packageManager.
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

# Copy only the manifests first to exploit Docker's layer cache:
# if package.json + lockfile haven't changed, pnpm install is skipped.
# pnpm-workspace.yaml MUST be present — pnpm 11 reads `allowBuilds` from it to
# decide which packages may run build scripts (sharp, msw, unrs-resolver).
# Since pnpm 11 sets strictDepBuilds=true by default, any unreviewed build
# script makes this install fail with ERR_PNPM_IGNORED_BUILDS (exit 1), so the
# workspace file is required, not optional.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile


# =============================================================================
# Stage 2 — builder
# Compiles TypeScript, bundles assets, produces the standalone output.
# =============================================================================
FROM node:${NODE_VERSION} AS builder

RUN apk add --no-cache libc6-compat

WORKDIR /app

# Bring in installed node_modules from deps stage.
COPY --from=deps /app/node_modules ./node_modules

# Copy the full project source.
COPY . .

# Next.js collects anonymous telemetry during builds; disable it in CI/Docker
# so builds are faster and don't phone home.
ENV NEXT_TELEMETRY_DISABLED=1

# Build-time env vars that Next.js needs to be present during `next build`
# for anything accessed at build time (e.g. NEXT_PUBLIC_* vars).
# Runtime-only secrets (SUPABASE_SERVICE_ROLE_KEY, API keys) should NOT
# be baked into the image — pass them at `docker run` time via --env-file.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}

# Use next directly — pnpm is not needed here since node_modules is already
# present from the deps stage. Avoids a second corepack download.
RUN node_modules/.bin/next build


# =============================================================================
# Stage 3 — runner
# Minimal production image. Only contains the standalone server bundle,
# static assets, and the public folder. No source, no devDeps, no pnpm.
# =============================================================================
FROM node:${NODE_VERSION} AS runner

RUN apk add --no-cache libc6-compat

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Running as a non-root user follows the principle of least privilege.
# If the container is ever compromised, the blast radius is minimized.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# The standalone build outputs a self-contained server at .next/standalone.
# Static assets and public files must be copied manually alongside it.
# All three copies are chowned to nextjs:nodejs so the non-root user owns them.
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# PORT is configurable so the image works on any host port without rebuilding.
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# The standalone build's entry point is server.js at the root.
CMD ["node", "server.js"]
