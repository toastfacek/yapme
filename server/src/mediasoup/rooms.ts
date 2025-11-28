import { types as MediasoupTypes } from 'mediasoup'
import { getRouter } from './worker'

interface Peer {
  userId: string
  socketId: string
  sendTransport?: MediasoupTypes.WebRtcTransport
  recvTransport?: MediasoupTypes.WebRtcTransport
  producer?: MediasoupTypes.Producer
  consumers: Map<string, MediasoupTypes.Consumer> // consumerId -> Consumer
}

// Map of roomId -> Map of userId -> Peer
const rooms = new Map<string, Map<string, Peer>>()

export function createRoom(roomId: string): void {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Map())
    console.log(`📦 Created room: ${roomId}`)
  }
}

export function addPeerToRoom(roomId: string, userId: string, socketId: string): void {
  createRoom(roomId)
  const room = rooms.get(roomId)!

  // Don't replace existing peer - they might have transports already
  if (room.has(userId)) {
    // Update socket ID but keep transports
    const existingPeer = room.get(userId)!
    existingPeer.socketId = socketId
    console.log(`👤 Updated peer ${userId} socket in room ${roomId}`)
    return
  }

  room.set(userId, {
    userId,
    socketId,
    consumers: new Map(),
  })

  console.log(`👤 Added peer ${userId} to room ${roomId}`)
}

export function removePeerFromRoom(roomId: string, userId: string): void {
  const room = rooms.get(roomId)
  if (!room) return

  const peer = room.get(userId)
  if (peer) {
    // Close transports
    peer.sendTransport?.close()
    peer.recvTransport?.close()
    peer.producer?.close()
    peer.consumers.forEach((consumer) => consumer.close())

    room.delete(userId)
    console.log(`👤 Removed peer ${userId} from room ${roomId}`)

    // Delete room if empty
    if (room.size === 0) {
      rooms.delete(roomId)
      console.log(`📦 Deleted empty room: ${roomId}`)
    }
  }
}

export function getPeer(roomId: string, userId: string): Peer | undefined {
  return rooms.get(roomId)?.get(userId)
}

export function getRoom(roomId: string): Map<string, Peer> | undefined {
  return rooms.get(roomId)
}

export function getRoomPeers(roomId: string): string[] {
  const room = rooms.get(roomId)
  return room ? Array.from(room.keys()) : []
}

export async function createWebRtcTransport(
  roomId: string,
  userId: string,
  direction: 'send' | 'recv'
): Promise<MediasoupTypes.WebRtcTransport> {
  const router = getRouter()
  if (!router) {
    throw new Error('Router not initialized')
  }

  const peer = getPeer(roomId, userId)
  if (!peer) {
    throw new Error('Peer not found')
  }

  // WebRTC transport options
  const transport = await router.createWebRtcTransport({
    listenIps: [
      {
        ip: '0.0.0.0',
        announcedIp: process.env.ANNOUNCED_IP || undefined,
      },
    ],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
  })

  // Store transport
  if (direction === 'send') {
    peer.sendTransport = transport
  } else {
    peer.recvTransport = transport
  }

  console.log(`🚚 Created ${direction} transport for ${userId} in room ${roomId}`)

  return transport
}

export async function connectTransport(
  roomId: string,
  userId: string,
  transportId: string,
  dtlsParameters: MediasoupTypes.DtlsParameters
): Promise<void> {
  const peer = getPeer(roomId, userId)
  if (!peer) {
    throw new Error('Peer not found')
  }

  const transport =
    peer.sendTransport?.id === transportId
      ? peer.sendTransport
      : peer.recvTransport?.id === transportId
      ? peer.recvTransport
      : null

  if (!transport) {
    throw new Error('Transport not found')
  }

  await transport.connect({ dtlsParameters })
  console.log(`🔌 Connected transport for ${userId}`)
}

export async function createProducer(
  roomId: string,
  userId: string,
  transportId: string,
  rtpParameters: MediasoupTypes.RtpParameters,
  kind: MediasoupTypes.MediaKind
): Promise<MediasoupTypes.Producer> {
  const peer = getPeer(roomId, userId)
  if (!peer || !peer.sendTransport) {
    throw new Error('Peer or send transport not found')
  }

  if (peer.sendTransport.id !== transportId) {
    throw new Error('Transport ID mismatch')
  }

  const producer = await peer.sendTransport.produce({
    kind,
    rtpParameters,
  })

  peer.producer = producer
  console.log(`🎤 Created producer for ${userId} in room ${roomId}`)

  return producer
}

export async function createConsumer(
  roomId: string,
  socketId: string,
  producerId: string,
  rtpCapabilities: MediasoupTypes.RtpCapabilities
): Promise<MediasoupTypes.Consumer | null> {
  const router = getRouter()
  if (!router) {
    throw new Error('Router not initialized')
  }

  // Find the peer by socketId
  const room = getRoom(roomId)
  if (!room) {
    throw new Error('Room not found')
  }

  let consumerPeer: Peer | undefined
  for (const peer of room.values()) {
    if (peer.socketId === socketId) {
      consumerPeer = peer
      break
    }
  }

  if (!consumerPeer || !consumerPeer.recvTransport) {
    console.log(`⚠️ Cannot create consumer: peer with socket ${socketId} has no recv transport`)
    return null
  }

  // Check if router can consume
  if (!router.canConsume({ producerId, rtpCapabilities })) {
    console.log(`⚠️ Cannot consume: router cannot consume with given capabilities`)
    return null
  }

  const consumer = await consumerPeer.recvTransport.consume({
    producerId,
    rtpCapabilities, // ✅ Use peer's device capabilities, not router's
    paused: false,
  })

  consumerPeer.consumers.set(consumer.id, consumer)
  console.log(`🔊 Created consumer for ${consumerPeer.userId} consuming producer ${producerId}`)

  return consumer
}

export function getProducer(roomId: string, userId: string): MediasoupTypes.Producer | undefined {
  return getPeer(roomId, userId)?.producer
}

export function closeProducer(roomId: string, userId: string): void {
  const peer = getPeer(roomId, userId)
  if (peer?.producer) {
    peer.producer.close()
    peer.producer = undefined
    console.log(`🎤 Closed producer for ${userId}`)

    // Close all consumers consuming this producer
    const room = getRoom(roomId)
    if (room) {
      for (const [, otherPeer] of room.entries()) {
        otherPeer.consumers.forEach((consumer, consumerId) => {
          consumer.close()
          otherPeer.consumers.delete(consumerId)
        })
      }
    }
  }
}
