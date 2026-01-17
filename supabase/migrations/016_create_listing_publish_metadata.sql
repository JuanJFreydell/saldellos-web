-- Create metadata table to track publish tables
CREATE TABLE IF NOT EXISTS listing_publish_metadata (
  country_id UUID NOT NULL,
  category_id UUID NOT NULL,
  table_name TEXT NOT NULL,
  last_rebuilt_at TIMESTAMP WITH TIME ZONE,
  rebuild_in_progress BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (country_id, category_id)
);

-- Enable Row Level Security
ALTER TABLE listing_publish_metadata ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything
CREATE POLICY "Service role full access" ON listing_publish_metadata
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Note: Individual publish tables (listing_publish_{country_id}_{category_id}) 
-- will be created dynamically via the application code
