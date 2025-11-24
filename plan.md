# YapList MVP Implementation Plan

**Target Launch:** Sunday (LinkedIn post)
**Timeline:** 3 days aggressive development
**Goal:** Live 1:1 PTT with friend list - the core magic moment

---

## 🎯 Refined MVP Scope

### ✅ MUST HAVE (Core Loop)
1. **Authentication:** Google OAuth only (via Supabase Auth)
2. **Onboarding:** Username selection (yapme.xyz/username)
3. **Friend Management:** Add friend by username, accept/decline requests
4. **Buddy List:** See friends with status (🟢 Available / ⚫ Offline)
5. **Select Friend:** "Dial" metaphor - select one friend to talk to
6. **PTT Live Audio:** Hold spacebar → transmit live audio to selected friend
7. **Receive Audio:** Hear friend's PTT instantly

### 🔮 PHASE 2 (Post-Sunday)
- Voice messages for offline friends
- E2E encryption (2-3 days of work)
- Windows/Linux builds
- System tray icon & global hotkey
- Focus/DND status states
- Custom status messages
- More OAuth providers (Discord)
- Voice message recording/playback

---

## 🛠 Technical Stack

### Desktop App
- **Framework:** Electron 28+
- **Frontend:** React 18 + TypeScript
- **Build Tool:** Vite (fast HMR)
- **Styling:** Vanilla CSS with CSS variables (retro aesthetic)
- **State:** React Context (simple, no Redux needed)
- **Audio:** WebRTC MediaStream API
- **Package Manager:** npm

### Backend Server
- **Runtime:** Node.js 20+
- **Framework:** Express 4
- **WebSocket:** Socket.io 4
- **WebRTC Server:** Mediasoup 3
- **Language:** TypeScript
- **Deployment:** Railway

### Database & Auth
- **Database:** Supabase (Postgres)
- **Auth:** Supabase Auth (Google OAuth)
- **Realtime:** Supabase Realtime (presence updates)

### Infrastructure
- **Backend Hosting:** Railway (~$5/mo)
- **Database:** Supabase Free Tier
- **Domain:** yapme.xyz (already purchased)
- **Voice Messages:** Deferred to Phase 2
- **CDN:** Not needed for MVP

---

## 🎨 Design Direction: "Cozy Retro Walkie-Talkie"

### Aesthetic Goals
- **Nostalgic AIM/MSN Messenger vibes** for millennials/gen-z
- **Warm, analog, tactile** - not cold/minimalist/corporate
- **Skeuomorphic PTT button** - looks/feels like physical button press
- **Retro status indicators** - glowing colored dots, not modern badges
- **Subtle texture** - paper grain, soft shadows, warm gradients

### Color Palette (Warm Sunset)
```
Primary:   #FF6B35 (warm orange)
Secondary: #F7931E (golden)
Accent:    #C1666B (dusty rose)
Available: #4ECDC4 (warm teal)
Offline:   #95A3A4 (soft gray)
Background:#FFF8F0 (warm cream)
Text:      #2C1810 (warm brown-black)
```

### Typography
- **Headings:** Rounded sans-serif (e.g., Fredoka, Nunito)
- **Body:** Clean readable sans (e.g., Inter, DM Sans)
- **Mono:** Status/username (e.g., JetBrains Mono)

### Sound Design
- **PTT Press:** Walkie-talkie "click" or "chirp"
- **PTT Release:** Subtle "release" sound
- **Friend Online:** Warm "ding" notification
- **Error:** Gentle "bonk" sound (not harsh beep)

### Key UI Elements
1. **Buddy List:** Vertical list, ~60px rows, soft rounded corners
2. **PTT Button:** Large circular button, glows when pressed, tactile animation
3. **Status Dots:** 12px glowing circles with soft shadow
4. **Dial Selector:** Highlighted friend with warm glow effect
5. **Window:** Fixed size ~320x600px, draggable, minimal chrome

---

## 📁 Project Structure

