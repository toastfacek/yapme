import express from 'express'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import cors from 'cors'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { createWorker, createRouter, getRouter } from './mediasoup/worker'
import {
  createRoom,
  addPeerToRoom,
  removePeerFromRoom,
  createWebRtcTransport,
  connectTransport,
  createProducer,
  createConsumer,
  closeProducer,
  getRoomPeers,
} from './mediasoup/rooms'

dotenv.config()

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase not configured - status checks will be skipped')
}

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null

// Helper to check if user can receive audio based on status
async function canReceiveAudio(userId: string): Promise<boolean> {
  if (!supabase) return true // Skip check if Supabase not configured
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('status')
      .eq('id', userId)
      .single()
    
    if (error || !data) {
      console.warn(`⚠️ Could not check status for ${userId}:`, error?.message)
      return true // Default to allowing if check fails
    }
    
    // Only 'active' and 'away' users can receive audio
    const canReceive = data.status === 'active' || data.status === 'away'
    if (!canReceive) {
      console.log(`🚫 User ${userId} is ${data.status} - not routing audio`)
    }
    return canReceive
  } catch (err) {
    console.error('Error checking user status:', err)
    return true // Default to allowing on error
  }
}

const app = express()
const httpServer = createServer(app)
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
})

const PORT = process.env.PORT || 3000

// Initialize Mediasoup
;(async () => {
  try {
    await createWorker()
    await createRouter()
    console.log('✅ Mediasoup initialized successfully')
  } catch (error) {
    console.error('❌ Failed to initialize Mediasoup:', error)
    process.exit(1)
  }
})()

// Middleware
app.use(cors())
app.use(express.json())

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Public IP endpoint (for determining ANNOUNCED_IP)
app.get('/public-ip', (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress
  res.json({
    ip,
    note: 'Use this IP for ANNOUNCED_IP environment variable in production'
  })
})

