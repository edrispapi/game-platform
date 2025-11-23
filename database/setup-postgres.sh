#!/bin/bash

# PostgreSQL Setup Script for Game Platform
# This script helps you set up PostgreSQL and import seed data

set -e

echo "=== PostgreSQL Setup for Game Platform ==="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  DATABASE_URL environment variable is not set"
    echo ""
    echo "Please set your PostgreSQL connection string:"
    echo "  export DATABASE_URL='postgresql://user:password@host:5432/dbname'"
    echo ""
    echo "Or for Neon/Supabase HTTP API:"
    echo "  export DATABASE_URL='https://your-project.neon.tech'"
    echo "  export DATABASE_API_KEY='your-api-key'"
    echo ""
    read -p "Enter your DATABASE_URL: " db_url
    export DATABASE_URL="$db_url"
fi

echo "✅ DATABASE_URL is set"
echo ""

# Step 1: Create schema
echo "Step 1: Creating database schema..."
if command -v psql &> /dev/null; then
    echo "Using psql to create schema..."
    psql "$DATABASE_URL" -f database/postgres-schema.sql
    echo "✅ Schema created successfully"
else
    echo "⚠️  psql not found. Please run the schema manually:"
    echo "  psql \$DATABASE_URL -f database/postgres-schema.sql"
    echo ""
    echo "Or use your database provider's SQL editor to run:"
    echo "  database/postgres-schema.sql"
    echo ""
    read -p "Press Enter after you've created the schema..."
fi

echo ""

# Step 2: Generate and import seed data
echo "Step 2: Generating and importing seed data..."
echo "This will create:"
echo "  - 100 users"
echo "  - 100 games"
echo "  - 500 reviews"
echo "  - 200 forum posts"
echo "  - 500 forum replies"
echo "  - 200 workshop items"
echo "  - 300 friend relationships"
echo "  - 100 orders"
echo ""

# Check if bun is available
if ! command -v bun &> /dev/null; then
    echo "⚠️  bun not found. Please install bun first:"
    echo "  curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

echo "Running import script..."
bun run database/import-seed-data.ts

if [ $? -eq 0 ]; then
    echo "✅ Seed data imported successfully"
else
    echo "❌ Import failed. Please check the error messages above."
    exit 1
fi

echo ""

# Step 3: Enable PostgreSQL in code
echo "Step 3: Enabling PostgreSQL in code..."
ADAPTER_FILE="worker/db/db-adapter.ts"

if [ -f "$ADAPTER_FILE" ]; then
    # Check if already enabled
    if grep -q "const USE_POSTGRES = true" "$ADAPTER_FILE"; then
        echo "✅ PostgreSQL is already enabled in $ADAPTER_FILE"
    else
        echo "Updating $ADAPTER_FILE to enable PostgreSQL..."
        # Use sed to replace the line (works on most Unix systems)
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' 's/const USE_POSTGRES = false/const USE_POSTGRES = true/' "$ADAPTER_FILE"
        else
            # Linux
            sed -i 's/const USE_POSTGRES = false/const USE_POSTGRES = true/' "$ADAPTER_FILE"
        fi
        echo "✅ PostgreSQL enabled in code"
    fi
else
    echo "⚠️  Could not find $ADAPTER_FILE"
    echo "Please manually set USE_POSTGRES = true in worker/db/db-adapter.ts"
fi

echo ""

# Step 4: Configure wrangler.toml (if it exists)
echo "Step 4: Configuring wrangler.toml..."
if [ -f "wrangler.toml" ]; then
    # Check if DATABASE_URL is already in wrangler.toml
    if grep -q "DATABASE_URL" "wrangler.toml"; then
        echo "✅ DATABASE_URL already configured in wrangler.toml"
    else
        echo "Adding DATABASE_URL to wrangler.toml..."
        # Extract just the connection string without credentials for display
        DB_DISPLAY=$(echo "$DATABASE_URL" | sed 's/:[^:]*@/:***@/')
        cat >> wrangler.toml << EOF

# PostgreSQL Configuration
[vars]
DATABASE_URL = "$DATABASE_URL"
EOF
        echo "✅ Added DATABASE_URL to wrangler.toml"
        echo "⚠️  Note: Consider using secrets for production:"
        echo "  wrangler secret put DATABASE_URL"
    fi
else
    echo "⚠️  wrangler.toml not found. Creating it..."
    cat > wrangler.toml << EOF
name = "game-platform"
main = "worker/index.ts"
compatibility_date = "2024-01-01"

# PostgreSQL Configuration
[vars]
DATABASE_URL = "$DATABASE_URL"
EOF
    echo "✅ Created wrangler.toml with DATABASE_URL"
fi

echo ""

# Summary
echo "=== Setup Complete ==="
echo ""
echo "✅ Database schema created"
echo "✅ Seed data imported (100 games, 100 users, etc.)"
echo "✅ PostgreSQL enabled in code"
echo "✅ Configuration updated"
echo ""
echo "Next steps:"
echo "1. Start the development server:"
echo "   bun dev"
echo ""
echo "2. Test the API:"
echo "   curl http://localhost:8787/api/games"
echo ""
echo "3. Visit the store page in your browser"
echo ""
echo "Your platform is now using PostgreSQL with 100 seed games! 🎮"

