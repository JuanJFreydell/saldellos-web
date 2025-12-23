create table if not exists neighborhoods (
  neighborhood_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  city_id TEXT
);