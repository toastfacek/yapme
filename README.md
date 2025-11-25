# YapMe 🎙️

> Voice-only buddy list for remote friends. Like AOL Messenger meets walkie-talkies.

**Status:** MVP Development (Target: Sunday Launch)

## Quick Start

### Prerequisites
- Node.js 20+
- npm
- Supabase account
- Railway account (for deployment)

### Setup

1. **Clone and install dependencies**
```bash
# Desktop app
cd desktop
npm install

# Backend server
cd ../server
npm install
```

2. **Configure environment variables**
```bash
# Desktop
cd desktop
cp .env.example .env
# Edit .env with your Supabase credentials

# Server
cd ../server
cp .env.example .env
# Edit .env with your Supabase and Railway credentials
```

3. **Run in development**
```bash
# Terminal 1: Start server
cd server
npm run dev

# Terminal 2: Start desktop app
cd desktop
npm run dev:electron
```

## Project Structure

```
yaplist/
├── desktop/          # Electron + React app
│   ├── electron/     # Electron main process
│   └── src/          # React frontend
├── server/           # Node.js backend (Express + Socket.io + Mediasoup)
├── docs/             # Design documents
├── plan.md           # Implementation plan
└── CLAUDE.md         # AI context
```

## Tech Stack

- **Desktop:** Electron 28, React 18, TypeScript, Vite
- **Backend:** Node.js, Express, Socket.io, Mediasoup
- **Database:** Supabase (Postgres + Auth + Realtime)
- **Audio:** WebRTC (Mediasoup SFU)

## Development Commands

### Desktop
```bash
npm run dev              # Start Vite dev server
npm run dev:electron     # Run full Electron app
npm run build            # Build for production
npm run build:electron   # Build macOS .dmg
```

### Server
```bash
npm run dev              # Start with hot reload
npm run build            # Compile TypeScript
npm run start            # Run production build
```

## MVP Features (Sunday Launch)

### ✅ Working Now
- ✅ Google OAuth login
- ✅ Username selection
- ✅ Add friends by username
- ✅ Friend list with status (Available/Offline)
- ✅ Real-time presence updates
- ✅ Select friend (dial metaphor)
- ✅ Push-to-talk button (UI complete)

### 🔄 In Progress
- 🔄 Live audio streaming (WebRTC implementation next)

## Phase 2 (Post-Launch)

- Voice messages for offline friends
- E2E encryption
- Windows/Linux builds
- System tray icon
- Focus/DND status
- Custom status messages

## Contributing

This is currently a solo project for rapid MVP development. Feedback welcome after launch!

## License

MIT
