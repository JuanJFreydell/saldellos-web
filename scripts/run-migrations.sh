#!/bin/bash
# Run Supabase migrations
# Usage: ./scripts/run-migrations.sh

# Don't use set -e here because we need to handle errors manually

echo "🚀 Running Supabase migrations..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first."
    echo "   Install with: brew install supabase/tap/supabase"
    exit 1
fi

# Check if we're in the project root
if [ ! -d "supabase/migrations" ]; then
    echo "❌ Error: supabase/migrations directory not found."
    echo "   Please run this script from the project root."
    exit 1
fi

# Check if user is logged in to Supabase
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "🔐 Checking Supabase authentication..."
    if ! supabase projects list &>/dev/null; then
        echo "❌ Not authenticated with Supabase."
        echo "   Please run: supabase login"
        echo "   This will open your browser to authenticate."
        echo ""
        read -p "Would you like to login now? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            supabase login
        else
            echo "❌ Authentication required. Exiting."
            exit 1
        fi
    fi
fi

# Check if project is linked
LINKED=false
if [ -f ".supabase/config.toml" ] || [ -f "supabase/.temp/project-ref" ]; then
    # Try to verify link by attempting a simple operation
    if supabase projects list &>/dev/null 2>&1; then
        LINKED=true
    fi
fi

if [ "$LINKED" = false ]; then
    echo "📎 Project not linked. Linking to Supabase..."
    echo "   You'll need to provide your project reference."
    echo "   Find it in: Supabase Dashboard → Settings → General → Reference ID"
    echo ""
    read -p "Enter your Supabase project reference: " PROJECT_REF
    if [ -z "$PROJECT_REF" ]; then
        echo "❌ Project reference is required."
        exit 1
    fi
    
    echo "   Linking project..."
    if supabase link --project-ref "$PROJECT_REF"; then
        echo "   ✅ Project linked successfully"
        LINKED=true
    else
        echo "❌ Failed to link project. Please check your project reference and try again."
        exit 1
    fi
fi

# Verify we can access the project (but don't fail if status doesn't work)
echo "   Verifying project connection..."
if supabase projects list &>/dev/null 2>&1; then
    echo "   ✅ Project connection verified"
else
    echo "   ⚠️  Could not verify connection, but continuing anyway..."
fi

# Drop all existing tables and functions (in correct order to handle dependencies)
echo "🗑️  Dropping all existing tables and functions..."
echo "   Using supabase db reset to clean database..."

# Use db reset to drop everything and start fresh
# This will drop all tables, functions, triggers, etc.
echo "   Resetting database (this will drop all data)..."
if supabase db reset --linked; then
    echo "   ✅ Database reset successfully"
else
    echo "⚠️  Could not reset database automatically."
    echo "   This might be because there are no migrations to reset, or there was an error."
    echo "   Continuing with migration push..."
fi

# Push migrations to remote database
echo "📤 Pushing migrations to database..."
if ! supabase db push; then
    echo "❌ Failed to push migrations. Please check the error above."
    exit 1
fi

echo ""
echo "✅ Migrations completed successfully!"

