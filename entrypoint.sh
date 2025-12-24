#!/bin/sh

# Docker entrypoint script for anime-stock-market
# This script handles startup logic and environment setup

set -e

echo "🚀 Starting anime-stock-market..."

# Load .env file if it exists (mounted volume or copied into container)
# This allows users to supply their own dotenv file
if [ -f /app/.env ]; then
  echo "📄 Loading environment variables from /app/.env"
  set -a
  . /app/.env
  set +a
elif [ -f /.env ]; then
  echo "📄 Loading environment variables from /.env"
  set -a
  . /.env
  set +a
fi

# Log environment info
echo "📋 Environment: $NODE_ENV"
echo "🔌 Port: $PORT"

# Verify required environment variables are set
# Note: We prefer non-public variable names (APPWRITE_*) but support NEXT_PUBLIC_* for backwards compatibility
# The API route will expose only what's needed to the client at runtime
REQUIRED_VARS="APPWRITE_API_KEY"

for var in $REQUIRED_VARS; do
  eval "value=\$$var"
  if [ -z "$value" ]; then
    echo "❌ Error: Required environment variable '$var' is not set"
    echo "   Please provide it via:"
    echo "   - --env-file flag: docker run --env-file .env.local ..."
    echo "   - -e flag: docker run -e $var=value ..."
    echo "   - Mount .env file: docker run -v \$(pwd)/.env:/app/.env ..."
    exit 1
  fi
done

echo "✅ All required environment variables are set"
echo ""

# Uncomment and add database migrations if needed
# echo "🔄 Running database migrations..."
# pnpm run migrate
# echo "✅ Migrations complete"
# echo ""

# Start the application
echo "🎬 Starting Next.js server..."
exec node server.js
