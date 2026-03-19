default: list

# Show available recipes when running `just` with no arguments.
list:
  @just --list

dev:
  infisical run -- pnpm dev

start:
  infisical run -- pnpm start

appwrite-setup:
  infisical run -- pnpm appwrite:setup

seed:
  infisical run -- pnpm seed

backfill-activity:
  infisical run -- pnpm backfill:activity

indexnow-submit:
  infisical run -- pnpm indexnow:submit

appwrite-push-kofi:
  infisical run -- pnpm appwritepush:kofi

appwrite-push-drift:
  infisical run -- pnpm appwritepush:drift

appwrite-push-sitemap:
  infisical run -- pnpm appwritepush:sitemap

appwrite-push-weekly-engagement:
  infisical run -- pnpm appwritepush:weekly-engagement

appwrite-push-daily-trade-digest:
  infisical run -- pnpm appwritepush:daily-trade-digest

docker-build:
  infisical run -- pnpm docker:build

docker-run:
  infisical run -- pnpm docker:run

docker-stop:
  infisical run -- pnpm docker:stop
