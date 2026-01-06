CREATE TABLE IF NOT EXISTS messages (
  message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
  sent_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  time_sent TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  message_body TEXT NOT NULL
);

-- Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read messages from conversations they participate in
CREATE POLICY "Users can read messages from own conversations" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.conversation_id = messages.conversation_id
      AND (conversations.participant_1 = auth.uid() OR conversations.participant_2 = auth.uid())
    )
  );

-- Policy: Users can send messages in conversations they participate in
CREATE POLICY "Users can send messages in own conversations" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sent_by
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.conversation_id = messages.conversation_id
      AND (conversations.participant_1 = auth.uid() OR conversations.participant_2 = auth.uid())
    )
  );

-- Policy: Service role can do everything
CREATE POLICY "Service role full access" ON messages
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');