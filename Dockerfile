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

# Note: We intentionally do NOT pass environment variables at build time
# to prevent secrets from being baked into the image. All environment
# variables will be provided at runtime via --env-file or -e flags.

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
