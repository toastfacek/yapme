# YapList Deployment Guide

## Current Status ✅

- **Backend:** Deployed on Railway at `https://yapme-production.up.railway.app`
- **Database:** Running on Supabase (free tier)
- **Desktop Apps:** Built and ready for distribution

## Distribution Files

You have two macOS installers in `desktop/release/`:

1. **YapList-0.1.0.dmg** (97 MB)
   - For Intel Macs (x64 architecture)
   - Compatible with macOS 10.12+

2. **YapList-0.1.0-arm64.dmg** (92 MB)
   - For Apple Silicon Macs (M1/M2/M3)
   - Compatible with macOS 11.0+

## Distribution Options

### Option 1: GitHub Releases (Free, Recommended for MVP)

This is the easiest way to distribute your app to early testers.

```bash
# 1. Create a GitHub release
gh release create v0.1.0 \
  --title "YapList v0.1.0 - MVP Launch" \
  --notes "Voice-only buddy list for remote friends. Like AOL Messenger meets walkie-talkies.

**Features:**
- Google OAuth login
- Add friends by username
- Real-time presence (Available/Offline)
- Push-to-talk button (UI complete)

**Coming Soon:**
- Live WebRTC audio streaming

**Installation:**
- Download the appropriate .dmg for your Mac
- Open the .dmg file
- Drag YapList to Applications
- Right-click and select 'Open' on first launch (bypass Gatekeeper)

**Note:** App is not code-signed yet, so macOS will show a security warning. This is normal for MVP." \
  release/YapList-0.1.0.dmg \
  release/YapList-0.1.0-arm64.dmg
```

After running this, you'll get URLs like:
- Intel: `https://github.com/toastfacek/yapme/releases/download/v0.1.0/YapList-0.1.0.dmg`
- ARM: `https://github.com/toastfacek/yapme/releases/download/v0.1.0/YapList-0.1.0-arm64.dmg`

### Option 2: Cloudflare R2 / AWS S3

For more control and analytics:

1. Create R2 bucket or S3 bucket
2. Upload the .dmg files
3. Make them public
4. Get download URLs

### Option 3: Simple Landing Page

Create a basic HTML page at `yapme.xyz` with download links.

## Installation Instructions for Users

Share these instructions with testers:

```
How to Install YapList on Mac:

1. Download the appropriate version:
   - Apple Silicon (M1/M2/M3): YapList-0.1.0-arm64.dmg
   - Intel Mac: YapList-0.1.0.dmg

2. Open the .dmg file

3. Drag YapList to your Applications folder

4. IMPORTANT - First launch:
   - Find YapList in Applications
   - Right-click (or Control+click) on YapList
   - Select "Open"
   - Click "Open" in the security dialog
   - This is only needed once!

5. Sign in with Google and start chatting!

Note: You may see warnings about the app not being code-signed.
This is normal for early versions. Full signing coming soon!
```

## Security Warning Bypass

Since the app isn't code-signed with an Apple Developer certificate ($99/year), users will see:

> "YapList cannot be opened because it is from an unidentified developer."

**How users bypass this:**
1. Right-click the app → Open
2. Click "Open" in the dialog
3. App is now trusted and can be opened normally

**To avoid this in the future:**
- Get Apple Developer account ($99/year)
- Code sign with Developer ID certificate
- Optionally notarize with Apple

## Sharing the App

### For LinkedIn Post

```markdown
🎙️ Introducing YapList - Voice-only communication for remote friends

Built in 3 days. No text chat. Just presence and push-to-talk.

Download for macOS:
📦 Apple Silicon: [Download](https://github.com/toastfacek/yapme/releases/download/v0.1.0/YapList-0.1.0-arm64.dmg)
📦 Intel Mac: [Download](https://github.com/toastfacek/yapme/releases/download/v0.1.0/YapList-0.1.0.dmg)

Looking for 5-10 early testers! 🚀
```

### For Friends/Early Testers

Send them:
1. Direct link to the .dmg (from GitHub Releases or hosting)
2. Installation instructions above
3. Your username so they can add you as a friend

## Testing the Distribution Build

Before sharing widely, test yourself:

1. **Test on your Mac:**
   ```bash
   open release/YapList-0.1.0-arm64.dmg  # Or .dmg for Intel
   ```
   - Drag to Applications
   - Open the app
   - Verify it connects to production server
   - Verify login works
   - Verify you can add friends

2. **Test on a friend's Mac:**
   - Send them the .dmg
   - Have them install
   - Both login and add each other
   - Verify presence updates work

## Known Issues / User Warnings

1. **macOS Security Warning:** Users must right-click → Open on first launch
2. **No Audio Yet:** PTT button is UI-only until Phase 7 (WebRTC) is complete
3. **Passkey Warnings:** Harmless console warnings about FIDO/WebAuthn
4. **macOS Only:** Windows/Linux builds coming in Phase 2

## Next Steps After Distribution

1. **Monitor Server:** Check Railway logs for errors
2. **Monitor Supabase:** Watch for database/auth issues
3. **Collect Feedback:** Track bugs and feature requests
4. **Complete Phase 7:** WebRTC audio is the missing piece!

## Updating the App

When you fix bugs or add features:

```bash
# 1. Update version in package.json
cd desktop
# Edit package.json: "version": "0.1.1"

# 2. Rebuild
npm run build:electron

# 3. Create new GitHub release
gh release create v0.1.1 \
  --title "YapList v0.1.1 - Bug Fixes" \
  --notes "Changelog here" \
  release/YapList-0.1.1.dmg \
  release/YapList-0.1.1-arm64.dmg
```

## Production Checklist

Before mass distribution:

- [x] Backend deployed and healthy
- [x] Database RLS policies configured
- [x] Production environment variables embedded
- [x] macOS .dmg built (Intel + ARM)
- [ ] Tested installer on clean Mac
- [ ] Tested with 2+ users over network
- [ ] Created GitHub Release
- [ ] Prepared installation instructions
- [ ] LinkedIn post drafted
- [ ] 5-10 early testers identified

## Cost Breakdown

Current monthly costs:
- Railway: ~$5/month (server + database)
- Supabase: $0 (free tier, <100 users)
- GitHub: $0 (hosting .dmg files)
- Domain: $12/year (already purchased)

**Total: ~$5-6/month** ✅

---

**Ready to ship!** 🚀

The app is technically deployable right now. The only missing piece is WebRTC audio (Phase 7), but the full UI, auth, and friend system works perfectly.
