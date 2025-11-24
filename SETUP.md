# YapList Setup Guide

## 1. Supabase Setup (5-10 minutes)

### Create Project
1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in:
   - **Name:** yaplist-mvp
   - **Database Password:** (generate strong password, save it)
   - **Region:** Choose closest to you
4. Wait for project to provision (~2 minutes)

### Configure Google OAuth
1. In Supabase dashboard, go to **Authentication** → **Providers**
2. Find **Google** and click to expand
3. Toggle **Enable Google provider** to ON
4. You'll need Google OAuth credentials:

#### Get Google OAuth Credentials
1. Go to https://console.cloud.google.com
2. Create new project or select existing
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Configure consent screen if prompted (External, add your email)
6. Choose **Web application**
7. Add authorized redirect URIs:
   ```
   https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback
   ```
   (Get exact URL from Supabase Google provider settings)
8. Copy **Client ID** and **Client Secret**
9. Paste into Supabase Google provider settings
10. Click **Save**

### Create Database Schema
1. In Supabase dashboard, go to **SQL Editor**
2. Click **New query**
3. Paste and run this SQL:

```sql
-- Users table (extends auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'offline' CHECK (status IN ('available', 'offline')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Friendships table
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

-- Presence table
CREATE TABLE public.presence (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  socket_id TEXT,
  in_call_with UUID REFERENCES public.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_friendships_user_id ON public.friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON public.friendships(friend_id);
CREATE INDEX idx_friendships_status ON public.friendships(status);
CREATE INDEX idx_users_username ON public.users(username);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presence ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users are viewable by everyone"
  ON public.users FOR SELECT
  USING (true);

CREATE POLICY "Users can update own data"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own data"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for friendships table
CREATE POLICY "Friendships viewable by participants"
  ON public.friendships FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friendships"
  ON public.friendships FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own friendships"
  ON public.friendships FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- RLS Policies for presence table
CREATE POLICY "Presence viewable by friends"
  ON public.presence FOR SELECT
  USING (
    user_id IN (
      SELECT friend_id FROM public.friendships
      WHERE user_id = auth.uid() AND status = 'accepted'
      UNION
      SELECT user_id FROM public.friendships
      WHERE friend_id = auth.uid() AND status = 'accepted'
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can update own presence"
  ON public.presence FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own presence"
  ON public.presence FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_presence_updated_at
  BEFORE UPDATE ON public.presence
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

4. Click **Run** - should see "Success. No rows returned"

### Get API Keys
1. Go to **Project Settings** → **API**
2. Copy these values:
   - **Project URL** (e.g., https://xxxxx.supabase.co)
   - **anon public** key
   - **service_role** key (keep this secret!)

### Update Environment Files

**Desktop (.env):**
```bash
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
VITE_SERVER_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

**Server (.env):**
```bash
PORT=3000
NODE_ENV=development
SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
RTC_MIN_PORT=40000
RTC_MAX_PORT=40100
ANNOUNCED_IP=127.0.0.1
CORS_ORIGIN=http://localhost:5173
```

---

## 2. Railway Setup (5 minutes)

### Create Project
1. Go to https://railway.app
2. Click **New Project**
3. Choose **Deploy from GitHub repo**
4. Connect your GitHub account if needed
5. Select **toastfacek/yapme** repository
6. Railway will auto-detect Node.js

### Configure Deployment
1. Click on your service
2. Go to **Settings**
3. **Root Directory:** Set to `server`
4. **Build Command:** `npm install && npm run build`
5. **Start Command:** `npm start`

### Add Environment Variables
1. Go to **Variables** tab
2. Add these variables:
   ```
   NODE_ENV=production
   PORT=3000
   SUPABASE_URL=your-supabase-url
   SUPABASE_SERVICE_KEY=your-service-role-key
   RTC_MIN_PORT=40000
   RTC_MAX_PORT=40100
   ANNOUNCED_IP=${{RAILWAY_PUBLIC_DOMAIN}}
   CORS_ORIGIN=*
   ```

### Get Deployment URL
1. Go to **Settings** → **Networking**
2. Click **Generate Domain**
3. Copy the URL (e.g., yapme-production.up.railway.app)
4. Update desktop/.env:
   ```bash
   VITE_SERVER_URL=https://your-railway-domain.railway.app
   VITE_WS_URL=wss://your-railway-domain.railway.app
   ```

### Configure Custom Domain (Optional - for yapme.xyz)
1. In Railway, go to **Settings** → **Networking**
2. Click **Custom Domain**
3. Add **api.yapme.xyz**
4. Copy the CNAME record
5. In your domain registrar (where you bought yapme.xyz):
   - Add CNAME record: `api` → `your-app.railway.app`
6. Wait for DNS propagation (~5-10 minutes)

---

## 3. Domain Setup (yapme.xyz)

### Landing Page (Optional for MVP)
Point main domain to a simple landing page:
1. Create GitHub repo with index.html
2. Enable GitHub Pages
3. Point yapme.xyz to GitHub Pages

Or just redirect yapme.xyz → GitHub repo for now.

---

## Quick Verification Checklist

### Supabase ✓
- [ ] Project created and running
- [ ] Google OAuth configured
- [ ] Database schema created (4 tables)
- [ ] RLS policies enabled
- [ ] API keys copied to .env files

### Railway ✓
- [ ] Project created from GitHub
- [ ] Environment variables set
- [ ] Deployment successful
- [ ] Domain generated
- [ ] Server URL updated in desktop/.env

### Local Setup ✓
- [ ] desktop/.env created with Supabase + Railway URLs
- [ ] server/.env created with Supabase keys
- [ ] Ready to run `npm install`

---

## Troubleshooting

### Supabase Issues
- **Can't create tables:** Make sure you're in SQL Editor, not Table Editor
- **RLS errors:** Run each policy separately if batch fails
- **OAuth redirect errors:** Double-check callback URL matches exactly

### Railway Issues
- **Build fails:** Check that Root Directory is set to `server`
- **Port errors:** Railway auto-assigns PORT, our code uses process.env.PORT
- **WebRTC not working:** Make sure ANNOUNCED_IP is set correctly

### Local Issues
- **CORS errors:** Check CORS_ORIGIN in server/.env matches desktop URL
- **Auth fails:** Verify Supabase keys are correct in .env files

---

## Next Steps

Once setup is complete:
```bash
# Install dependencies
cd desktop && npm install
cd ../server && npm install

# Start development
# Terminal 1:
cd server && npm run dev

# Terminal 2:
cd desktop && npm run dev:electron
```

You should see the YapList login screen! 🎉
