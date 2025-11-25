#!/bin/bash

# YapList Release Script
# Creates a GitHub release with the built .dmg files

set -e

VERSION="v0.1.0"
RELEASE_DIR="desktop/release"

echo "🚀 Creating YapList $VERSION release..."

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed"
    echo "Install it: brew install gh"
    exit 1
fi

# Check if .dmg files exist
if [ ! -f "$RELEASE_DIR/YapList-0.1.0.dmg" ]; then
    echo "❌ Intel .dmg not found. Run: cd desktop && npm run build:electron"
    exit 1
fi

if [ ! -f "$RELEASE_DIR/YapList-0.1.0-arm64.dmg" ]; then
    echo "❌ ARM .dmg not found. Run: cd desktop && npm run build:electron"
    exit 1
fi

# Create release notes
NOTES="🎙️ **YapList v0.1.0 - MVP Launch**

Voice-only buddy list for remote friends. Like AOL Messenger meets walkie-talkies.

## ✅ Features in This Release

- ✅ Google OAuth login
- ✅ Username selection and user profiles
- ✅ Add friends by username
- ✅ Friend list with real-time status (Available/Offline)
- ✅ Real-time presence updates
- ✅ Select friend (dial metaphor)
- ✅ Push-to-talk button (UI complete)
- ✅ Beautiful retro design system

## 🔄 Coming Soon

- Live WebRTC audio streaming (next major feature!)
- Voice messages for offline friends
- E2E encryption
- Windows/Linux builds

## 📦 Installation

1. **Download the appropriate version for your Mac:**
   - **Apple Silicon (M1/M2/M3):** YapList-0.1.0-arm64.dmg
   - **Intel Mac:** YapList-0.1.0.dmg

2. **Open the .dmg file**

3. **Drag YapList to your Applications folder**

4. **First launch (IMPORTANT):**
   - Find YapList in Applications
   - **Right-click** (or Control+click) on YapList
   - Select \"Open\"
   - Click \"Open\" in the security dialog
   - This is only needed once!

5. **Sign in with Google and start chatting!**

## ⚠️ Known Issues

- **macOS Security Warning:** The app is not code-signed yet, so you must right-click → Open on first launch
- **No Audio Yet:** PTT button is UI-only until WebRTC implementation is complete (Phase 7)
- **macOS Only:** Windows and Linux builds coming in Phase 2
- **Passkey Warnings:** You may see harmless console warnings about FIDO/WebAuthn - these can be ignored

## 🛠 Built With

- Electron 28 + React 18 + TypeScript
- Supabase (Auth + Database + Realtime)
- Railway (Node.js backend)
- Socket.io (signaling)

## 💬 Feedback

This is an early MVP! Please report bugs and share feedback.

Looking for 5-10 early testers to help validate the core experience! 🚀"

echo "📝 Release notes:"
echo "$NOTES"
echo ""
echo "Creating GitHub release..."

# Create the release
gh release create "$VERSION" \
  --title "YapList $VERSION - MVP Launch" \
  --notes "$NOTES" \
  "$RELEASE_DIR/YapList-0.1.0.dmg" \
  "$RELEASE_DIR/YapList-0.1.0-arm64.dmg"

echo "✅ Release created successfully!"
echo ""
echo "📦 Download URLs:"
echo "Intel Mac: https://github.com/toastfacek/yapme/releases/download/$VERSION/YapList-0.1.0.dmg"
echo "Apple Silicon: https://github.com/toastfacek/yapme/releases/download/$VERSION/YapList-0.1.0-arm64.dmg"
echo ""
echo "🎉 Ready to share!"
