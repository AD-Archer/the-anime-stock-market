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

# Build-time arguments that should be exposed to Next.js
ARG NEXT_PUBLIC_APPWRITE_ENDPOINT
ARG NEXT_PUBLIC_APPWRITE_PROJECT_ID
ARG NEXT_PUBLIC_APPWRITE_PROJECT_NAME
ARG NEXT_PUBLIC_APPWRITE_DATABASE_ID
ARG NEXT_PUBLIC_SITE_URL

ENV NEXT_PUBLIC_APPWRITE_ENDPOINT=${NEXT_PUBLIC_APPWRITE_ENDPOINT}
ENV NEXT_PUBLIC_APPWRITE_PROJECT_ID=${NEXT_PUBLIC_APPWRITE_PROJECT_ID}
ENV NEXT_PUBLIC_APPWRITE_PROJECT_NAME=${NEXT_PUBLIC_APPWRITE_PROJECT_NAME}
ENV NEXT_PUBLIC_APPWRITE_DATABASE_ID=${NEXT_PUBLIC_APPWRITE_DATABASE_ID}
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application (requires NEXT_PUBLIC_* variables)
RUN pnpm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

# Environment variables should still be provided at runtime for secrets like the Appwrite API key.
# NEXT_PUBLIC_* values are safe to bake in via build args (scripts/build-docker.mjs already sets them), so we keep them available.
ARG NEXT_PUBLIC_APPWRITE_ENDPOINT
ARG NEXT_PUBLIC_APPWRITE_PROJECT_ID
ARG NEXT_PUBLIC_APPWRITE_PROJECT_NAME
ARG NEXT_PUBLIC_APPWRITE_DATABASE_ID
ARG NEXT_PUBLIC_SITE_URL
ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_PUBLIC_APPWRITE_ENDPOINT=${NEXT_PUBLIC_APPWRITE_ENDPOINT}
ENV NEXT_PUBLIC_APPWRITE_PROJECT_ID=${NEXT_PUBLIC_APPWRITE_PROJECT_ID}
ENV NEXT_PUBLIC_APPWRITE_PROJECT_NAME=${NEXT_PUBLIC_APPWRITE_PROJECT_NAME}
ENV NEXT_PUBLIC_APPWRITE_DATABASE_ID=${NEXT_PUBLIC_APPWRITE_DATABASE_ID}
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}

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
