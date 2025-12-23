CREATE TABLE IF NOT EXISTS cities (
  city_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  country_id,
);
