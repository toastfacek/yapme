import express from 'express'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import cors from 'cors'
import dotenv from 'dotenv'
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

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  // Authentication
  socket.on('authenticate', ({ token, userId }) => {
    console.log('User authenticated:', userId)
    socket.data.userId = userId
    socket.join(`user:${userId}`)
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
  socket.on('produce', async ({ roomId, transportId, kind, rtpParameters }, callback) => {
    try {
      const userId = socket.data.userId
      if (!userId) {
        callback({ error: 'Not authenticated' })
        return
      }

      const producer = await createProducer(roomId, userId, transportId, rtpParameters, kind)

      callback({ id: producer.id })

      // Notify other peer that producer is ready
      const peers = getRoomPeers(roomId)
      const otherUserId = peers.find((id) => id !== userId)
      if (otherUserId) {
        io.to(`user:${otherUserId}`).emit('newProducer', {
          producerId: producer.id,
          userId,
        })
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
