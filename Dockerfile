# Use the official Node.js 20 Alpine image as the base
FROM node:20-alpine AS base

# Install pnpm globally
RUN npm install -g pnpm

# Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Build-time args for client-exposed envs (NEXT_PUBLIC_*). The helper
# script `scripts/build-docker.mjs` will pass any NEXT_PUBLIC_* values
# from `.env.local` as build args. We expose them as ENVs so Next.js can
# inline NEXT_PUBLIC_* into the client bundle during `pnpm run build`.
ARG NEXT_PUBLIC_APPWRITE_ENDPOINT
ARG NEXT_PUBLIC_APPWRITE_PROJECT_ID
ARG NEXT_PUBLIC_APPWRITE_PROJECT_NAME
ARG NEXT_PUBLIC_SITE_URL

ENV NEXT_PUBLIC_APPWRITE_ENDPOINT=${NEXT_PUBLIC_APPWRITE_ENDPOINT}
ENV NEXT_PUBLIC_APPWRITE_PROJECT_ID=${NEXT_PUBLIC_APPWRITE_PROJECT_ID}
ENV NEXT_PUBLIC_APPWRITE_PROJECT_NAME=${NEXT_PUBLIC_APPWRITE_PROJECT_NAME}
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}

# Note: NEXT_PUBLIC_APPWRITE_DATABASE_ID is intentionally excluded from build args
# to avoid making the database ID public. If you need the DB ID server-side, set
# APPWRITE_DATABASE_ID in your runtime environment (.env.local or via --env-file).

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
# The build will work without NEXT_PUBLIC_* variables (code handles missing values gracefully)
RUN pnpm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

# Set only non-sensitive runtime defaults
# All environment variables (including NEXT_PUBLIC_* and secrets) should be
# provided at runtime via --env-file or -e flags when running the container.
# This ensures no secrets are baked into the image.
ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy entrypoint script
COPY --chown=nextjs:nodejs entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

USER nextjs

EXPOSE 3000

# Start the server with entrypoint script
# Note: All runtime environment variables (DATABASE_URL, API keys, etc.)
# should be passed via --env-file or -e flags when running the container
ENTRYPOINT ["/app/entrypoint.sh"]
