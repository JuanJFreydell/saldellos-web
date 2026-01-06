CREATE TABLE IF NOT EXISTS listings (
  listing_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT,
  price TEXT,
  create_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  subcategory_id UUID,
  title TEXT,
  status TEXT,
  thumbnail TEXT
);

-- Enable Row Level Security
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all active listings
CREATE POLICY "Anyone can read active listings" ON listings
  FOR SELECT USING (status = 'active');

-- Policy: Users can read their own listings (any status)
CREATE POLICY "Users can read own listings" ON listings
  FOR SELECT USING (auth.uid() = owner_id);

-- Policy: Users can insert their own listings
CREATE POLICY "Users can create own listings" ON listings
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Policy: Users can update their own listings
CREATE POLICY "Users can update own listings" ON listings
  FOR UPDATE USING (auth.uid() = owner_id);

-- Policy: Users can delete their own listings
CREATE POLICY "Users can delete own listings" ON listings
  FOR DELETE USING (auth.uid() = owner_id);

-- Policy: Service role can do everything
CREATE POLICY "Service role full access" ON listings
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');