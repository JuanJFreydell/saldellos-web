CREATE TABLE IF NOT EXISTS listings (
  listing_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id,
  title TEXT,
  description TEXT,
  neighborhood_id TEXT,
  listing_date TIMESTAMP,
  number_of_prints,
  number_of_visits,
  status TEXT NOT NULL DEFAULT 'active'
);
