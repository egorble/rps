# Supabase Migration Guide

This guide explains how to migrate the Rock Paper Scissors application from the custom Node.js backend to Supabase with custom authentication.

## What You Need From Supabase

1. **Supabase Project**: Create a new project in your Supabase dashboard
2. **Project URL**: Found in your Supabase project settings
3. **API Keys**: 
   - Anon Key (public) for client-side operations

## Database Schema

Create the following table in your Supabase SQL editor:

### User Profiles Table (Custom Authentication)
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  player_name TEXT,
  chain_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Environment Variables

Create a `.env` file in your client directory with the following variables:

```
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Custom Authentication Approach

Instead of using Supabase Auth, this implementation uses a custom authentication system:
- Users authenticate with Discord username and password
- Passwords are stored directly in the database (hashed in the application)
- No email or phone numbers are required
- User data is stored in the `user_profiles` table

## Changes Made

### 1. Custom Authentication
- Replaced Supabase Auth with custom authentication using Discord usernames
- Updated AuthModal to handle custom authentication flow
- Modified user data storage to use direct database access

### 2. Data Storage
- Moved from SQLite to Supabase PostgreSQL database
- Updated chain ID storage to use direct database updates

## Installation

1. Install Supabase client:
   ```
   npm install @supabase/supabase-js
   ```

2. Create `.env` file with your Supabase credentials

3. Run the application:
   ```
   npm start
   ```

## Benefits of Migration

1. **Scalability**: Supabase provides a fully managed backend that scales automatically
2. **Database**: PostgreSQL with automatic backups and scaling
3. **Ecosystem**: Rich ecosystem of tools and integrations
4. **No Email Required**: Uses Discord usernames directly without email or phone

## Security Notes

**Important**: The current implementation uses a simple hash function for passwords. In production, you should:
- Use proper password encryption (bcrypt, scrypt, or Argon2)
- Implement proper security policies
- Add rate limiting for login attempts
- Use HTTPS for all communications

## Next Steps

1. Set up Supabase project and get credentials
2. Create database tables using the provided SQL
3. Configure environment variables
4. Test the application