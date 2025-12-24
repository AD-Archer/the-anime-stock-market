# Anime stock trading app

_Automatically synced with your [v0.app](https://v0.app) deployments_

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/ad-archers-projects/v0-anime-stock-trading-app)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/qEVVIfOYcvT)

## Overview

This repository will stay in sync with your deployed chats on [v0.app](https://v0.app).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.app](https://v0.app).

## Deployment

Your project is live at:

**[https://vercel.com/ad-archers-projects/v0-anime-stock-trading-app](https://vercel.com/ad-archers-projects/v0-anime-stock-trading-app)**

## Build your app

Continue building your app on:

**[https://v0.app/chat/qEVVIfOYcvT](https://v0.app/chat/qEVVIfOYcvT)**

## Local Development

### Prerequisites

- Node.js 18+
- pnpm

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/the-anime-stock-market.git
   cd the-anime-stock-market
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Run the development server:

   ```bash
   pnpm dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Docker

### Build Locally

Copy the environment values you want the client bundle to bake in (`NEXT_PUBLIC_*`) into `.env.local`, then build the image with the helper script so those variables are passed as build args:

```bash
node scripts/build-docker.mjs
```

If you prefer to run `docker build` directly, mirror the same values via `--build-arg NEXT_PUBLIC_APPWRITE_ENDPOINT=...` etc.

### Run Locally

Use the included run script so `.env.local` and other required secrets are automatically passed at runtime:

```bash
node scripts/run-docker.mjs
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

This project uses GitHub Actions for continuous integration and deployment. The workflow automatically builds and pushes Docker images to Docker Hub on every push to the `main` branch.

### Setup

1. Create a Docker Hub account and repository.

2. Add the following secrets to your GitHub repository:

   - `DOCKERHUB_USERNAME`: Your Docker Hub username
   - `DOCKERHUB_TOKEN`: Your Docker Hub access token (create one in Docker Hub settings)

3. The workflow will automatically trigger on pushes to `main` and pull requests.

## How It Works

1. Create and modify your project using [v0.app](https://v0.app)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository
5. GitHub Actions builds and pushes Docker images to Docker Hub
6. Use Docker Compose to run the application locally or in production