```
yaplist/
├── docs/                          # Design documents
│   ├── yaplist-prd-from-tdd.md
│   └── yaplist-technical-design.md
├── CLAUDE.md                      # AI context file
├── plan.md                        # This file
├── .gitignore
├── README.md
│
├── desktop/                       # Electron app
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── .env.example
│   ├── electron/
│   │   └── main.ts               # Electron main process
│   ├── src/
│   │   ├── main.tsx              # React entry point
│   │   ├── App.tsx               # Root component
│   │   ├── styles/
│   │   │   ├── variables.css     # Design tokens
│   │   │   ├── global.css        # Global styles
│   │   │   └── components.css    # Component styles
│   │   ├── components/
│   │   │   ├── Auth/
│   │   │   │   ├── LoginScreen.tsx
│   │   │   │   └── UsernameSetup.tsx
│   │   │   ├── BuddyList/
│   │   │   │   ├── BuddyList.tsx
│   │   │   │   ├── BuddyItem.tsx
│   │   │   │   └── AddFriend.tsx
│   │   │   └── PTT/
│   │   │       ├── PTTButton.tsx
│   │   │       └── AudioIndicator.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useSupabase.ts
│   │   │   ├── usePresence.ts
│   │   │   ├── useWebRTC.ts
│   │   │   └── useFriends.ts
│   │   ├── lib/
│   │   │   ├── supabase.ts       # Supabase client
│   │   │   ├── webrtc.ts         # WebRTC utilities
│   │   │   └── audio.ts          # Audio processing
│   │   ├── types/
│   │   │   └── index.ts          # TypeScript types
│   │   └── assets/
│   │       ├── sounds/           # Audio files
│   │       └── icon.png          # App icon
│   └── dist/                     # Build output
│
└── server/                        # Node.js backend
    ├── package.json
    ├── tsconfig.json
    ├── .env.example
    ├── src/
    │   ├── index.ts              # Express + Socket.io entry
    │   ├── config.ts             # Environment config
    │   ├── mediasoup/
    │   │   ├── worker.ts         # Mediasoup worker setup
    │   │   ├── router.ts         # Media router
    │   │   └── transport.ts      # WebRTC transports
    │   ├── signaling/
    │   │   ├── handlers.ts       # Socket.io event handlers
    │   │   └── rooms.ts          # 1:1 call rooms
    │   ├── presence/
    │   │   └── manager.ts        # Status tracking
    │   └── types/
    │       └── index.ts          # Shared types
    └── dist/                     # Build output
```

---

## 🗄 Database Schema (Simplified MVP)

### Tables

```sql
-- Users (extended from Supabase Auth)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'offline' CHECK (status IN ('available', 'offline')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Friendships (bidirectional)
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- Presence (real-time status)
CREATE TABLE public.presence (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  socket_id TEXT,
  in_call_with UUID REFERENCES public.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Row Level Security (RLS) Policies

```sql
-- Users can read all users (for username lookups)
CREATE POLICY "Users are viewable by everyone"
  ON public.users FOR SELECT
  USING (true);

-- Users can only update their own data
CREATE POLICY "Users can update own data"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- Friendships viewable by either party
CREATE POLICY "Friendships viewable by participants"
  ON public.friendships FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Users can create friendships
CREATE POLICY "Users can create friendships"
  ON public.friendships FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update friendships they're part of
CREATE POLICY "Users can update own friendships"
  ON public.friendships FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Presence readable by friends
