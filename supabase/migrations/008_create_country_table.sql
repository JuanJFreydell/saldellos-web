CREATE TABLE IF NOT EXISTS countries (
  country_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT
);
