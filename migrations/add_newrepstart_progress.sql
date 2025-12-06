-- User progress tracking for 10 Day Launch (newrepstart)
CREATE TABLE IF NOT EXISTS user_newrepstart_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content_id UUID REFERENCES newrepstart_content(id) ON DELETE CASCADE NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, content_id)
);

-- Enable RLS
ALTER TABLE user_newrepstart_progress ENABLE ROW LEVEL SECURITY;

-- Users can view their own progress
CREATE POLICY "Users can view own progress" ON user_newrepstart_progress
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own progress
CREATE POLICY "Users can insert own progress" ON user_newrepstart_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view all progress
CREATE POLICY "Admins can view all progress" ON user_newrepstart_progress
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Index for fast lookups
CREATE INDEX idx_newrepstart_progress_user ON user_newrepstart_progress(user_id);
CREATE INDEX idx_newrepstart_progress_content ON user_newrepstart_progress(content_id);