CREATE POLICY "Presence viewable by friends"
  ON public.presence FOR SELECT
  USING (
    user_id IN (
      SELECT friend_id FROM public.friendships
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

-- Users can update own presence
CREATE POLICY "Users can update own presence"
  ON public.presence FOR UPDATE
  USING (auth.uid() = user_id);
```

### Indexes

```sql
CREATE INDEX idx_friendships_user_id ON public.friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON public.friendships(friend_id);
CREATE INDEX idx_friendships_status ON public.friendships(status);
CREATE INDEX idx_users_username ON public.users(username);
```

---

## 🔌 API Design

### REST Endpoints (Express)

```
POST   /api/health              # Health check
GET    /api/users/:username     # Lookup user by username
POST   /api/friends/add         # Send friend request
POST   /api/friends/accept      # Accept friend request
POST   /api/friends/decline     # Decline friend request
GET    /api/friends             # Get friend list with status
```

### WebSocket Events (Socket.io)

#### Client → Server
```javascript
'authenticate'         // { token: string }
'update_status'        // { status: 'available' | 'offline' }
'call_initiate'        // { toUserId: string }
'call_accept'          // { fromUserId: string, transport: object }
'call_decline'         // { fromUserId: string }
'call_end'             // { callId: string }
'webrtc_offer'         // { toUserId: string, offer: RTCSessionDescription }
'webrtc_answer'        // { toUserId: string, answer: RTCSessionDescription }
'webrtc_ice_candidate' // { toUserId: string, candidate: RTCIceCandidate }
```

#### Server → Client
```javascript
'authenticated'        // { userId: string }
'presence_update'      // { userId: string, status: string }
'friend_online'        // { userId: string, username: string }
'friend_offline'       // { userId: string }
'incoming_call'        // { fromUserId: string, username: string }
'call_accepted'        // { userId: string, transport: object }
'call_declined'        // { userId: string }
'call_ended'           // { userId: string }
'webrtc_offer'         // { fromUserId: string, offer: RTCSessionDescription }
'webrtc_answer'        // { fromUserId: string, answer: RTCSessionDescription }
'webrtc_ice_candidate' // { fromUserId: string, candidate: RTCIceCandidate }
'error'                // { message: string, code: string }
```

---

## 🚀 Implementation Phases

### Phase 0: Setup (1-2 hours)
- [x] Create plan.md
- [ ] Initialize git repo
- [ ] Set up monorepo structure
- [ ] Create package.json files
- [ ] Install dependencies
- [ ] Configure TypeScript
- [ ] Set up environment variables
- [ ] Create .gitignore

### Phase 1: Infrastructure (2-3 hours)
- [ ] **Supabase Setup**
  - Create project
  - Set up Google OAuth
  - Create database schema
  - Configure RLS policies
  - Test auth flow
- [ ] **Railway Setup**
  - Create project
  - Configure environment variables
  - Set up deployment from GitHub
  - Test health endpoint
- [ ] **Desktop Scaffold**
  - Basic Electron window
  - React + Vite integration
  - Hot reload working
  - Basic routing (login/main screens)

### Phase 2: Authentication (2-3 hours)
- [ ] Supabase client integration
- [ ] Google OAuth login flow
- [ ] Username selection screen
- [ ] Store user in database
- [ ] Session persistence
- [ ] Logout functionality

### Phase 3: Friend Management (3-4 hours)
- [ ] Add friend by username UI
- [ ] Send friend request (API + DB)
- [ ] Friend request notifications
- [ ] Accept/decline UI
- [ ] Friend list component
- [ ] Real-time friend list updates (Supabase Realtime)

### Phase 4: Presence System (2-3 hours)
- [ ] Socket.io client/server setup
- [ ] Connect to server on app launch
- [ ] Update status on Supabase
- [ ] Subscribe to friend status changes
- [ ] Show status indicators in buddy list
- [ ] Handle disconnect/reconnect

### Phase 5: WebRTC Setup (4-5 hours)
- [ ] Mediasoup server setup
  - Create worker
  - Create router
  - Configure codecs (Opus audio only)
- [ ] WebRTC signaling flow
  - Call initiation
  - Offer/answer exchange
  - ICE candidate exchange
- [ ] Audio capture (getUserMedia)
- [ ] Audio playback
- [ ] Test local echo

### Phase 6: PTT Core Feature (4-5 hours)
- [ ] Friend selection ("dial" UI)
- [ ] PTT button component
- [ ] Spacebar keydown/keyup handlers
- [ ] Initiate call on PTT press
- [ ] Audio streaming to selected friend
- [ ] Receive and play friend's audio
- [ ] Visual feedback (talking indicator)
- [ ] Audio level visualization
- [ ] Error handling (friend offline, busy, etc.)

### Phase 7: Polish & UX (3-4 hours)
- [ ] Retro/cozy styling
  - CSS variables for design tokens
  - Warm color palette
  - Rounded UI elements
  - Glowing status dots
  - Tactile PTT button
- [ ] Sound effects
  - PTT press/release clicks
  - Friend online notification
  - Error sounds
- [ ] Loading states
- [ ] Error messages
- [ ] Empty states (no friends)
- [ ] Smooth animations

### Phase 8: Testing & Debugging (3-4 hours)
- [ ] Manual testing checklist
- [ ] Test with 2+ real users
- [ ] Fix critical bugs
- [ ] Test on different networks
- [ ] Test reconnection scenarios
- [ ] Performance optimization
- [ ] Memory leak checks

### Phase 9: Deployment (2-3 hours)
- [ ] Build macOS .dmg
- [ ] Code signing (if time)
- [ ] Test installer
- [ ] Deploy server to Railway
- [ ] Configure custom domain (yapme.xyz)
- [ ] SSL certificate setup
- [ ] Create download landing page
- [ ] Write launch LinkedIn post

---

## 🧪 Testing Strategy

### Manual Testing Focus (Speed > Automation)
Given the tight timeline, we'll prioritize manual testing with a structured checklist.

### Testing Checklist

#### Authentication Flow
- [ ] Can login with Google
- [ ] Username selection works
- [ ] Username uniqueness validation
- [ ] Session persists on restart
- [ ] Can logout

#### Friend Management
- [ ] Can search for user by username
- [ ] Friend request sends successfully
- [ ] Friend request appears for recipient
- [ ] Can accept friend request
- [ ] Can decline friend request
- [ ] Friend list updates in real-time

#### Presence System
- [ ] Status shows correctly (available/offline)
- [ ] Status updates when friend comes online
- [ ] Status updates when friend goes offline
- [ ] Status persists after app restart

#### PTT Functionality
- [ ] Can select friend from list
- [ ] Spacebar PTT works
- [ ] Audio transmits to friend
- [ ] Friend hears audio clearly
- [ ] Can receive friend's PTT
- [ ] Visual indicator shows talking state
- [ ] Error when friend offline
- [ ] Can switch between friends mid-session

#### Edge Cases
- [ ] Works on slow network (1Mbps)
- [ ] Handles disconnect/reconnect gracefully
- [ ] No memory leaks during long session
- [ ] Audio quality acceptable
- [ ] Latency <500ms for PTT start

### Performance Targets
- **Cold start:** <3 seconds to login screen
- **Login:** <2 seconds after Google auth
- **PTT latency:** <500ms to hear audio
- **Audio quality:** Clear speech at 32kbps Opus
- **RAM usage:** <100MB idle
- **CPU usage:** <5% idle, <20% during PTT

---

## 🚢 Deployment Checklist

### Supabase Configuration
- [ ] Project created
- [ ] Google OAuth configured
- [ ] Database schema deployed
- [ ] RLS policies enabled
- [ ] API keys generated
- [ ] CORS configured for yapme.xyz

### Railway Deployment
- [ ] Project created
- [ ] Environment variables set:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `PORT`
  - `NODE_ENV=production`
- [ ] Domain configured (api.yapme.xyz or similar)
- [ ] SSL certificate active
- [ ] Health check endpoint responding
- [ ] WebSocket connections working

### Desktop App Build
- [ ] macOS build completes
- [ ] .dmg installer created
- [ ] App launches successfully
- [ ] Connects to production server
- [ ] No console errors
- [ ] Ready for distribution

### Domain & DNS
- [ ] yapme.xyz DNS configured
- [ ] A record points to landing page
- [ ] Subdomain for API (api.yapme.xyz)
- [ ] SSL certificates valid

---

## 📋 Sunday Launch Checklist

### Must Work
- [ ] ✅ User can login with Google
- [ ] ✅ User can choose username
- [ ] ✅ User can add friend by username
- [ ] ✅ User can accept friend request
- [ ] ✅ User sees friend's status (online/offline)
- [ ] ✅ User can select friend
- [ ] ✅ User can hold spacebar to talk
- [ ] ✅ Friend hears audio clearly (<500ms latency)
- [ ] ✅ User can hear friend's PTT

### Nice to Have (If Time)
- [ ] System tray icon
- [ ] Friend online notifications
- [ ] Audio level indicator
- [ ] Smooth animations
- [ ] Custom status messages

### LinkedIn Post Content
Suggested post structure:
```
🎙️ Built YapList in 3 days - voice-only communication that feels like walkie-talkies for remote friends

The problem: Discord is too complex. Zoom feels like a meeting. Phone calls lack presence context.

The solution: A simple buddy list. Click a friend. Hold spacebar. Talk.

That's it. No channels. No text. Just presence and voice.

Download for macOS: yapme.xyz

Built with: Electron, React, WebRTC, Supabase
[screenshot of app]
[short demo video]

Would love feedback from early testers! 🚀
```

---

## 🔮 Phase 2 Roadmap (Post-Launch)

### Week 2: Core Improvements
- Voice messages for offline friends
- Windows build
- System tray + global hotkey
- Focus/DND status states
- Custom status messages

### Week 3: Privacy & Polish
- E2E encryption implementation
- Notification sounds customization
- Audio quality improvements
- Better error handling
- Performance optimization

### Week 4: Growth Features
- Discord OAuth
- Invite links
- User profiles/avatars
- Linux build
- Landing page improvements

---

## 💡 Technical Notes

### WebRTC Architecture Decision
- **Direct P2P:** Lowest latency but requires STUN/TURN servers
- **SFU (Mediasoup):** Slightly higher latency but more reliable, easier NAT traversal
- **Decision:** Use Mediasoup SFU for MVP reliability

### Audio Codec Choice
- **Opus @ 48kHz, 32kbps:** Perfect balance of quality and bandwidth
- Handles packet loss well
- Low latency mode available
- Standard in WebRTC

### State Management
- **No Redux/Zustand needed** - React Context sufficient for MVP
- Keep it simple: Auth context + Friends context + WebRTC context

### Realtime Strategy
- **Presence:** Supabase Realtime (simple, free)
- **Signaling:** Socket.io (WebRTC signaling requires WebSocket)
- **Audio:** WebRTC DataChannel (lowest latency)

---

## 🎯 Success Criteria

### Sunday Launch
- [ ] 5 friends using it successfully
- [ ] 20+ PTT conversations
- [ ] <3 critical bugs
- [ ] LinkedIn post published
- [ ] 10+ downloads

### Week 1
- [ ] 50 signups
- [ ] 25 active users
- [ ] 100+ PTT conversations
- [ ] <10 bugs reported
- [ ] Positive feedback on nostalgia/aesthetic

---

## 📞 Support & Feedback

### Bug Reporting
- Discord server for alpha testers
- GitHub issues for beta

### Feature Requests
Capture but defer - focus on core loop working perfectly before adding features.

---

**Last Updated:** November 24, 2024
**Next Review:** After Phase 1 completion
