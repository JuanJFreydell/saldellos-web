CREATE TABLE IF NOT EXISTS messages (
  message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id TEXT,
  sent_by TEXT,
  time_sent TEXT
);