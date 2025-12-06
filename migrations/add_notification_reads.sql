-- Track which notifications users have read
CREATE TABLE IF NOT EXISTS user_notification_reads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  notification_id UUID REFERENCES notifications_content(id) ON DELETE CASCADE NOT NULL,
  read_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, notification_id)
);

-- Enable RLS
ALTER TABLE user_notification_reads ENABLE ROW LEVEL SECURITY;

-- Users can view their own reads
CREATE POLICY "Users can view own notification reads" ON user_notification_reads
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own reads
CREATE POLICY "Users can insert own notification reads" ON user_notification_reads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_notification_reads_user ON user_notification_reads(user_id);
CREATE INDEX idx_notification_reads_notification ON user_notification_reads(notification_id);
