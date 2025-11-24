# Technical Design Doc: YapList MVP

*Speed-focused implementation for <100 users on a shoestring budget*

## Architecture Overview

```
┌─────────────┐     WebSocket/HTTPS    ┌─────────────┐
│  Electron   │◄──────────────────────►│   Railway   │
│   Desktop   │                         │   Backend   │
│     App     │      WebRTC Audio       │  (Node.js)  │
└─────────────┘◄──────────────────────►└─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │  Supabase   │
                                        │  (Postgres) │
                                        └─────────────┘
```

## Core Technology Decisions

### Why These Choices Work for <100 Users

**WebRTC: Self-hosted Mediasoup on Railway**
- One-time setup complexity, then ~$5/mo for server
- Handles 100 users easily on single instance
- No per-minute charges eating your budget

**Database: Supabase Free Tier**
- 500MB storage (plenty for user data)
- Realtime subscriptions for presence
- Built-in auth with social providers
- Row Level Security for privacy

**Voice Storage: Railway Disk + Cloudflare R2**
- Railway ephemeral disk for temp files
- R2 free tier: 10GB/mo storage, 1M requests
- Auto-delete after 24h using R2 lifecycle rules

## Database Schema

```sql
-- Users table (managed by Supabase Auth)
users (
  id uuid PRIMARY KEY,
  username text UNIQUE,
  avatar_url text,
  status text DEFAULT 'offline', -- available|focus|dnd|offline
  status_message text,
  last_seen timestamp,
  public_key text -- for E2E encryption
)

-- Friend relationships
friendships (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users,
  friend_id uuid REFERENCES users,
  status text DEFAULT 'pending', -- pending|accepted|blocked
  created_at timestamp,
  UNIQUE(user_id, friend_id)
)

-- Voice messages (ephemeral)
voice_messages (
  id uuid PRIMARY KEY,
  from_user_id uuid REFERENCES users,
  to_user_id uuid REFERENCES users,
  file_url text,
  duration_seconds integer,
  encryption_key text, -- encrypted with recipient's public key
  created_at timestamp DEFAULT now(),
  listened boolean DEFAULT false,
  expires_at timestamp DEFAULT now() + interval '24 hours'
)

-- Presence events (for who's in a call)
presence (
  user_id uuid PRIMARY KEY REFERENCES users,
  socket_id text,
  in_call_with uuid REFERENCES users,
  updated_at timestamp DEFAULT now()
)
```

## Real-time Architecture

### Presence Management
```javascript
// Supabase Realtime for buddy list updates
const presenceChannel = supabase.channel('presence')
  .on('presence', { event: 'sync' }, () => {
    const state = presenceChannel.presenceState()
    updateBuddyList(state)
  })
  .subscribe()

// Status updates
const statusChannel = supabase.channel('status')
  .on('postgres_changes', 
    { event: 'UPDATE', schema: 'public', table: 'users' },
    (payload) => updateBuddyStatus(payload.new)
  )
  .subscribe()
```

### WebRTC Signaling Flow
```javascript
// Simplified signaling through Railway WebSocket
class SignalingServer {
  // When user clicks buddy + holds PTT
  async initiateCall(fromUserId, toUserId) {
    // 1. Check if recipient is available
    const recipient = await getUser(toUserId)
    if (recipient.status !== 'available') {
      return { error: 'User not available' }
    }
    
    // 2. Create WebRTC transport on Mediasoup
    const transport = await mediasoup.createTransport()
    
    // 3. Signal recipient through WebSocket
    ws.to(recipient.socket_id).emit('incoming_call', {
      from: fromUserId,
      transport_params: transport.params
    })
  }
}
```

## E2E Encryption Implementation

### Key Exchange
```javascript
// On first login - generate keypair
const keypair = await crypto.subtle.generateKey(
  { name: 'RSA-OAEP', modulusLength: 2048 },
  true,
  ['encrypt', 'decrypt']
)

// Store public key in database
await supabase.from('users').update({
  public_key: await exportPublicKey(keypair.publicKey)
})

// Keep private key in Electron secure storage
await safeStorage.encryptString(privateKey)
```

### Audio Encryption
```javascript
// Before sending audio through WebRTC
async function encryptAudio(audioBuffer, recipientPublicKey) {
  // Generate AES key for this session
  const sessionKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
  
  // Encrypt audio with AES
  const encryptedAudio = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sessionKey,
    audioBuffer
  )
  
  // Encrypt AES key with recipient's RSA public key
  const encryptedKey = await crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    recipientPublicKey,
    sessionKey
  )
  
  return { encryptedAudio, encryptedKey }
}
```

## Voice Message Flow

