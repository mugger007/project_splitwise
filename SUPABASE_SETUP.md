# Supabase Setup Guide

## Overview

Data persists to PostgreSQL database via Supabase instead of localStorage. User authentication required.

## Prerequisites

- Supabase account (free at https://supabase.com)
- npm/node installed

## Steps

### 1. Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Enter project name, password, region
4. Wait for provisioning (~2 min)
5. Copy **Project URL** and **Anon Key** from Settings → API

### 2. Load Database Schema

#### Option A: Via Supabase Dashboard (Easy)

1. In Supabase dashboard, go to SQL Editor
2. Click "New Query"
3. Copy entire content from `supabase/migrations/001_init_schema.sql`
4. Paste into query editor
5. Click "Run"
6. Confirm tables created: Settings → Database → Tables

#### Option B: Via CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to project
supabase link --project-id your_project_id

# Apply migrations
supabase migration up
```

### 3. Configure Environment Variables

```bash
# Copy template
cp .env.local.example .env.local

# Edit .env.local with your Supabase credentials:
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxx
```

**Keys:**
- `NEXT_PUBLIC_SUPABASE_URL`: Public (safe to expose)
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Public (designed for client-side, enforces RLS)

Publishable Key respects Row Level Security policies automatically.

### 4. Install Dependencies

```bash
npm install
```

### 5. Test Locally

```bash
npm run dev
# Visit http://localhost:3000
```

## Database Schema

- **trips**: Trip metadata (name, currency) - one per user per trip
- **travelers**: Trip participants (linked to trip)
- **expenses**: Expense records (linked to trip)
- **expense_shares**: Split breakdown per expense

All tables have Row Level Security (RLS) - users can only access their own trips.

## Security Architecture

**Publishable Key + Row Level Security (RLS)**

1. **Client (Browser)**
   - Uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - Calls API routes (`/api/trips/load`, `/api/trips/save`)
   - Queries automatically filtered by RLS policies

2. **API Routes (Server)**
   - Same publishable key (no secrets needed)
   - Requests enforced by RLS policies
   - User can only see/modify own data

3. **Database (Supabase)**
   - RLS policies enforce `trip.user_id = auth.uid()`
   - Cross-user data access impossible
   - Publishable Key acts as trusted client

## API Routes

- `POST /api/trips/load` - Load trip data
- `POST /api/trips/save` - Save trip + expenses + travelers

## Authentication (Optional)

Enable Supabase Auth to require login:

1. Go to Authentication → Providers → Email
2. Enable "Email/Password"
3. In code, add login screen (auth guard in page.jsx)

Currently app works with RLS but no login UI.

## Deployment to Vercel

1. Add env vars to Vercel project:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. Deploy:
   ```bash
   vercel
   ```

3. Data persists via Supabase (not reset on redeploy)

## Troubleshooting

**"Missing environment variables" error**
- Check `.env.local` exists
- Verify keys are correct (no spaces)
- Restart dev server

**"RLS policy violation" error**
- User doesn't own the trip
- Auth UID doesn't match trip user_id
- Check Supabase Auth tab

**Data not saving?**
- Check API response in browser DevTools → Network
- Verify Supabase credentials
- Check database in Supabase dashboard

## Cost

Supabase free tier includes:
- 500MB storage
- 2M monthly requests
- 50k monthly active users

Sufficient for small projects. Upgrade as needed.

## Backup Data

Supabase auto-backs up data daily. Manual export:

1. Go to Supabase → Database → Backups
2. Click export
3. Download SQL file
