# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

YapMe is a desktop application that brings back the simplicity of AOL Instant Messenger's buddy list with push-to-talk voice communication. Users see who's available and can instantly talk to them by clicking their name and holding spacebar.

**Core Principle:** Maximum real-time, minimum complexity. Voice-only communication with presence awareness.

**Target:** <100 users MVP, ~$6/month infrastructure cost

## Architecture

### Stack
- **Desktop App:** Electron + React + TypeScript + Tailwind CSS
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
- FriendWheel UI with walkie-talkie interface
- Expandable buddy list drawer
- PTT button UI with keyboard/mouse support
- Beautiful retro-digital design system (Teenage Engineering inspired)
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
│   │   │   ├── LoginScreen.tsx  # ✅ Google OAuth screen (Tailwind)
│   │   │   └── UsernameSetup.tsx # ✅ Username selection (Tailwind)
│   │   ├── FriendWheel/
│   │   │   ├── Avatar.tsx       # ✅ User avatar with technical overlays
│   │   │   ├── TitleBar.tsx     # ✅ App header with username
│   │   │   ├── FriendWheel.tsx  # ✅ Main walkie-talkie interface
│   │   │   └── BuddyListDrawer.tsx # ✅ Expandable friend management
│   │   └── _archived/           # 📦 Old BuddyList/PTT components
│   ├── hooks/
│   │   ├── useAuth.ts           # ✅ Authentication & session management
│   │   ├── useFriends.ts        # ✅ Friend list & realtime updates
│   │   └── useWebRTC.ts         # 🔄 WebRTC audio (Phase 7)
│   ├── lib/
│   │   ├── supabase.ts          # ✅ Supabase client setup
│   │   └── webrtc.ts            # 🔄 WebRTC utilities (Phase 7)
│   ├── types/
│   │   └── index.ts             # ✅ TypeScript types
│   ├── index.css                # ✅ Tailwind entry point
│   └── App.tsx                  # ✅ Root component
├── tailwind.config.js           # ✅ Retro-digital theme config
├── postcss.config.js            # ✅ PostCSS + Tailwind
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
- ✅ Scroll friend wheel to select target
- ✅ Hold spacebar (or click button) to transmit
- ✅ Visual button animations with "ON AIR" indicator
- ✅ Audio visualizer with matrix-green bars
- ✅ Button disabled when friend is offline or WebRTC not connected
- ✅ Listening indicator when friend talks
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

### Electron Development Setup

#### Critical Environment Variable Issue

**⚠️ ELECTRON_RUN_AS_NODE Must Be Unset**

When developing this Electron app, you MUST unset the `ELECTRON_RUN_AS_NODE` environment variable. This variable is often set by Electron-based IDEs (Atom, VSCode, etc.) and causes `require('electron')` to return a file path string instead of the Electron API object.

**Symptoms:**
- Error: `TypeError: Cannot read properties of undefined (reading 'whenReady')`
- Electron appears to run but crashes immediately
- `require('electron')` returns a path like `/path/to/Electron.app/Contents/MacOS/Electron`

