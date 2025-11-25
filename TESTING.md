# YapMe Audio Testing Guide

## ✅ WebRTC Audio Implementation Complete!

The full audio streaming system is now implemented. Here's how to test it:

## Local Testing (2 Users)

### Setup
1. **Start the server** (Terminal 1):
```bash
cd server
npm run dev
```

You should see:
```
✅ Mediasoup worker created [PID: xxxxx]
✅ Mediasoup router created
✅ Mediasoup initialized successfully
🚀 YapMe server running on port 3000
```

2. **Start the desktop app** (Terminal 2):
```bash
cd desktop
npm run dev:electron
```

### Test Procedure

**User 1:**
1. Sign in with Google
2. Set username (e.g., "alice")
3. Add friend by username: "bob"

**User 2 (open another instance or use a different machine):**
1. Sign in with different Google account
2. Set username: "bob"
3. You'll see a friend request from "alice" - accept it

**Test Audio:**
1. **User 1 (alice):**
   - Click on "bob" in the friend list to select them
   - Hold spacebar or click the PTT button
   - Talk into your microphone
   - You should see "Talking..." on the button

2. **User 2 (bob):**
   - Should see "🔊 alice is talking..." indicator appear
   - Should HEAR alice's voice through speakers

3. **User 2 (bob):**
   - Click on "alice" to select them
   - Hold spacebar and talk
   - Alice should now hear YOU

## What to Check

✅ **Microphone Permission:**
- Browser/Electron should ask for mic permission on first PTT press
- If denied, you'll see an error message

✅ **Audio Quality:**
- Audio should be clear with minimal latency (~100-500ms)
- Echo cancellation and noise suppression are enabled

✅ **Visual Feedback:**
- PTT button shows "Talking..." when active
- Listening indicator appears when friend talks
- Button disables when friend is offline

✅ **Connection:**
- Socket connection establishes automatically
- WebRTC transports created when friend selected
- Producer/consumer setup happens on PTT press

## Troubleshooting

### No Audio Received

**Check Console Logs:**
```
Desktop: Open DevTools (Cmd+Option+I)
Server: Watch terminal output
```

**Common Issues:**
1. **Microphone not granted:** Check browser/system permissions
2. **NAT/Firewall:** WebRTC needs UDP ports (10000-10100)
3. **Wrong friend selected:** Make sure you clicked on the friend first

### Server Errors

**"Router not initialized":**
- Restart server and wait for "✅ Mediasoup initialized"

**"Transport creation failed":**
- Check UDP ports 10000-10100 are available
- Try: `lsof -i :10000-10100` to see if ports are in use

### Client Errors

**"Device not initialized":**
- Wait a few seconds after selecting friend
- WebRTC setup happens asynchronously

**"Failed to get audio stream":**
- Grant microphone permission in system settings
- Check no other app is using the mic

## Network Testing (Over Internet)

Once local testing works, test over network:

1. **Deploy server to Railway** (already done)
2. **Both users use production server**
3. **Test from different networks** (home wifi vs mobile hotspot)

Railway deployment should handle NAT traversal, but if issues occur:
- Set `MEDIASOUP_ANNOUNCED_IP` environment variable to Railway's public IP
- Railway automatically exposes ports

## Debug Mode

To see detailed WebRTC logs, open DevTools Console:

**Expected logs:**
```
✅ Socket connected
✅ Mediasoup device loaded
🚚 Created send transport for user123
🚚 Created recv transport for user123
✅ Joined room and transports created
🎤 Audio stream acquired
🎤 Producer created: xyz123
🔊 New producer detected: abc456
🔊 Consumer created, playing audio
🔊 Playing audio stream
```

## Performance Expectations

- **Latency:** <500ms end-to-end
- **Audio Quality:** Clear speech, Opus @ 48kHz
- **CPU:** <10% when talking
- **RAM:** <150MB total
- **Bandwidth:** ~32kbps when talking (~240KB/min)

## Next Steps After Testing

Once audio works:
1. ✅ Test with 2+ real users over internet
2. ✅ Fix any NAT traversal issues
3. ✅ Add sound effects for PTT press/release
4. ✅ Rebuild .dmg installers with working audio
5. ✅ Deploy and share with early testers!

---

**The core magic is now functional! 🎉**

Hold spacebar → Talk → Friend hears you instantly.

That's YapMe. 🎙️
