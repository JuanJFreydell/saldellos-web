CREATE TABLE IF NOT EXISTS listings_meta_data (
  listing_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  thumbnail TEXT,
  coordinates TEXT,
  price TEXT,
  listing_date TIMESTAMP,
  status TEXT,
  category TEXT
);