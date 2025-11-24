import express from 'express'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import cors from 'cors'
import dotenv from 'dotenv'

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
    }
  })

  // Disconnect
  socket.on('disconnect', () => {
    const userId = socket.data.userId
    console.log('Client disconnected:', socket.id, userId)
    if (userId) {
      socket.broadcast.emit('presence_update', { userId, status: 'offline' })
    }
  })
})

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 YapList server running on port ${PORT}`)
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
