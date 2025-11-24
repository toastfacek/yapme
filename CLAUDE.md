# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

YapList is a desktop application that brings back the simplicity of AOL Instant Messenger's buddy list with push-to-talk voice communication. Users see who's available and can instantly talk to them by clicking their name and holding spacebar.

**Core Principle:** Maximum real-time, minimum complexity. Voice-only communication with presence awareness.

**Target:** <100 users MVP, ~$6/month infrastructure cost

## Architecture

### Stack
- **Desktop App:** Electron + React + TypeScript
- **Backend:** Node.js on Railway (Express + Socket.io + Mediasoup)
- **Database:** Supabase (Postgres + Realtime + Auth)
- **Voice Storage:** Railway ephemeral disk + Cloudflare R2
- **Voice Streaming:** WebRTC via self-hosted Mediasoup

### Key Technical Decisions
- **WebRTC:** Self-hosted Mediasoup for budget control (~$5/mo vs per-minute charges)
- **E2E Encryption:** RSA-2048 for key exchange, AES-256-GCM for audio
- **Voice Codec:** Opus at 32kbps (~240KB/min)
- **Presence:** Supabase Realtime subscriptions
- **Voice Messages:** Auto-expire after 24h, encrypt at rest

## Current Implementation Status

**✅ Phases 0-6 Complete** - Full UI, auth, friend management working
**🔄 Phase 7 Next** - WebRTC audio streaming (core PTT functionality)

### What's Working
- Complete Electron + React desktop app
- Google OAuth authentication via Supabase
- Username selection and user management
- Friend system (add, accept/decline, list)
- Real-time presence updates via Supabase Realtime
- PTT button UI with keyboard/mouse support
- Beautiful retro design system
- Railway server deployed and running

### What's Next
- Mediasoup WebRTC server implementation
- Audio capture on PTT press
- Audio streaming between users
- Audio playback

## Code Structure (Current)

### Desktop App
```
desktop/
├── electron/
│   ├── main.ts                  # ✅ Electron main process (CommonJS)
│   └── preload.ts               # ✅ IPC bridge
├── src/
│   ├── components/
│   │   ├── Auth/
│   │   │   ├── LoginScreen.tsx  # ✅ Google OAuth screen
│   │   │   └── UsernameSetup.tsx # ✅ Username selection
│   │   ├── BuddyList/
│   │   │   ├── BuddyList.tsx    # ✅ Main buddy list UI
│   │   │   ├── BuddyItem.tsx    # ✅ Individual friend row
│   │   │   └── AddFriend.tsx    # ✅ Add friend modal
│   │   └── PTT/
│   │       ├── PTTButton.tsx    # ✅ Retro PTT button with animations
│   │       └── AudioIndicator.tsx # 🔄 Visual audio level indicator (planned)
│   ├── hooks/
│   │   ├── useAuth.ts           # ✅ Authentication & session management
│   │   ├── useFriends.ts        # ✅ Friend list & realtime updates
│   │   ├── useWebRTC.ts         # 🔄 WebRTC audio (Phase 7)
│   │   └── usePresence.ts       # 🔄 Enhanced presence (Phase 7)
│   ├── lib/
│   │   ├── supabase.ts          # ✅ Supabase client setup
│   │   ├── webrtc.ts            # 🔄 WebRTC utilities (Phase 7)
│   │   └── audio.ts             # 🔄 Audio processing (Phase 7)
│   ├── styles/
│   │   ├── variables.css        # ✅ Warm retro design tokens
│   │   ├── global.css           # ✅ Global styles & animations
│   │   └── components.css       # ✅ Component styles
│   ├── types/
│   │   └── index.ts             # ✅ TypeScript types
│   └── App.tsx                  # ✅ Root component
└── tsconfig.node.json           # ✅ CRITICAL: CommonJS for Electron
```

### Backend
```
server/
├── src/
│   ├── index.ts                 # ✅ Express + Socket.io entry point
│   ├── config.ts                # ✅ Environment configuration
│   ├── mediasoup/               # 🔄 Phase 7: WebRTC media server
│   │   ├── worker.ts            # 🔄 Mediasoup worker setup
│   │   ├── router.ts            # 🔄 Media router
│   │   └── transport.ts         # 🔄 WebRTC transports
│   ├── signaling/
│   │   ├── handlers.ts          # ✅ Basic Socket.io handlers
│   │   └── rooms.ts             # 🔄 1:1 call room management (Phase 7)
│   └── types/
│       └── index.ts             # ✅ Shared types
└── dist/                        # ✅ TypeScript build output
```

## Database Schema

Core tables in Supabase:
- **users:** Auth-managed, includes status, public_key for E2E
- **friendships:** Bidirectional friend relationships (pending/accepted/blocked)
- **voice_messages:** Ephemeral, auto-expire after 24h
- **presence:** Real-time presence tracking (in_call_with, socket_id)

All tables use Row Level Security (RLS) policies for privacy.

## Development Commands

