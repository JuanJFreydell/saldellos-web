CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'active',
  join_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  first_names TEXT,
  last_names TEXT,
  email TEXT UNIQUE NOT NULL,
  nextauth_id TEXT UNIQUE
);

-- Enable Row Level Security to protect the table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Since you're using NextAuth (not Supabase Auth), you have two options:
-- Option 1: Block all public access (recommended for NextAuth)
-- Use server-side Supabase client with SECRET key for all operations
CREATE POLICY "Block all public access" ON users
  FOR ALL USING (false);

-- Option 2: If you need some public read access, uncomment this instead:
-- CREATE POLICY "Public read access" ON users
--   FOR SELECT USING (true);