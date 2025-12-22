# Supabase Schema Setup

This directory contains Supabase migrations and type definitions.

## Running the Migration

### Option 1: Using Supabase CLI (Recommended)

1. Install Supabase CLI if you haven't already:
   ```bash
   npm install -g supabase
   ```

2. Link your project to Supabase:
   ```bash
   supabase link --project-ref your-project-ref
   ```

3. Run the migration:
   ```bash
   supabase db push
   ```

### Option 2: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `migrations/001_create_users_table.sql`
4. Run the SQL query

### Option 3: Using Supabase Client (Programmatically)

You can also run migrations programmatically using the Supabase Management API, though the CLI or dashboard methods are recommended.

## Users Table Schema

The `users` table includes the following fields:

- `user_id` (UUID, Primary Key) - Auto-generated unique identifier
- `status` (TEXT) - User status (defaults to 'active')
- `join_date` (TIMESTAMP) - Date when user joined (defaults to current timestamp)
- `first_names` (TEXT, nullable) - User's first names
- `last_names` (TEXT, nullable) - User's last names
- `created_at` (TIMESTAMP) - Auto-managed creation timestamp
- `updated_at` (TIMESTAMP) - Auto-updated modification timestamp

## TypeScript Types

Type definitions are available in `types/users.ts` for use in your Next.js application.