### Recording & Upload
```javascript
// When PTT to offline/focus friend
async function recordVoiceMessage(friendId) {
  // 1. Record audio (opus codec for size)
  const recorder = new MediaRecorder(stream, {
    mimeType: 'audio/webm;codecs=opus',
    audioBitsPerSecond: 32000 // ~240KB/min
  })
  
  // 2. Upload to R2 through Railway
  const formData = new FormData()
  formData.append('audio', audioBlob)
  formData.append('recipient_id', friendId)
  
  const response = await fetch(`${API_URL}/voice-message`, {
    method: 'POST',
    body: formData
  })
  
  // 3. Server encrypts and stores URL in DB
  // 4. Auto-deletes after 24h or when played
}
```

## Desktop App Structure

### Electron Main Process
```javascript
// main.js
const { app, BrowserWindow, Tray, globalShortcut } = require('electron')

class YapListApp {
  constructor() {
    this.tray = null
    this.window = null
    this.pttActive = false
  }
  
  init() {
    // System tray with status
    this.tray = new Tray('icon.png')
    this.tray.setToolTip('YapList - Available')
    
    // Global PTT hotkey (even when minimized)
    globalShortcut.register('CommandOrControl+Shift+Space', () => {
      this.handleGlobalPTT()
    })
    
    // Auto-start on boot
    app.setLoginItemSettings({
      openAtLogin: true,
      openAsHidden: true
    })
  }
}
```

### React Frontend Structure
```
src/
├── components/
│   ├── BuddyList.tsx       # Main list UI
│   ├── BuddyItem.tsx       # Individual friend row
│   ├── StatusPicker.tsx    # Status dropdown
│   └── PTTButton.tsx       # Visual PTT indicator
├── hooks/
│   ├── useSupabase.ts      # Auth & realtime
│   ├── useWebRTC.ts        # Audio calls
│   └── usePresence.ts      # Status management
├── lib/
│   ├── encryption.ts       # E2E crypto functions
│   └── audio.ts            # Audio processing
└── App.tsx
```

## Server Implementation (Railway)

### Directory Structure
```
server/
├── index.js              # Express + Socket.io server
├── mediasoup.js          # WebRTC media server
├── voice-messages.js     # R2 upload/download
├── signaling.js          # WebRTC signaling
└── presence.js           # Status management
```

### Mediasoup Config for Budget
```javascript
// Single worker for <100 users
const worker = await mediasoup.createWorker({
  rtcMinPort: 40000,
  rtcMaxPort: 40100, // Only 100 ports needed
  logLevel: 'warn'
})

// One router handles all users
const router = await worker.createRouter({
  mediaCodecs: [
    {
      kind: 'audio',
      mimeType: 'audio/opus',
      clockRate: 48000,
      channels: 2
    }
  ]
})
```

## Week 1 Implementation Plan

### Day 1-2: Foundation
- [ ] Set up Railway + Supabase
- [ ] Basic Electron app with system tray
- [ ] Supabase auth with Google/Discord
- [ ] Database schema + RLS policies

### Day 3-4: Buddy List
- [ ] Buddy list UI with status indicators
- [ ] Add/accept friend flow  
- [ ] Realtime presence updates
- [ ] Status changes + custom messages

### Day 5-6: Voice Calling
- [ ] Mediasoup setup on Railway
- [ ] Basic WebRTC connection
- [ ] PTT mechanics (spacebar hold)
- [ ] Audio streaming between users

### Day 7: Polish & Voice Messages
- [ ] Voice messages for offline users
- [ ] E2E encryption implementation
- [ ] Notification sounds
- [ ] Package and distribute

## Cost Breakdown

| Service | Usage | Cost/mo |
|---------|-------|---------|
| Railway | 1 vCPU, 512MB RAM | ~$5 |
| Supabase | Free tier | $0 |
| Cloudflare R2 | <10GB storage | $0 |
| Domain | yaplist.com | ~$1 |
| **Total** | | **~$6/mo** |

## Quick Start Commands

```bash
# Clone and setup
git clone [repo]
cd yaplist

# Install dependencies
cd desktop && npm install
cd ../server && npm install

# Environment variables
cp .env.example .env
# Add Supabase URL, Railway URL, etc.

# Development
npm run dev:desktop  # Electron app
npm run dev:server   # Railway backend

# Build for distribution
npm run build:mac    # macOS .dmg
npm run build:win    # Windows .exe
npm run build:linux  # Linux .AppImage
```

## Security Considerations

1. **E2E Voice**: Audio encrypted client-side before relay
2. **Voice Messages**: Encrypted at rest with recipient's public key
3. **Authentication**: OAuth only, no passwords to leak
4. **Auto-expiry**: Voice messages deleted after 24h
5. **No logs**: No message history or transcripts kept

## Scaling Beyond MVP

When you hit 100+ users:
1. Add Redis for presence (vs. in-memory)
2. Multiple Mediasoup workers
3. Consider switching to Cloudflare Calls (when available)
4. Add CDN for desktop app downloads
5. Implement room servers for "Presence Parties"

---

**Let's build! First step: Set up the Railway project and Supabase instance?**