// Invite landing page
app.get('/invite/:code', async (req, res) => {
  const { code } = req.params
  
  if (!supabase) {
    return res.status(500).send('Server configuration error')
  }

  try {
    // Fetch invite data
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .select('*')
      .eq('code', code)
      .single()

    if (inviteError || !invite) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invite Not Found - YapMe</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: monospace; background: #f5f5dc; color: #111; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
            .container { text-align: center; padding: 2rem; }
            h1 { font-size: 1.5rem; margin-bottom: 1rem; }
            p { opacity: 0.7; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🎙️ Invite Not Found</h1>
            <p>This invite link is invalid or has expired.</p>
          </div>
        </body>
        </html>
      `)
    }

    // Fetch sender username
    const { data: sender, error: senderError } = await supabase
      .from('users')
      .select('username')
      .eq('id', invite.sender_id)
      .single()

    const senderName = sender?.username || 'Someone'


    // Check if expired
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return res.status(410).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invite Expired - YapMe</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: monospace; background: #f5f5dc; color: #111; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
            .container { text-align: center; padding: 2rem; }
            h1 { font-size: 1.5rem; margin-bottom: 1rem; }
            p { opacity: 0.7; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🎙️ Invite Expired</h1>
            <p>This invite link has expired.</p>
          </div>
        </body>
        </html>
      `)
    }

    const appUrl = process.env.APP_DOWNLOAD_URL || 'https://github.com/yourusername/yapme/releases'

    // Serve landing page with audio player
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${senderName} wants to yap with you! - YapMe</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: 'Courier New', monospace;
            background: #f5f5dc;
            color: #111;
            margin: 0;
            padding: 2rem;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          .container {
            max-width: 500px;
            width: 100%;
            text-align: center;
          }
          h1 {
            font-size: 1.8rem;
            margin-bottom: 0.5rem;
            font-weight: bold;
          }
          .subtitle {
            font-size: 1rem;
            opacity: 0.7;
            margin-bottom: 2rem;
          }
          .audio-player {
            background: white;
            border: 3px solid #111;
            border-radius: 8px;
            padding: 2rem;
            margin: 2rem 0;
            box-shadow: 4px 4px 0 #111;
          }
          audio {
            width: 100%;
            margin: 1rem 0;
          }
          .cta-button {
            display: inline-block;
            background: #00ff41;
            color: #111;
            padding: 1rem 2rem;
            border: 3px solid #111;
            border-radius: 8px;
            text-decoration: none;
            font-weight: bold;
            font-size: 1.1rem;
            margin-top: 1rem;
            box-shadow: 4px 4px 0 #111;
            transition: transform 0.1s, box-shadow 0.1s;
          }
          .cta-button:hover {
            transform: translate(2px, 2px);
            box-shadow: 2px 2px 0 #111;
          }
          .cta-button:active {
            transform: translate(4px, 4px);
            box-shadow: 0 0 0 #111;
          }
          .footer {
            margin-top: 3rem;
            font-size: 0.8rem;
            opacity: 0.5;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🎙️ ${senderName} wants to yap with you!</h1>
          <p class="subtitle">Listen to their message below</p>
          
          <div class="audio-player">
            <audio controls autoplay>
              <source src="${invite.audio_url}" type="audio/webm">
              <source src="${invite.audio_url}" type="audio/ogg">
              Your browser does not support the audio element.
            </audio>
          </div>

          <a href="${appUrl}" class="cta-button">Get YapMe</a>
          
          <p class="footer">Download YapMe to reply and start yapping!</p>
        </div>
      </body>
      </html>
    `)
  } catch (err) {
    console.error('Error serving invite:', err)
    res.status(500).send('Server error')
  }
})

// Invite API endpoint (JSON for future native handling)
app.get('/api/invite/:code', async (req, res) => {
  const { code } = req.params
  
  if (!supabase) {
    return res.status(500).json({ error: 'Server configuration error' })
  }

  try {
    const { data: invite, error: inviteError } = await supabase
      .from('invites')
      .select('*')
      .eq('code', code)
      .single()

    if (inviteError || !invite) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invite Not Found - YapMe</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: monospace; background: #f5f5dc; color: #111; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
            .container { text-align: center; padding: 2rem; }
            h1 { font-size: 1.5rem; margin-bottom: 1rem; }
            p { opacity: 0.7; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🎙️ Invite Not Found</h1>
            <p>This invite link is invalid or has expired.</p>
          </div>
        </body>
        </html>
      `)
    }

    // Fetch sender username
    const { data: sender, error: senderError } = await supabase
      .from('users')
      .select('username')
      .eq('id', invite.sender_id)
      .single()


    // Check if expired
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Invite expired' })
    }

    res.json({
      code: invite.code,
      senderUsername: sender?.username || null,
      audioUrl: invite.audio_url,
      createdAt: invite.created_at,
    })
  } catch (err) {
    console.error('Error fetching invite:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  // Authentication
  socket.on('authenticate', ({ token, userId }, callback) => {
    console.log('User authenticated:', userId)
    socket.data.userId = userId
    socket.join(`user:${userId}`)

    // Call the callback if provided (for acknowledgment)
    if (callback && typeof callback === 'function') {
      callback({ success: true, userId })
    }

    // Also emit for backward compatibility
    socket.emit('authenticated', { userId })
  })

  // Status updates
  socket.on('update_status', ({ status }) => {
    const userId = socket.data.userId
    if (!userId) return

    console.log(`User ${userId} status: ${status}`)
    // Broadcast status to friends (TODO: filter to actual friends)
    socket.broadcast.emit('presence_update', { userId, status })
  })

  // Call initiation (basic for now)
  socket.on('call_initiate', ({ toUserId }) => {
    const fromUserId = socket.data.userId
    if (!fromUserId) return

    console.log(`Call initiated: ${fromUserId} -> ${toUserId}`)
    io.to(`user:${toUserId}`).emit('incoming_call', {
      fromUserId,
      socketId: socket.id,
    })
  })

  // Call acceptance
  socket.on('call_accept', ({ fromUserId }) => {
    const toUserId = socket.data.userId
    if (!toUserId) return

    console.log(`Call accepted: ${toUserId} accepted ${fromUserId}`)
    io.to(`user:${fromUserId}`).emit('call_accepted', {
      userId: toUserId,
      socketId: socket.id,
    })
  })

  // Call decline
  socket.on('call_decline', ({ fromUserId }) => {
    const toUserId = socket.data.userId
    if (!toUserId) return

    console.log(`Call declined: ${toUserId} declined ${fromUserId}`)
    io.to(`user:${fromUserId}`).emit('call_declined', { userId: toUserId })
  })

  // Call end
  socket.on('call_end', ({ targetUserId }) => {
    const userId = socket.data.userId
    if (!userId) return

    console.log(`Call ended: ${userId} ended call with ${targetUserId}`)
    if (targetUserId) {
      io.to(`user:${targetUserId}`).emit('call_ended', { userId })

      // Clean up WebRTC room
      const roomId = [userId, targetUserId].sort().join('-')
      removePeerFromRoom(roomId, userId)
    }
  })

  // ===== WebRTC SIGNALING HANDLERS =====

  // Get router RTP capabilities
  socket.on('getRouterRtpCapabilities', (_, callback) => {
    try {
      const router = getRouter()
      if (!router) {
        callback({ error: 'Router not initialized' })
        return
      }
      callback({ rtpCapabilities: router.rtpCapabilities })
    } catch (error: any) {
      console.error('getRouterRtpCapabilities error:', error)
      callback({ error: error.message })
    }
  })

  // Create WebRTC transport
  socket.on('createWebRtcTransport', async ({ roomId, direction }, callback) => {
    try {
      const userId = socket.data.userId
      if (!userId) {
        callback({ error: 'Not authenticated' })
        return
      }

      const transport = await createWebRtcTransport(roomId, userId, direction)

      callback({
        params: {
          id: transport.id,
          iceParameters: transport.iceParameters,
          iceCandidates: transport.iceCandidates,
          dtlsParameters: transport.dtlsParameters,
        },
      })
    } catch (error: any) {
      console.error('createWebRtcTransport error:', error)
      callback({ error: error.message })
    }
  })

  // Connect transport
  socket.on('connectTransport', async ({ roomId, transportId, dtlsParameters }, callback) => {
    try {
      const userId = socket.data.userId
      if (!userId) {
        callback({ error: 'Not authenticated' })
        return
      }

      await connectTransport(roomId, userId, transportId, dtlsParameters)
      callback({ success: true })
    } catch (error: any) {
      console.error('connectTransport error:', error)
      callback({ error: error.message })
    }
  })

  // Produce audio
  socket.on('produce', async ({ roomId, transportId, kind, rtpParameters, targetUserId }, callback) => {
    try {
      const userId = socket.data.userId
      if (!userId) {
        callback({ error: 'Not authenticated' })
        return
      }

      const producer = await createProducer(roomId, userId, transportId, rtpParameters, kind)

      callback({ id: producer.id })

      // Get sender username for display
      // TODO: Cache this or get from database
      const senderUsername = userId // For now, use userId. Could fetch username from DB

      // Check if target user can receive audio based on their status
      if (targetUserId) {
        const canReceive = await canReceiveAudio(targetUserId)
        
        if (canReceive) {
          io.to(`user:${targetUserId}`).emit('producer-available', {
            producerId: producer.id,
            senderId: userId,
            senderUsername,
            roomId, // Include roomId so recipient can consume
          })
          console.log(`📢 Producer ${producer.id} from ${userId} routed to ${targetUserId}`)
        } else {
          console.log(`🚫 Producer ${producer.id} from ${userId} NOT routed - ${targetUserId} is DND/offline`)
        }
      }
    } catch (error: any) {
      console.error('produce error:', error)
      callback({ error: error.message })
    }
  })

  // Consume audio
  socket.on('consume', async ({ roomId, producerId, rtpCapabilities }, callback) => {
    try {
      const userId = socket.data.userId
      if (!userId) {
        callback({ error: 'Not authenticated' })
        return
      }

      const consumer = await createConsumer(roomId, socket.id, producerId, rtpCapabilities)

      if (!consumer) {
        callback({ error: 'Failed to create consumer' })
        return
      }

      callback({
        id: consumer.id,
        producerId: consumer.producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
      })
    } catch (error: any) {
      console.error('consume error:', error)
      callback({ error: error.message })
    }
  })

  // Close producer
  socket.on('closeProducer', ({ roomId }) => {
    try {
      const userId = socket.data.userId
      if (!userId) return

      closeProducer(roomId, userId)

      // Notify other peer
      const peers = getRoomPeers(roomId)
      const otherUserId = peers.find((id) => id !== userId)
      if (otherUserId) {
        io.to(`user:${otherUserId}`).emit('producerClosed', { userId })
      }
    } catch (error: any) {
      console.error('closeProducer error:', error)
    }
  })

  // Join room (for WebRTC)
  socket.on('joinRoom', ({ roomId, targetUserId }) => {
    const userId = socket.data.userId
    if (!userId) return

    try {
      createRoom(roomId)
      addPeerToRoom(roomId, userId, socket.id)

      // Notify the other user
      io.to(`user:${targetUserId}`).emit('peerJoined', {
        userId,
        roomId,
      })

      console.log(`👥 User ${userId} joined room ${roomId}`)
    } catch (error: any) {
      console.error('joinRoom error:', error)
    }
  })

  // Leave room
  socket.on('leaveRoom', ({ roomId }) => {
    const userId = socket.data.userId
    if (!userId) return

    try {
      removePeerFromRoom(roomId, userId)

      // Notify other peer
      const peers = getRoomPeers(roomId)
      const otherUserId = peers.find((id) => id !== userId)
      if (otherUserId) {
        io.to(`user:${otherUserId}`).emit('peerLeft', { userId })
      }

      console.log(`👥 User ${userId} left room ${roomId}`)
    } catch (error: any) {
      console.error('leaveRoom error:', error)
    }
  })

  // Disconnect
  socket.on('disconnect', () => {
    const userId = socket.data.userId
    console.log('Client disconnected:', socket.id, userId)
    if (userId) {
      socket.broadcast.emit('presence_update', { userId, status: 'offline' })

      // Clean up any rooms this user was in
      // Note: In production, you'd want to track which rooms the user is in
    }
  })
})

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 YapMe server running on port ${PORT}`)
  console.log(`📡 WebSocket server ready`)
  console.log(`🏥 Health check: http://localhost:${PORT}/health`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...')
  httpServer.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})
