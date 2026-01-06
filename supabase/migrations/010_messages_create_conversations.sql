CREATE TABLE IF NOT EXISTS conversations (
  conversation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant_2 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT different_participants CHECK (participant_1 != participant_2)
);

-- Enable Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read conversations they participate in
CREATE POLICY "Users can read own conversations" ON conversations
  FOR SELECT USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- Policy: Users can create conversations where they are a participant
CREATE POLICY "Users can create conversations" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- Policy: Service role can do everything
CREATE POLICY "Service role full access" ON conversations
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');