CREATE TABLE IF NOT EXISTS conversations (
  conversation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1 TEXT,
  participant_2 TEXT,
  listing_id TEXT,
);