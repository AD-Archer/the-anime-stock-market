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

docker-build:
  infisical run -- pnpm docker:build

docker-run:
  infisical run -- pnpm docker:run

docker-stop:
  infisical run -- pnpm docker:stop
