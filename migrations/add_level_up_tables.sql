-- Level Up Feature Tables
-- Run this in Supabase SQL Editor

-- ============================================
-- LEVELS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_number INTEGER NOT NULL UNIQUE,
  name TEXT, -- Optional name like "Foundation" (can be null, will show as "Level 1")
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LEVEL ITEMS TABLE (content within levels)
-- ============================================
CREATE TABLE IF NOT EXISTS level_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id UUID REFERENCES levels(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT NOT NULL CHECK (content_type IN ('video', 'audio', 'pdf', 'presentation', 'quiz')),
  file_url TEXT, -- For video/audio/pdf/presentation files
  image_url TEXT, -- Thumbnail image
  use_logo BOOLEAN DEFAULT false, -- Use KLB logo instead of image
  pass_threshold INTEGER DEFAULT 80 CHECK (pass_threshold >= 0 AND pass_threshold <= 100), -- % required to complete
  duration_seconds INTEGER, -- For video/audio - total duration for tracking
  total_pages INTEGER, -- For PDF - total pages
  total_slides INTEGER, -- For presentation - total slides
  quiz_id UUID, -- Reference to quiz if content_type is 'quiz'
  sort_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false, -- Draft vs live
  published_at TIMESTAMPTZ, -- When it went live (for auto-complete logic)
  archived_at TIMESTAMPTZ, -- Soft delete timestamp
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- QUIZZES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  pass_threshold INTEGER DEFAULT 80 CHECK (pass_threshold >= 0 AND pass_threshold <= 100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- QUIZ QUESTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- QUIZ OPTIONS TABLE (multiple choice answers)
-- ============================================
CREATE TABLE IF NOT EXISTS quiz_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES quiz_questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USER PROGRESS TABLE (tracks completion per item per user)
-- ============================================
CREATE TABLE IF NOT EXISTS user_level_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  level_item_id UUID REFERENCES level_items(id) ON DELETE CASCADE,
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  -- For video/audio tracking
  last_position_seconds INTEGER DEFAULT 0,
  -- For PDF tracking
  pages_viewed INTEGER[] DEFAULT '{}', -- Array of page numbers viewed
  max_page_reached INTEGER DEFAULT 0,
  -- For presentation tracking
  slides_viewed INTEGER[] DEFAULT '{}', -- Array of slide indices viewed
  max_slide_reached INTEGER DEFAULT 0,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, level_item_id)
);

-- ============================================
-- USER QUIZ ATTEMPTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  level_item_id UUID REFERENCES level_items(id) ON DELETE CASCADE,
  score_percent INTEGER CHECK (score_percent >= 0 AND score_percent <= 100),
  passed BOOLEAN DEFAULT false,
  answers JSONB, -- Store user's answers: [{question_id, selected_option_id, is_correct}]
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USER LEVEL COMPLETION TABLE (tracks which levels are unlocked/completed)
-- ============================================
CREATE TABLE IF NOT EXISTS user_level_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  level_id UUID REFERENCES levels(id) ON DELETE CASCADE,
  is_unlocked BOOLEAN DEFAULT false,
  is_completed BOOLEAN DEFAULT false,
  unlocked_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, level_id)
);

-- ============================================
-- CERTIFICATE SETTINGS TABLE (admin configurable)
-- ============================================
CREATE TABLE IF NOT EXISTS certificate_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL, -- Custom text under "Congratulations [Name]"
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USER CERTIFICATES TABLE (issued certificates)
-- ============================================
CREATE TABLE IF NOT EXISTS user_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  certificate_number TEXT UNIQUE, -- For verification
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  certificate_description TEXT, -- Snapshot of description at time of issue
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PROGRESS RESET LOG TABLE (audit trail)
-- ============================================
CREATE TABLE IF NOT EXISTS progress_reset_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- User whose progress was reset
  reset_by UUID REFERENCES users(id), -- Admin or self who initiated reset
  reset_type TEXT CHECK (reset_type IN ('full', 'level', 'item')),
  level_id UUID REFERENCES levels(id), -- If level-specific reset
  level_item_id UUID REFERENCES level_items(id), -- If item-specific reset
  reset_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_level_items_level_id ON level_items(level_id);
