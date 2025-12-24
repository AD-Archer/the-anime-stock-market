#!/bin/sh

# Docker entrypoint script for anime-stock-market
# This script handles startup logic and environment setup

set -e

echo "🚀 Starting anime-stock-market..."

# Log environment info
echo "📋 Environment: $NODE_ENV"
echo "🔌 Port: $PORT"

# Verify required environment variables are set
# Add more as needed
REQUIRED_VARS="NEXT_PUBLIC_APPWRITE_ENDPOINT NEXT_PUBLIC_APPWRITE_PROJECT_ID APPWRITE_API_KEY"

for var in $REQUIRED_VARS; do
  eval "value=\$$var"
  if [ -z "$value" ]; then
    echo "❌ Error: Required environment variable '$var' is not set"
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