```bash
# Setup
cd desktop && npm install
cd ../server && npm install

# Configure environment variables
cd desktop
cp .env.example .env
# Add your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

cd ../server
cp .env.example .env
# Add your SUPABASE_URL and SUPABASE_ANON_KEY

# Development (run in separate terminals)
cd desktop && npm run dev:electron   # Electron app with React dev server
cd server && npm run dev              # Node.js server with hot reload

# Build for distribution
cd desktop && npm run build:electron  # macOS .dmg
# Windows and Linux builds in Phase 2
```

## Key Implementation Details

### Push-to-Talk Mechanics (Current)
- ✅ Click buddy to select target
- ✅ Hold spacebar (or click button) to transmit
- ✅ Visual button animations and ripple effects
- ✅ Button disabled when friend is offline
- 🔄 Audio capture and streaming (Phase 7)
- 🔄 If recipient unavailable, record voice message (Phase 2)

### Status States (MVP)
- 🟢 **Available:** Can receive live calls (current implementation)
- ⚫ **Offline:** Cannot contact (current implementation)
- 🔮 **Focus/DND:** Phase 2 features
- 🔮 **In Call indicator:** Phase 2 feature

### Voice Message Behavior (Phase 2)
- 🔮 Maximum 60 seconds per message
- 🔮 Auto-delete after listening (Snapchat-style)
- 🔮 Expire after 24 hours if unheard
- 🔮 Encrypted with recipient's public key

### WebRTC Signaling Flow (Phase 7 - Next)
1. 🔄 Check recipient availability via presence
2. 🔄 Create Mediasoup transport on server
3. 🔄 Signal recipient through Socket.io WebSocket
4. 🔄 Establish audio stream via Mediasoup SFU
5. 🔄 Opus codec @ 32kbps for audio

### E2E Encryption (Phase 2)
- 🔮 Generate RSA-2048 keypair on first login
- 🔮 Store public key in database, private key in Electron secure storage
- 🔮 For each voice session:
  - Generate AES-256-GCM session key
  - Encrypt audio with AES
  - Encrypt AES key with recipient's RSA public key
  - Transmit both encrypted payloads

## Performance Requirements

- <100MB RAM usage when idle
- <2% CPU usage when idle
- <500ms to establish voice connection
- <100ms audio latency
- Works on 1Mbps connection

## MVP Constraints

- Maximum 50 friends per user
- Maximum 60 seconds per voice message
- No group calls (1-on-1 only)
- No mobile apps
- No text chat whatsoever
- Desktop-only (macOS, Windows, Linux)

## Security Considerations

- E2E encryption for all voice (live and messages)
- OAuth-only authentication (Google/Discord)
- No message history or transcripts
- Auto-expiry of voice messages
- Row Level Security on all database operations
- Private keys never leave client

## Scaling Strategy

Current architecture handles <100 users on single Railway instance. Beyond MVP:
1. Add Redis for presence state
2. Multiple Mediasoup workers
3. Load balancer for WebSocket connections
4. Consider Cloudflare Calls migration
5. CDN for desktop app distribution

## Important Technical Notes

### Electron TypeScript Configuration
**CRITICAL:** The Electron main process (`desktop/electron/main.ts`) must be compiled to CommonJS, not ES modules. This is configured in `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "module": "CommonJS",
    "target": "ES2020",
    "esModuleInterop": true,
    // ...
  }
}
```

**Why:** Electron's main process doesn't support ES modules properly. Using `"module": "ESNext"` will cause `__dirname` to be undefined and imports to fail. CommonJS makes `__dirname` globally available.

**Build command must use correct config:**
```json
"dev:electron": "concurrently \"npm run dev\" \"wait-on http://localhost:5173 && tsc --project tsconfig.node.json && NODE_ENV=development electron dist/electron/main.js\""
```

### Auth State Management
After username creation or any database operation that affects auth state, use `refreshUser()` instead of `window.location.reload()`:

```typescript
// In App.tsx
<UsernameSetup
  userId={session.user.id}
  onComplete={() => refreshUser()}  // NOT window.location.reload()
/>

// In useAuth.ts
const refreshUser = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user) {
    await loadUser(session.user.id)  // Properly reload user data
  }
}
```

### Supabase RLS Policies
All database tables use Row Level Security (RLS). Users can only:
- Read their own user data and all usernames (for lookups)
- Create friendships where they're the requester
- Update friendships they're part of
- See presence for accepted friends only

### Real-time Updates
Friend status uses Supabase Realtime subscriptions:
```typescript
const friendshipsChannel = supabase
  .channel('friendships-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'friendships',
    filter: `user_id=eq.${userId}`,
  }, () => {
    loadFriends()  // Reload when friendships change
  })
  .subscribe()
```

## Product Philosophy

**Voice-only by design:** No text chat. No "just one more feature." The entire value proposition is simplicity and presence awareness for voice.

**Privacy-first:** Minimal data collection, E2E encryption (Phase 2), auto-deletion of messages, no logs or transcripts.

**Budget-conscious:** Architecture designed for <$10/month at <100 users. Every technical decision considers cost at small scale.

**Speed over perfection:** MVP focuses on core PTT experience. Polish and advanced features come after validating the core loop.