CREATE INDEX IF NOT EXISTS idx_level_items_published ON level_items(is_published, is_active);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_options_question_id ON quiz_options(question_id);
CREATE INDEX IF NOT EXISTS idx_user_level_progress_user ON user_level_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_level_progress_item ON user_level_progress(level_item_id);
CREATE INDEX IF NOT EXISTS idx_user_quiz_attempts_user ON user_quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quiz_attempts_quiz ON user_quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_user_level_status_user ON user_level_status(user_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE level_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_level_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_level_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_reset_log ENABLE ROW LEVEL SECURITY;

-- Levels: Anyone can read active levels
CREATE POLICY "Anyone can read active levels" ON levels
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage levels" ON levels
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- Level Items: Anyone can read published active items
CREATE POLICY "Anyone can read published level items" ON level_items
  FOR SELECT USING (is_published = true AND is_active = true AND archived_at IS NULL);

CREATE POLICY "Admins can manage level items" ON level_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- Quizzes: Anyone can read active quizzes
CREATE POLICY "Anyone can read active quizzes" ON quizzes
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage quizzes" ON quizzes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- Quiz Questions: Anyone can read active questions
CREATE POLICY "Anyone can read active quiz questions" ON quiz_questions
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage quiz questions" ON quiz_questions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- Quiz Options: Anyone can read options
CREATE POLICY "Anyone can read quiz options" ON quiz_options
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage quiz options" ON quiz_options
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- User Progress: Users can read/write their own progress
CREATE POLICY "Users can manage their own progress" ON user_level_progress
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can read all progress" ON user_level_progress
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Admins can reset progress" ON user_level_progress
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- Quiz Attempts: Users can manage their own attempts
CREATE POLICY "Users can manage their own quiz attempts" ON user_quiz_attempts
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can read all quiz attempts" ON user_quiz_attempts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- User Level Status: Users can read/write their own status
CREATE POLICY "Users can manage their own level status" ON user_level_status
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Admins can read all level status" ON user_level_status
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- Certificate Settings: Anyone can read, admins can manage
CREATE POLICY "Anyone can read certificate settings" ON certificate_settings
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage certificate settings" ON certificate_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- User Certificates: Users can read their own certificates
CREATE POLICY "Users can read their own certificates" ON user_certificates
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own certificates" ON user_certificates
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can read all certificates" ON user_certificates
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- Progress Reset Log: Admins only
CREATE POLICY "Admins can manage reset log" ON progress_reset_log
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Users can see their own resets" ON progress_reset_log
  FOR SELECT USING (user_id = auth.uid());

-- ============================================
-- STORAGE BUCKET FOR LEVEL FILES
-- ============================================
-- Run these in Supabase Dashboard > Storage

-- Create bucket for level content files (videos, audio, pdfs, presentations)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('level-files', 'level-files', true);

-- Storage policies (run in SQL editor):
-- CREATE POLICY "Anyone can read level files" ON storage.objects
--   FOR SELECT USING (bucket_id = 'level-files');

-- CREATE POLICY "Admins can upload level files" ON storage.objects
--   FOR INSERT WITH CHECK (
--     bucket_id = 'level-files' AND
--     EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
--   );

-- CREATE POLICY "Admins can update level files" ON storage.objects
--   FOR UPDATE USING (
--     bucket_id = 'level-files' AND
--     EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
--   );

-- CREATE POLICY "Admins can delete level files" ON storage.objects
--   FOR DELETE USING (
--     bucket_id = 'level-files' AND
--     EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
--   );

-- ============================================
-- INITIAL DATA: Create Level 1 to start
-- ============================================
INSERT INTO levels (level_number, name, description, sort_order)
VALUES (1, NULL, 'Your journey begins here', 1)
ON CONFLICT (level_number) DO NOTHING;

-- Insert default certificate settings
INSERT INTO certificate_settings (description)
VALUES ('has successfully completed all levels of the Kingdom Legacy Builders Training Program.')
ON CONFLICT DO NOTHING;
