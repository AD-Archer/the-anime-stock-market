# Anime Stock Market

A Next.js app for simulated anime stock trading with real-time trading, private messaging, message boards, and community features.

---

## Features ✨

- **Real-time stock trading** — live price updates, buy/sell flows, market ticker, and immediate portfolio updates.
- **Direct messaging** — private, real-time DMs between users.
- **Message boards** — public threads and discussions per anime/character.
- **Portfolio & Leaderboard** — view your holdings, transactions, and compare standings.
- **Admin & moderation** — reports, user management, buyback workflows, and support tools.
- **Notifications & history** — in-app notifications and transaction history for transparency.

---

## Quick start — Development 🔧

Prerequisites:

- Node.js 18+
- pnpm

Install and run locally:

```bash
git clone https://github.com/AD-Archer/the-anime-stock-market.git
cd the-anime-stock-market
pnpm install
pnpm dev
```

Open http://localhost:3000

## Docker

### Build Locally

Copy the environment values you want the client bundle to bake in (`NEXT_PUBLIC_*`) into `.env.local`, then build the image with the helper script so those variables are passed as build args:

```bash
node scripts/build-docker.mjs
# or (manual)
docker build -t adarcher/the-anime-stock-exchange:latest . \
  --build-arg NEXT_PUBLIC_APPWRITE_ENDPOINT="https://..." \
  --build-arg NEXT_PUBLIC_APPWRITE_PROJECT_ID="..."
```

If you prefer to run `docker build` directly, mirror the same values via `--build-arg NEXT_PUBLIC_APPWRITE_ENDPOINT=...` etc.

### Run Locally

Use the included run script so `.env.local` and other required secrets are automatically passed at runtime:

```bash
node scripts/run-docker.mjs
# or
# Run the built image and pass runtime envs via --env-file
# (recommended for secrets)

docker run -p 3000:3000 --env-file .env.local adarcher/the-anime-stock-exchange:latest
```

That script mounts `.env.local` as an `--env-file`, but if you start the container manually you must include the same file as well:

```bash
docker run -p 3000:3000 --env-file .env.local anime-stock-market
```

**Troubleshooting tips** ✅

- If the container complains about missing variables, ensure `.env.local` exists in the same directory as `docker-compose.yml` and contains the required keys (for example `APPWRITE_API_KEY`, `NEXT_PUBLIC_APPWRITE_ENDPOINT`, etc.).
- You can control which server-only variables must be present at runtime using `REQUIRED_VARS` (space- or comma-separated). Example in `.env.local`:

```env
REQUIRED_VARS="APPWRITE_API_KEY SMTP_HOST SMTP_USER SMTP_PASS"
```

- Client-visible variables (those prefixed with `NEXT_PUBLIC_`) must be present at _build time_ to be inlined into the client bundle. Use `node scripts/build-docker.mjs` to pass `NEXT_PUBLIC_*` values as build args.
  **Important:** Some `NEXT_PUBLIC_` values are intentionally excluded from build args to avoid leaking internal identifiers. By default, `NEXT_PUBLIC_APPWRITE_DATABASE_ID` is skipped and will NOT be passed as a build arg. If you need a database ID or other internal identifiers, set them as **server-side** variables (e.g. `APPWRITE_DATABASE_ID`) in `.env.local` instead.
- If you're mounting a dotenv file into `/app`, verify it is readable by the container user (uid 1001); otherwise prefer `--env-file` which passes variables into the container environment directly.

- When using Docker's `--env-file` / `docker-compose` `env_file`, avoid wrapping values in quotes (e.g. `APPWRITE_ENDPOINT=https://appwrite.example.com/v1`). Docker does not strip surrounding quotes in some environments and they can be preserved into the container environment, which will break client-side URL parsing. If you must include quotes for local editing, the runtime will now sanitize values, but removing the quotes is recommended.

- To safely verify server-only env presence from a running app (no values returned): enable the debug endpoint temporarily by setting `ENABLE_ENV_DEBUG=true` (or run in non-production). Then GET `/api/_internal/env-check` which will return which keys are present and a `missing` list. To customize which keys it checks, set `ENV_CHECK_KEYS` (space separated).

- To inspect which env vars are available inside the container:
  - Run the image with `--env-file .env.local` and print env: `docker run --rm --env-file .env.local --entrypoint env adarcher/anime-stock-market:latest`
  - Or, for a running container: `docker exec -it <container> sh -c "printenv | grep APPWRITE"`

---

### Dockerfile (reference)

```dockerfile
# Use the official Node.js 20 Alpine image as the base
FROM node:20-alpine AS base

# Install pnpm globally
RUN npm install -g pnpm

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

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
RUN pnpm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

# Set only non-sensitive runtime defaults
ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy entrypoint script
COPY --chown=nextjs:nodejs entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

USER nextjs

EXPOSE 3000

# Start the server with entrypoint script
ENTRYPOINT ["/app/entrypoint.sh"]
```

