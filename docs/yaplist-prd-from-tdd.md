# PRD: YapList MVP
*AIM-style buddy list for voice-only communication*

## Executive Summary

YapList is a desktop application that brings back the simplicity of AOL Instant Messenger's buddy list with push-to-talk voice communication. Users see who's available and can instantly talk to them by clicking their name and holding spacebar. No channels, no text, just presence and voice.

**MVP Goal:** Launch in 1 week with <100 beta users to validate demand.

## Problem Statement

Remote workers are exhausted by communication tool complexity:
- **Discord/Slack:** Too many channels, notifications, and text to process
- **Zoom/Meet:** Scheduled calls feel like meetings, even with friends
- **Phone calls:** No presence context - is now a good time?
- **Existing voice apps:** Mobile-first, lack desktop presence awareness

**Core Insight:** People want to know who's around and talk to them instantly without the overhead of modern communication platforms.

## Solution

A dead-simple desktop app with three components:
1. **Buddy List** - See who's available/busy/offline
2. **Push-to-Talk** - Click friend + hold spacebar to talk
3. **Voice Messages** - Auto-recorded when friend is away

## User Persona

**Primary User: "Remote Rachel"**
- 25 years old, software engineer
- Works from home, misses office spontaneity
- Has Discord open but muted
- Wants to feel less isolated without being "always on"
- Values privacy and minimal digital footprint

## Core Features (MVP Week 1)

### 1. Authentication & Onboarding
- **Social login only** (Google/Discord)
- **Username selection** (yaplist/username)
- **No profile setup** - Just login and add friends

### 2. Buddy List Interface
- **Vertical list** showing all friends
- **Status indicators:**
  - 🟢 Available - Can receive calls
  - 🟡 Focus - Send voice message instead
  - 🔴 DND - Cannot contact
  - ⚫ Offline - Send voice message
  - 🎤 In Call - Shows who they're talking to
- **Custom status text** (50 characters max)
- **System tray icon** for quick status changes

### 3. Friend Management
- **Add friend** by username
- **Accept/decline** friend requests
- **Remove friend** (no blocking in MVP)
- **Maximum 50 friends** per user (MVP constraint)

### 4. Voice Communication

**Push-to-Talk Mechanics:**
- Click friend name to select
- Hold spacebar (or Ctrl+Shift+Space globally) to transmit
- Release to stop transmitting
- Audio indicator shows when you're talking

**Call Behavior:**
| Friend Status | Your Action | What Happens |
|--------------|-------------|--------------|
| 🟢 Available | Hold PTT | Direct voice streams to them |
| 🟡 Focus | Hold PTT | Records voice message |
| 🔴 DND | Hold PTT | Error sound, no action |
| ⚫ Offline | Hold PTT | Records voice message |
| 🎤 In Call | Hold PTT | Error sound, shows who they're with |

### 5. Voice Messages
- **Auto-recorded** when recipient unavailable
- **Maximum 60 seconds** per message
- **Auto-delete after listening** (like Snapchat)
- **Expire after 24 hours** if unheard
- **Notification** when you have a waiting message
- **No playback controls** - Listen once, in full

### 6. Privacy & Security
- **End-to-end encrypted** voice and messages
- **No transcription** or text records
- **No message history** after consumption
- **Minimal data collection** (only for service operation)

## User Journey

### First Time User
1. Download app from yaplist.com
2. Login with Google/Discord
3. Choose unique username
4. Add first friend by username
5. See friend come online
6. Click friend, hold spacebar, start talking

### Daily Active User
1. App auto-starts (minimized to tray)
2. See notification: "Alex is now available"
3. Click Alex, hold spacebar: "Hey, quick question about the PR"
4. Release spacebar, Alex responds immediately
5. Natural back-and-forth conversation
6. Close window when done (app stays in tray)

## Out of Scope (MVP)

- Mobile apps
- Group calls / "Presence Parties"  
- Hardware PTT button
- Screen sharing or video
- Text chat of any kind
- Call history or recordings
- User profiles/avatars
- Spotify/Discord rich presence
- AI noise cancellation (basic only)
- Custom notification sounds

## Success Metrics

### Week 1 Launch Targets
- [ ] 50 beta users registered
- [ ] 25 users with at least 1 friend added
- [ ] 100 total voice connections
- [ ] <3 second connection time
- [ ] Zero text messages sent (voice only)

### Key Performance Indicators
- **Activation:** % who add at least 1 friend
- **Engagement:** Average PTT presses per day
- **Retention:** % returning after day 1
- **Virality:** Average friends added per user
- **Quality:** % of successful voice connections

## Technical Constraints

### Infrastructure Budget: <$10/month
- Railway backend hosting (~$5/mo)
- Supabase free tier (database/auth)
- Cloudflare R2 free tier (voice messages)
- Direct distribution (no app store fees)

### Performance Requirements
- <100MB RAM usage idle
- <2% CPU usage idle
- <500ms to establish voice connection
- <100ms audio latency
- Works on 1Mbps connection

### Platform Support (MVP)
- macOS 11+ (Intel & Apple Silicon)
- Windows 10/11
- Ubuntu 20.04+ (basic support)
- Direct download only (no app stores)

## Launch Strategy

### Day 1-2: Friends & Family Alpha
- 10 internal testers
- Focus on connection reliability
- Fix critical bugs only

### Day 3-4: Private Beta
- 50 invites to Twitter/Discord followers
- Collect feedback via Discord server
- Monitor server costs and performance

### Day 5-7: Public Beta
- Launch on personal Twitter/LinkedIn
- Post in /r/remotework, Hacker News
- Goal: 100 users to validate demand

## Risk Mitigation

### Technical Risks
| Risk | Mitigation |
|------|------------|
| WebRTC complexity | Use managed Mediasoup |
| Server costs spike | Hard limit 100 users |
| E2E encryption bugs | Ship without E2E if needed |
| Platform-specific issues | Focus on macOS first |

### Product Risks
| Risk | Mitigation |
|------|------------|
| Empty buddy list | "Find friends" onboarding |
| No one available to talk | Voice messages bridge async |
| Feature requests | "Thanks! Focusing on voice for now" |
| "Why not Discord?" | "YapList is for your real friends" |

## Future Roadmap (Post-Validation)

**Month 2:**
- Mobile companion app
- Hardware PTT button
- Presence Parties (group rooms)

**Month 3:**
- Team/Enterprise plans
- Custom domains
- Slack/Discord import

**Month 6:**
- AI features (transcription, translation)
- International servers
- API for integrations

## Competitive Positioning

```
High Complexity
       ↑
Discord ●      ● Slack
       |
Teams ● |      ● Zoom
       |
Voxer ● |      
       |
       |    ● YapList
       |
Text ● |      
       +————————————→
      Async    Real-time
```

**YapList:** Maximum real-time, minimum complexity.

## Final Notes

This MVP is intentionally constrained to validate one core hypothesis: **Remote workers want presence-aware, voice-only communication with their actual friends.**

Everything else can wait until we prove people want this.

---

**Ship date:** 7 days from now  
**Success criteria:** 50 people use it with their friends  
**Total budget:** $10/month + one week of development
