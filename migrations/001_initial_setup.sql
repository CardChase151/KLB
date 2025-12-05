-- KLB Database Setup
-- Run this in Supabase SQL Editor

-- =============================================
-- USERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  role TEXT DEFAULT 'user',
  can_create_chats BOOLEAN DEFAULT false,
  can_send_messages BOOLEAN DEFAULT true,
  team_inspire_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON users;
DROP POLICY IF EXISTS "Users full access" ON users;

-- Simple policy: authenticated users can read/update their own row
-- Admins handled via security definer functions
CREATE POLICY "Users full access" ON users
  FOR ALL USING (auth.uid() = id);

-- Allow insert for new users (trigger creates profile)
CREATE POLICY "Allow insert for authenticated users" ON users
  FOR INSERT WITH CHECK (true);

-- Function to check if current user is admin (security definer bypasses RLS)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all users (for admin)
CREATE OR REPLACE FUNCTION get_all_users()
RETURNS SETOF users AS $$
BEGIN
  IF is_admin() THEN
    RETURN QUERY SELECT * FROM users ORDER BY created_at DESC;
  ELSE
    RETURN QUERY SELECT * FROM users WHERE id = auth.uid();
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- HOME CONTENT TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS home_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  link_title TEXT,
  image_url TEXT,
  category TEXT DEFAULT 'General',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE home_content ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can read active content" ON home_content;
DROP POLICY IF EXISTS "Admins can manage home content" ON home_content;

-- Anyone authenticated can read active content
CREATE POLICY "Authenticated users can read active content" ON home_content
  FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

-- Admins can do everything (using security definer function)
CREATE POLICY "Admins can manage home content" ON home_content
  FOR ALL USING (is_admin());

-- =============================================
-- FUNCTION: Get user count (for admin dashboard)
-- =============================================
CREATE OR REPLACE FUNCTION get_user_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM users);
END;
$$;

-- =============================================
-- TRIGGER: Auto-update updated_at
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS home_content_updated_at ON home_content;
CREATE TRIGGER home_content_updated_at
  BEFORE UPDATE ON home_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- TRIGGER: Auto-create user profile on signup
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- OPTIONAL: Create your first admin user
-- Replace 'YOUR_USER_ID' with your auth.users id after signing up
-- =============================================
-- UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';

-- =============================================
-- NEW REP START CONTENT TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS newrepstart_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  link_title TEXT,
  image_url TEXT,
  use_logo BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE newrepstart_content ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read active content
CREATE POLICY "Authenticated users can read active newrepstart content" ON newrepstart_content
  FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

-- Admins can do everything
CREATE POLICY "Admins can manage newrepstart content" ON newrepstart_content
  FOR ALL USING (is_admin());

-- Trigger for updated_at
DROP TRIGGER IF EXISTS newrepstart_content_updated_at ON newrepstart_content;
CREATE TRIGGER newrepstart_content_updated_at
  BEFORE UPDATE ON newrepstart_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- TRAINING CATEGORIES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS training_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE training_categories ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read active categories
CREATE POLICY "Authenticated users can read active training categories" ON training_categories
  FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

-- Admins can do everything
CREATE POLICY "Admins can manage training categories" ON training_categories
  FOR ALL USING (is_admin());

-- Trigger for updated_at
DROP TRIGGER IF EXISTS training_categories_updated_at ON training_categories;
CREATE TRIGGER training_categories_updated_at
  BEFORE UPDATE ON training_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- TRAINING CONTENT TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS training_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  link_title TEXT,
  image_url TEXT,
  use_logo BOOLEAN DEFAULT false,
  category TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE training_content ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read active content
CREATE POLICY "Authenticated users can read active training content" ON training_content
  FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

-- Admins can do everything
CREATE POLICY "Admins can manage training content" ON training_content
  FOR ALL USING (is_admin());

-- Trigger for updated_at
DROP TRIGGER IF EXISTS training_content_updated_at ON training_content;
CREATE TRIGGER training_content_updated_at
  BEFORE UPDATE ON training_content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