## Docker Compose

An example `docker-compose.yml` is provided to run the application using Docker Compose. It pulls the latest image from Docker Hub and supports environment variable configuration for future full-stack features.

1. Copy the environment example file:

   ```bash
   cp .env.example .env
   ```

2. Edit `.env` to set any required environment variables (database URL, etc.).

3. Run the application:
   ```bash
   docker-compose up
   ```

The application will be available at [http://localhost:3000](http://localhost:3000).

---

## Analytics (Plausible) 📊

This project includes a lightweight client-side Plausible initializer (`components/analytics/plausible-init.tsx`). Configure the following env vars in `.env.local`:

```env
# domain used by Plausible (optional - derived from NEXT_PUBLIC_SITE_URL if not set)
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=animestockexchange.adarcher.app
# optional Plausible proxy/API host
NEXT_PUBLIC_PLAUSIBLE_API_HOST=https://plausible.adarcher.app
```

Notes:

- The tracker is only loaded on the client. The initializer will derive the Plausible domain from `NEXT_PUBLIC_SITE_URL` if `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is not set.
- If you self-host Plausible behind a proxy, set `NEXT_PUBLIC_PLAUSIBLE_API_HOST` to the proxy endpoint.
- For local dev, you can set `captureOnLocalhost` inside the tracker options if you want to capture events from localhost (not recommended for production).

---

### Adding a Database

When you're ready to add a database, uncomment the database service in `docker-compose.yml` and update the `DATABASE_URL` in your `.env` file. The setup is modular and supports any database that can run in Docker.

## Appwrite Database Setup

This app uses Appwrite as the backend database for storing users, stocks, transactions, and other data.

### Prerequisites

- An Appwrite instance (cloud or self-hosted)
- Appwrite project created

### Authentication Setup

The app now uses Appwrite authentication instead of Stack Auth. Users can sign up and sign in using their email and password.

### Database Setup

You can create the database + tables either manually in the Console, or automatically using the included setup script.

#### Option A: Automatic setup (recommended for dev)

1. Create an Appwrite API key in the Appwrite Console (Project Settings → API Keys).
2. Set the env vars:

- `NEXT_PUBLIC_APPWRITE_ENDPOINT`
- `NEXT_PUBLIC_APPWRITE_PROJECT_ID`
- `NEXT_PUBLIC_APPWRITE_DATABASE_ID`
- `APPWRITE_API_KEY` (server-side only)

3. Run:

```bash
pnpm appwrite:setup
```

4. Then seed:

```bash
pnpm seed
```

#### Option B: Manual setup (Console)

1. **Create Database**: In your Appwrite console, create a new database with ID `6949af2400329e3595cc` (or update `NEXT_PUBLIC_APPWRITE_DATABASE_ID` in `.env.local` if you choose a different name).

2. **Create Collections**: Create the following collections in your database:

3. **Create Collections**: Create the following collections in your database:

   #### Users Collection

   - Collection ID: `users`
   - Permissions: Read: `role:all`, Write: `role:all` (adjust for production)
   - Attributes:
     - `username` (string, required)
     - `email` (string, required)
     - `balance` (number, required, default: 1000)
     - `isAdmin` (boolean, required, default: false)
     - `createdAt` (string, required)
     - `isBanned` (boolean, required, default: false)

   #### Stocks Collection

   - Collection ID: `stocks`
   - Permissions: Read: `role:all`, Write: `role:all`
   - Attributes:
     - `characterName` (string, required)
     - `anime` (string, required)
     - `currentPrice` (number, required)
     - `createdBy` (string, required)
     - `createdAt` (string, required)
     - `imageUrl` (string, required)
     - `description` (string, required)
     - `totalShares` (number, required)
     - `availableShares` (number, required)

   #### Transactions Collection

   - Collection ID: `transactions`
   - Permissions: Read: `role:all`, Write: `role:all`
   - Attributes:
     - `userId` (string, required)
     - `stockId` (string, required)
     - `type` (string, required) - enum: "buy", "sell"
     - `shares` (number, required)
     - `pricePerShare` (number, required)
     - `totalAmount` (number, required)
     - `timestamp` (string, required)

   #### Portfolios Collection

   - Collection ID: `portfolios`
   - Permissions: Read: `role:all`, Write: `role:all`
   - Attributes:
     - `userId` (string, required)
     - `stockId` (string, required)
     - `shares` (number, required)
     - `averageBuyPrice` (number, required)

   #### Price History Collection

   - Collection ID: `price_history`
   - Permissions: Read: `role:all`, Write: `role:all`
   - Attributes:
     - `stockId` (string, required)
     - `price` (number, required)
     - `timestamp` (string, required)

   #### Comments Collection

   - Collection ID: `comments`
   - Permissions: Read: `role:all`, Write: `role:all`
   - Attributes:
     - `userId` (string, required)
     - `animeId` (string, required)
     - `characterId` (string, optional)
     - `content` (string, required)
     - `timestamp` (string, required)

   #### Buyback Offers Collection

   - Collection ID: `buyback_offers`
   - Permissions: Read: `role:all`, Write: `role:all`
   - Attributes:
     - `stockId` (string, required)
     - `offeredPrice` (number, required)
     - `offeredBy` (string, required)
     - `targetUsers` (string array, optional)
     - `expiresAt` (string, required)
     - `status` (string, required) - enum: "active", "expired", "accepted", "declined"
     - `acceptedBy` (string, optional)
     - `acceptedShares` (number, optional)

   #### Notifications Collection

   - Collection ID: `notifications`
   - Permissions: Read: `role:all`, Write: `role:all`
   - Attributes:
     - `userId` (string, required)
     - `type` (string, required) - enum: "buyback_offer", "admin_message", "system"
     - `title` (string, required)
     - `message` (string, required)
     - `data` (string, optional) - JSON string
     - `read` (boolean, required, default: false)
     - `createdAt` (string, required)

4. **Seed Initial Data**: After creating all collections, run the seeding script:

   ```bash
   pnpm seed
   ```

   This will populate your database with initial users, stocks, and sample data.

   **Safety note:** Seeding is blocked in production by default. To intentionally run the seeder in production set `CONFIRM_PROD_SEED=true` in your environment and re-run the command. By default the seeder will also skip creating users in production unless `ALLOW_SEED_USERS_IN_PROD=true` is set. In addition, in production the seeder only allows stocks that include a verified Anilist reference (`anilistId` or `source='anilist'`); to override this check set `ALLOW_UNVERIFIED_STOCKS=true`. These guards help prevent accidentally adding unverified anime or test users to a live database.

### Environment Variables

Make sure your `.env.local` file contains:

```env
NEXT_PUBLIC_APPWRITE_DATABASE_ID=anime_stock_db
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your_project_id
NEXT_PUBLIC_APPWRITE_ENDPOINT=your_appwrite_endpoint
```

### Switching to Database Mode

Once the database is set up and seeded, the app will automatically use Appwrite for data storage instead of the local mock data. The store will load data from the database on initialization.

## CI/CD

This project uses GitHub Actions for continuous integration and deployment. The repository includes a workflow that builds and pushes a multi-arch Docker image (linux/amd64 and linux/arm64) to Docker Hub on pushes to `main`.

### Setup

1. Create a Docker Hub account and repository.

2. Add the following secrets to your GitHub repository:

   - `DOCKERHUB_USERNAME`: Your Docker Hub username
   - `DOCKERHUB_TOKEN`: A Docker Hub access token (create one in Docker Hub settings)
   - (Optional, for build-time client vars) `NEXT_PUBLIC_APPWRITE_ENDPOINT`, `NEXT_PUBLIC_APPWRITE_PROJECT_ID`, `NEXT_PUBLIC_APPWRITE_PROJECT_NAME`, `NEXT_PUBLIC_SITE_URL`

3. The workflow will automatically trigger on pushes to `main` and will publish `adarcher/the-anime-stock-exchange:latest` and a `${{ github.sha }}` tag.

### Notes

- The workflow uses Docker Buildx to build and push a multi-arch image (amd64 + arm64) so Apple Silicon machines will be able to pull the correct manifest.
- The workflow passes common `NEXT_PUBLIC_*` build args from secrets; set these in the repository if you want those client values baked into the production build.
- If you prefer to publish only amd64, you can edit `.github/workflows/docker-multiarch.yml` and remove `linux/arm64`.

## How It Works

1. Create and modify your project using [v0.app](https://v0.app)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository
5. GitHub Actions builds and pushes Docker images to Docker Hub
6. Use Docker Compose to run the application locally or in production

---

## Kill Switch (Danger Zone)

- The project includes an emergency kill endpoint at `POST /api/_internal/kill-switch`.
- To enable: set `KILL_SWITCH_ENABLED=true` and configure `KILL_SWITCH_SECRET` in your environment (see `.env.example`).
- To call: include header `x-kill-secret: <secret>` and header `x-kill-confirm: true` (or pass the same in the JSON body). This operation is irreversible.
- There's also a UI control in the Admin panel under **Admin → Danger** which will ask you to type the secret and confirm before running.

**Warning:** only enable this in controlled environments and keep the secret safe in your deployment platform. Never commit secrets to source control.
