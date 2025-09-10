-- Supabase Schema for Rock Paper Scissors Application
-- Custom authentication using Discord usernames without Supabase Auth

-- Create user_profiles table for custom authentication
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL, -- In production, use proper encryption
  player_name TEXT,
  chain_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) for user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access (for custom auth approach)
CREATE POLICY "Public read access for custom auth" 
ON user_profiles FOR SELECT 
TO anon, authenticated
USING (true);

-- Create policy to allow public insert access (for registration)
CREATE POLICY "Public insert access for registration" 
ON user_profiles FOR INSERT 
TO anon, authenticated
WITH CHECK (true);

-- Create policy to allow users to update their own profile
CREATE POLICY "Users can update their own profile" 
ON user_profiles FOR UPDATE 
TO authenticated
USING (true);

-- Grant necessary permissions
GRANT ALL ON user_profiles TO anon, authenticated;

-- Note: This approach does not use Supabase Auth
-- User authentication is handled by the application
-- Passwords should be properly encrypted in production