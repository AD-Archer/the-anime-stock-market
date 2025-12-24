#!/bin/sh

# Docker entrypoint script for anime-stock-market
# This script handles startup logic and environment setup

set -e

echo "🚀 Starting anime-stock-market..."

# Load .env file if it exists (mounted volume or copied into container)
# This allows users to supply their own dotenv file. Prefer `.env.local` if
# present since that's the canonical local file used during development.
if [ -r /app/.env.local ]; then
  echo "📄 Loading environment variables from /app/.env.local"
  set -a
  . /app/.env.local
  set +a
elif [ -r /app/.env ]; then
  echo "📄 Loading environment variables from /app/.env"
  set -a
  . /app/.env
  set +a
elif [ -r /.env ]; then
  echo "📄 Loading environment variables from /.env"
  set -a
  . /.env
  set +a
else
  # No dotenv file present. That's fine if variables are provided via Docker
  # runtime (e.g. `--env-file` or `-e`). Check if we at least have any key
  # that indicates envs were supplied and print a clearer message.
  has_env=false
  for key in APPWRITE_ENDPOINT APPWRITE_PROJECT_ID APPWRITE_API_KEY APPWRITE_DATABASE_ID; do
    eval "val=\$$key"
    if [ -n "$val" ]; then
      has_env=true
      break
    fi
  done

  if [ "$has_env" = true ]; then
    echo "ℹ️  No dotenv file found, but required environment variables appear to be set via Docker environment (--env-file or -e)."
  else
    echo "ℹ️  No dotenv file found (checked /app/.env.local, /app/.env, /.env)."
    echo "   If you're mounting a file into the container, ensure it's readable by the container user (uid: 1001)."
  fi
fi

# Log environment info
echo "📋 Environment: $NODE_ENV"
echo "🔌 Port: $PORT"

# Verify required environment variables are set
# Note: We prefer non-public variable names (APPWRITE_*) but support NEXT_PUBLIC_* for backwards compatibility
# The API route will expose only what's needed to the client at runtime
# You may override REQUIRED_VARS via an env var (comma or space separated), e.g.
# REQUIRED_VARS="APPWRITE_API_KEY SMTP_HOST SMTP_USER SMTP_PASS"
: "${REQUIRED_VARS:=APPWRITE_API_KEY}"
# Normalize commas to spaces
REQUIRED_VARS=$(echo "$REQUIRED_VARS" | tr ',' ' ')

missing=""
for var in $REQUIRED_VARS; do
  # Avoid printing values - just check presence
  value="$(eval echo "\$$var")"
  if [ -z "$value" ]; then
    missing="$missing $var"
    echo "❌ Error: Required environment variable '$var' is not set"
  fi
done

if [ -n "$missing" ]; then
  echo ""
  echo "   Please provide them via:"
  echo "   - --env-file flag: docker run --env-file .env.local ..."
  echo "   - -e flag: docker run -e VAR=value ..."
  echo "   - Mount .env file: docker run -v \$(pwd)/.env:/app/.env ..."
  exit 1
fi

echo "✅ All required environment variables are set"

# Report Appwrite DB exposure state (do not print the value)
if [ -n "$APPWRITE_DATABASE_ID" ]; then
  if [ "$EXPOSE_APPWRITE_DATABASE_ID" = "true" ]; then
    echo "🔓 APPWRITE_DATABASE_ID is present and will be exposed to clients (EXPOSE_APPWRITE_DATABASE_ID=true)."
  else
    echo "🔒 APPWRITE_DATABASE_ID is present (server-only). To expose it to the client set EXPOSE_APPWRITE_DATABASE_ID=true"
  fi
fi

echo ""

# Uncomment and add database migrations if needed
# echo "🔄 Running database migrations..."
# pnpm run migrate
# echo "✅ Migrations complete"
# echo ""

# Start the application
echo "🎬 Starting Next.js server..."
exec node server.js