**Why This Happens:**
When `ELECTRON_RUN_AS_NODE=1` is set, Electron runs as a Node.js process instead of the full Electron runtime. This is used internally by Electron for spawning utility processes, but breaks normal Electron apps. ([Source: GitHub Issue #8200](https://github.com/electron/electron/issues/8200))

**Solution:**
Always run the dev server with the environment variable explicitly unset:
```bash
unset ELECTRON_RUN_AS_NODE && npm run dev:electron
```

**How to Check:**
```bash
env | grep ELECTRON
# Should return nothing, or if set, shows: ELECTRON_RUN_AS_NODE=1
```

#### Vite Plugin Electron Configuration

The app uses `vite-plugin-electron` to bundle and run Electron automatically. Key configuration in [vite.config.ts](desktop/vite.config.ts):

```typescript
electron({
  main: {
    entry: 'electron/main.ts',
    vite: {
      build: {
        outDir: 'dist-electron',
        rollupOptions: {
          external: ['electron'],  // CRITICAL: Don't bundle electron
        },
      },
    },
  },
  preload: {
    input: 'electron/preload.ts',
    vite: {
      build: {
        outDir: 'dist-electron',
        rollupOptions: {
          external: ['electron'],  // CRITICAL: Don't bundle electron
        },
      },
    },
  },
})
```

**Why `external: ['electron']` is Required:**
- Electron must be loaded at runtime by the Electron process, not bundled
- The `electron` package in `node_modules` only exports the binary path
- The actual Electron API (`app`, `BrowserWindow`, etc.) is injected by the Electron runtime
- Bundling electron would include the path string, not the API

#### TypeScript Environment Types

The app requires `vite-env.d.ts` for Vite environment variable types:

```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

Without this file, `import.meta.env.VITE_*` will cause TypeScript errors.

#### Main Process Import Pattern

The Electron main process uses a specific import pattern in [electron/main.ts](desktop/electron/main.ts:1-3):

```typescript
import { app, BrowserWindow, ipcMain } from 'electron'
import type { BrowserWindow as BrowserWindowType } from 'electron'
import * as path from 'path'

let mainWindow: BrowserWindowType | null = null
```

**Why the type-only import:**
- `BrowserWindow` is both a class (value) and a type
- Using `BrowserWindow` as a type after destructuring causes TS error 2749
- Separate type import solves this: `type { BrowserWindow as BrowserWindowType }`

#### How Electron Execution Works

1. **npm script runs:** `npm run dev:electron` → executes `vite`
2. **Vite plugin builds:**
   - Compiles `electron/main.ts` → `dist-electron/main.js` (CommonJS)
   - Compiles `electron/preload.ts` → `dist-electron/preload.js` (CommonJS)
   - Starts Vite dev server on port 5173 for React app
3. **Vite plugin spawns Electron:**
   - Runs `electron dist-electron/main.js`
   - Electron loads the main process
   - Main process creates BrowserWindow
   - BrowserWindow loads `http://localhost:5173` (dev) or built files (prod)

**The module chain:**
```
node_modules/.bin/electron (CLI wrapper)
  ↓ spawns
node_modules/electron/dist/Electron.app (Actual Electron binary)
  ↓ executes
dist-electron/main.js (Your main process)
  ↓ requires 'electron' (now returns API because running IN Electron)
  ↓ creates
BrowserWindow → loads http://localhost:5173 (React app)
```

#### Common Pitfalls

1. **Running with ELECTRON_RUN_AS_NODE=1:** Causes `require('electron')` to fail
2. **Bundling electron:** Causes runtime errors, must use `external: ['electron']`
3. **Missing vite-env.d.ts:** Causes TypeScript errors for `import.meta.env`
4. **Wrong module format:** Main process MUST be CommonJS (configured in `tsconfig.node.json`)
5. **Running from Electron-based IDE:** May set ELECTRON_RUN_AS_NODE automatically

#### Debugging Electron

**Check if Electron is actually running:**
```bash
ps aux | grep Electron
# Should show Electron.app process if running
```

**Test electron binary directly:**
```bash
unset ELECTRON_RUN_AS_NODE && ./node_modules/.bin/electron dist-electron/main.js
```

**Check build output:**
```bash
cat dist-electron/main.js | head -n 10
# Should show: const electron = require("electron");
# NOT bundled electron code
```

**Enable debug logging:**
```bash
DEBUG=vite-plugin-electron:* npm run dev:electron
```

### Design System (Tailwind CSS)

The app uses a **retro-digital aesthetic** inspired by Teenage Engineering devices:

**Color Palette:**
- `bone` (#F0F0F0) - Background, light surfaces
- `concrete` (#D4D4D4) - Secondary surfaces, borders
- `ink` (#111111) - Primary text, borders
- `signal` (#FF4400) - High-visibility orange for CTAs
- `electric` (#0055FF) - Tech blue accents
- `led` (#00FF41) - Matrix green for status indicators

**Key Features:**
- Hard shadows (`shadow-hard`, `shadow-hard-sm`) for tactile button feel
- Pressed state with inset shadows and translation
- Blink animation for cursor effects
- Technical overlays on avatars (corner markers, crosshairs)
- Audio visualizer with matrix-green bars
- Monospace font (Space Mono) for technical aesthetic

**Configuration:** See [tailwind.config.js](desktop/tailwind.config.js:45-49) for full theme setup.

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

#### Preventing Auth Loading Hangs

The auth system uses Supabase's `getSession()` which can sometimes hang or timeout, causing the app to be stuck on the loading screen. To prevent this, [useAuth.ts](desktop/src/hooks/useAuth.ts:95-109) wraps session retrieval with a timeout:

```typescript
let session = null
try {
  const sessionResult = await Promise.race([
    supabase.auth.getSession(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Session timeout')), 3000)
    )
  ]) as any
  session = sessionResult?.data?.session || null
} catch (sessionErr) {
  console.error('👤 Session retrieval failed:', sessionErr)
  // Continue without session - we have the user data
}
```

**Why This is Needed:**
- Network issues or Supabase outages can cause `getSession()` to hang indefinitely
- Without timeout, React component stays in loading state forever
- User data is already loaded from the database, so we can continue without session
- Session will be reestablished on next auth state change

#### Refreshing User State

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

## Troubleshooting Guide

### Electron Won't Start

**Error:** `TypeError: Cannot read properties of undefined (reading 'whenReady')`

**Solution:**
```bash
# Check if ELECTRON_RUN_AS_NODE is set
env | grep ELECTRON

# If it shows ELECTRON_RUN_AS_NODE=1, unset it:
unset ELECTRON_RUN_AS_NODE && npm run dev:electron
```

**Permanent fix:** Add to your shell profile (~/.zshrc or ~/.bashrc):
```bash
unset ELECTRON_RUN_AS_NODE
```

### App Stuck on Loading Screen

**Symptoms:**
- Console shows "👤 User loaded successfully" but never shows "👤 Setting auth state"
- App displays "Loading YapMe..." indefinitely

**Causes:**
- Supabase `getSession()` call is hanging
- Network connectivity issues
- Supabase service outage

**Solution:**
The app now has built-in timeout protection (3 seconds). If still occurring:
1. Check network connection
2. Check Supabase status: https://status.supabase.com
3. Check browser console for specific errors
4. Try clearing browser cache and restarting

### TypeScript Errors for import.meta.env

**Error:** `Property 'env' does not exist on type 'ImportMeta'`

**Solution:** Ensure [desktop/src/vite-env.d.ts](desktop/src/vite-env.d.ts) exists with proper type definitions.

### Build Output Shows Bundled Electron Code

**Symptom:** `dist-electron/main.js` is huge (>100KB) or contains Electron source code

**Solution:** Check [vite.config.ts](desktop/vite.config.ts:18-20) includes `external: ['electron']` in rollupOptions.

### Port 5173 Already in Use

**Error:** `Port 5173 is already in use`

**Solution:**
```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9

# Or use a different port in vite.config.ts
```

### Two Browser Sessions Can't Connect

**Possible Causes:**
1. Server not running (check Railway deployment)
2. WebSocket connection blocked by network/firewall
3. CORS issues with server

**Debug Steps:**
```bash
# Check if server is reachable
curl https://yapme-production.up.railway.app/health

# Check WebSocket in browser console
# Should see Socket.io connection logs
```

## Product Philosophy

**Voice-only by design:** No text chat. No "just one more feature." The entire value proposition is simplicity and presence awareness for voice.

**Privacy-first:** Minimal data collection, E2E encryption (Phase 2), auto-deletion of messages, no logs or transcripts.

**Budget-conscious:** Architecture designed for <$10/month at <100 users. Every technical decision considers cost at small scale.

**Speed over perfection:** MVP focuses on core PTT experience. Polish and advanced features come after validating the core loop.
