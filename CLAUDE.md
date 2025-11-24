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

## Code Structure (Planned)

### Desktop App
```
desktop/
├── src/
│   ├── components/
│   │   ├── BuddyList.tsx       # Main buddy list UI
│   │   ├── BuddyItem.tsx       # Individual friend row
│   │   ├── StatusPicker.tsx    # Status dropdown
│   │   └── PTTButton.tsx       # Visual PTT indicator
│   ├── hooks/
│   │   ├── useSupabase.ts      # Auth & realtime connections
│   │   ├── useWebRTC.ts        # WebRTC audio call management
│   │   └── usePresence.ts      # Status/presence management
│   ├── lib/
│   │   ├── encryption.ts       # E2E crypto (RSA + AES)
│   │   └── audio.ts            # Audio processing utilities
│   └── App.tsx
└── main.js                      # Electron main process
```

### Backend
```
server/
├── index.js              # Express + Socket.io entry point
├── mediasoup.js          # WebRTC media server setup
├── voice-messages.js     # R2 upload/download handlers
├── signaling.js          # WebRTC signaling logic
└── presence.js           # Status/presence management
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
# Setup (when code exists)
cd desktop && npm install
cd ../server && npm install

# Copy environment template and fill in values
cp .env.example .env

# Development
npm run dev:desktop  # Run Electron app in dev mode
npm run dev:server   # Run Railway backend locally

# Build for distribution
npm run build:mac    # macOS .dmg
npm run build:win    # Windows .exe
npm run build:linux  # Linux .AppImage
```

## Key Implementation Details

### Push-to-Talk Mechanics
- Click buddy to select target
- Hold spacebar (or Ctrl+Shift+Space globally) to transmit
- Visual indicator shows transmission state
- If recipient unavailable (Focus/DND/Offline), record voice message instead

### Status States
- 🟢 **Available:** Can receive live calls
- 🟡 **Focus:** Voice messages only
- 🔴 **DND:** Cannot contact
- ⚫ **Offline:** Voice messages only
- 🎤 **In Call:** Shows who they're talking to

### Voice Message Behavior
- Maximum 60 seconds per message
- Auto-delete after listening (Snapchat-style)
- Expire after 24 hours if unheard
- Encrypted with recipient's public key

### WebRTC Signaling Flow
1. Check recipient availability via presence
2. Create Mediasoup transport on server
3. Signal recipient through WebSocket
4. Establish P2P audio stream
5. Encrypt audio with session key

### E2E Encryption
- Generate RSA-2048 keypair on first login
- Store public key in database, private key in Electron secure storage
- For each voice session:
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

## Product Philosophy

**Voice-only by design:** No text chat. No "just one more feature." The entire value proposition is simplicity and presence awareness for voice.

**Privacy-first:** Minimal data collection, E2E encryption, auto-deletion of messages, no logs or transcripts.

**Budget-conscious:** Architecture designed for <$10/month at <100 users. Every technical decision considers cost at small scale.
