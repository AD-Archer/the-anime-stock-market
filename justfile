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
