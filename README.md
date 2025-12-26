# Anime Stock Market

Lightweight Next.js app that simulates anime-themed stock trading with real-time price updates, player portfolios, messaging, and community features.
<img width="1430" height="884" alt="Screenshot 2025-12-24 at 9 27 08 PM" src="https://github.com/user-attachments/assets/9a46a2df-91f8-4662-b905-9cc18e1fab4a" />
<img width="1428" height="876" alt="Screenshot 2025-12-24 at 9 26 58 PM" src="https://github.com/user-attachments/assets/46059dbe-3853-44a7-b327-cc7fb20eb055" />
<img width="1390" height="884" alt="Screenshot 2025-12-24 at 9 28 30 PM" src="https://github.com/user-attachments/assets/a19870a8-b4e8-4e6a-9eca-2958d105a9ef" />
---

## Key features ✨

- Real-time trading: buy/sell flows, live price updates, market ticker
- Character & anime pages with per-item metadata and Open Graph tags
- Transactions & price history with full activity tracking
- User portfolios, leaderboards, and notifications
- Admin tools: reports, moderation, buyback workflows
- Lightweight analytics integration (Plausible)

---

## Quick start — Development (recommended)

Requirements:

- Node.js 18+
- pnpm

Get started locally:

```bash
# clone and install
git clone https://github.com/AD-Archer/the-anime-stock-market.git
cd the-anime-stock-market
pnpm install

# copy example env and edit .env.local with Appwrite credentials
cp .env.example .env.local
# Required (at minimum):
# NEXT_PUBLIC_APPWRITE_ENDPOINT, NEXT_PUBLIC_APPWRITE_PROJECT_ID
# APPWRITE_API_KEY (server-only, for setup/seed), APPWRITE_DATABASE_ID

# start dev server
pnpm dev
```

Open http://localhost:3000

## Deployment

### Build & Start

- Build: `pnpm build`
- Start (production): `pnpm start`

Notes:

- Set server-side environment variables (for example, `APPWRITE_API_KEY`, `APPWRITE_DATABASE_ID`) in your production environment; do not commit secrets.
- Client-visible env vars (prefixed with `NEXT_PUBLIC_`) must be set at build time so they can be inlined into the client bundle.

---

## Analytics (Plausible) 📊

This project includes a lightweight client-side Plausible initializer (`components/analytics/plausible-init.tsx`). Configure the following env vars in `.env.local`:

```env
# domain used by Plausible (optional - derived from NEXT_PUBLIC_SITE_URL if not set)
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=www.animestockmarket.tech
# optional Plausible proxy/API host
NEXT_PUBLIC_PLAUSIBLE_API_HOST=https://plausible.adarcher.app
```

Notes:

- The tracker is only loaded on the client. The initializer will derive the Plausible domain from `NEXT_PUBLIC_SITE_URL` if `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is not set.
- If you self-host Plausible behind a proxy, set `NEXT_PUBLIC_PLAUSIBLE_API_HOST` to the proxy endpoint.
- For local dev, you can set `captureOnLocalhost` inside the tracker options if you want to capture events from localhost (not recommended for production).

---

### Adding a Database

When you're ready to add a database, follow the Appwrite setup below or configure your preferred database and provide the necessary environment variables.

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

### Environment variables

Set your local variables in `.env.local`. Common variables used by the app:

```env
# client-visible (must be present at build-time)
NEXT_PUBLIC_APPWRITE_ENDPOINT=
NEXT_PUBLIC_APPWRITE_PROJECT_ID=
NEXT_PUBLIC_SITE_URL=

# server-only
APPWRITE_API_KEY=
APPWRITE_DATABASE_ID=
```

Notes:

- Keep server secrets out of source control and secure them in your deployment platform.
- `NEXT_PUBLIC_` variables are inlined at build time and are visible to the client.

---

## Debugging & troubleshooting

- If pages show missing data, verify `.env.local` and the `NEXT_PUBLIC_*` values.
- To inspect runtime env presence in dev, enable `ENABLE_ENV_DEBUG=true` and visit `/api/_internal/env-check`.
- If activity counters look out of sync, run the backfill script:

```bash
pnpm run backfill:activity
```

- Use `pnpm lint` and `pnpm run typecheck` when diagnosing TypeScript or linting issues.

---

## Contributing

- Create an issue for bugs or proposals.
- Open a PR from a feature branch to `main`. Include a brief description and test steps.
- Run `pnpm lint`, `pnpm run typecheck`, and add tests where appropriate.

---

## License

MIT

---

If you'd like, I can add a `CONTRIBUTING.md` with a development checklist or a short troubleshooting snippet for Appwrite CLI commands — say the word and I'll add it.
