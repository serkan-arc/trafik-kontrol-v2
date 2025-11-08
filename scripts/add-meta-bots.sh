#!/bin/bash

# Script: Add Meta/Facebook Bot Patterns
# Description: Run migration 010 to add Meta bot patterns to the database
# Usage: ./scripts/add-meta-bots.sh

set -e

echo "🤖 Adding Meta/Facebook Bot Patterns..."
echo "========================================"

# Database connection details (update these with your production credentials)
DB_HOST="${DB_HOST:-207.180.204.60}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-dtektracking}"
DB_USER="${DB_USER:-dtektracking_user}"

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ Error: psql is not installed"
    echo "Please install PostgreSQL client tools"
    exit 1
fi

# Run the migration
echo "📝 Running migration 010..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f migrations/010_add_meta_bot_patterns.sql

if [ $? -eq 0 ]; then
    echo "✅ Meta bot patterns added successfully!"
    echo ""
    echo "Added patterns:"
    echo "  ✓ Facebookbot (External Hit)"
    echo "  ✓ Facebook Catalog"
    echo "  ✓ Facebook App"
    echo "  ✓ Facebook Platform"
    echo "  ✓ Instagram Bot"
    echo "  ✓ WhatsApp Bot"
    echo "  ✓ Meta AI Bot"
    echo "  ✓ FacebookBot Extended"
    echo ""
    echo "🎯 Bot detection system is now complete!"
else
    echo "❌ Error: Migration failed"
    exit 1
fi
