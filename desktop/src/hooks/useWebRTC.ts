import { useState, useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { WebRTCManager } from '@/lib/webrtc'

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000'

interface UseWebRTCProps {
  userId: string | null
  selectedFriendId: string | null
}

export const useWebRTC = ({ userId, selectedFriendId }: UseWebRTCProps) => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isTalking, setIsTalking] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const webrtcManager = useRef<WebRTCManager | null>(null)
  const roomId = useRef<string | null>(null)
  const audioElement = useRef<HTMLAudioElement | null>(null)

  // Initialize socket connection
  useEffect(() => {
    if (!userId) return

    console.log('🔌 Connecting to WebRTC server:', SERVER_URL)

    const newSocket = io(SERVER_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      timeout: 10000,
    })

    newSocket.on('connect', () => {
      console.log('✅ Socket connected to', SERVER_URL)
      setIsConnected(true)
      setError(null)

      // Authenticate
      newSocket.emit('authenticate', { userId })
    })

    newSocket.on('disconnect', () => {
      console.log('❌ Socket disconnected')
      setIsConnected(false)
    })

    newSocket.on('connect_error', (err: any) => {
      console.error('Socket connection error:', err.message)
      setError('Cannot connect to server. Make sure server is running.')
      setIsConnected(false)
    })

    newSocket.on('error', (err: any) => {
      console.error('Socket error:', err)
      setError(err.message || 'Connection error')
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [userId])

  // Initialize WebRTC manager
  useEffect(() => {
    if (!socket || !isConnected) return

    const initWebRTC = async () => {
      try {
        // Get router RTP capabilities
        socket.emit('getRouterRtpCapabilities', null, async (response: any) => {
          if (response.error) {
            setError('Failed to get router capabilities')
            return
          }

          const manager = new WebRTCManager()
          await manager.initDevice(response.rtpCapabilities)
          webrtcManager.current = manager
          console.log('✅ WebRTC manager initialized')
        })
      } catch (err: any) {
        console.error('WebRTC initialization error:', err)
        setError(err.message)
      }
    }

    initWebRTC()
  }, [socket, isConnected])

  // Setup audio element for playback
  useEffect(() => {
    if (!audioElement.current) {
      audioElement.current = new Audio()
      audioElement.current.autoplay = true
    }
  }, [])

  // Listen for incoming audio (newProducer event)
  useEffect(() => {
    if (!socket) return

    const handleNewProducer = async ({ producerId }: { producerId: string }) => {
      console.log('🔊 New producer detected:', producerId)
      setIsListening(true)

      if (!webrtcManager.current || !roomId.current) {
        console.error('WebRTC manager or room not ready')
        return
      }

      try {
        // Consume the producer
        const stream = await webrtcManager.current.consume(
          producerId,
          async (pId, rtpCapabilities) => {
            return new Promise((resolve, reject) => {
              socket.emit(
                'consume',
                {
                  roomId: roomId.current,
                  producerId: pId,
                  rtpCapabilities,
                },
                (response: any) => {
                  if (response.error) {
                    reject(new Error(response.error))
                  } else {
                    resolve(response)
                  }
                }
              )
            })
          }
        )

        if (stream && audioElement.current) {
          audioElement.current.srcObject = stream
          console.log('🔊 Playing audio stream')
        }
      } catch (err) {
        console.error('Failed to consume audio:', err)
      }
    }

    const handleProducerClosed = () => {
      console.log('🔊 Producer closed')
      setIsListening(false)
      if (audioElement.current) {
        audioElement.current.srcObject = null
      }
    }

    socket.on('newProducer', handleNewProducer)
    socket.on('producerClosed', handleProducerClosed)

    return () => {
      socket.off('newProducer', handleNewProducer)
      socket.off('producerClosed', handleProducerClosed)
    }
  }, [socket])

  // Join room when friend is selected
  useEffect(() => {
    if (!socket || !userId || !selectedFriendId || !webrtcManager.current) return

    const joinRoom = async () => {
      const newRoomId = [userId, selectedFriendId].sort().join('-')
      roomId.current = newRoomId

      // Join the room
      socket.emit('joinRoom', {
        roomId: newRoomId,
        targetUserId: selectedFriendId,
      })

      // Create transports
      try {
        // Create send transport
        socket.emit(
          'createWebRtcTransport',
          { roomId: newRoomId, direction: 'send' },
          async (response: any) => {
            if (response.error) {
              console.error('Failed to create send transport:', response.error)
              return
            }

            await webrtcManager.current!.createSendTransport(
              response.params,
              async (dtlsParameters) => {
                return new Promise((resolve, reject) => {
                  socket.emit(
                    'connectTransport',
                    {
                      roomId: newRoomId,
                      transportId: response.params.id,
                      dtlsParameters,
                    },
                    (connectResponse: any) => {
                      if (connectResponse.error) {
                        reject(new Error(connectResponse.error))
                      } else {
                        resolve(connectResponse)
                      }
                    }
                  )
                })
              },
              async (kind, rtpParameters) => {
                return new Promise((resolve, reject) => {
                  socket.emit(
                    'produce',
                    {
                      roomId: newRoomId,
                      transportId: response.params.id,
                      kind,
                      rtpParameters,
                    },
                    (produceResponse: any) => {
                      if (produceResponse.error) {
                        reject(new Error(produceResponse.error))
                      } else {
                        resolve(produceResponse.id)
                      }
                    }
                  )
                })
              }
            )
          }
        )

        // Create receive transport
        socket.emit(
          'createWebRtcTransport',
          { roomId: newRoomId, direction: 'recv' },
          async (response: any) => {
            if (response.error) {
              console.error('Failed to create recv transport:', response.error)
              return
            }

            await webrtcManager.current!.createRecvTransport(
              response.params,
              async (dtlsParameters) => {
                return new Promise((resolve, reject) => {
                  socket.emit(
                    'connectTransport',
                    {
                      roomId: newRoomId,
                      transportId: response.params.id,
                      dtlsParameters,
                    },
                    (connectResponse: any) => {
                      if (connectResponse.error) {
                        reject(new Error(connectResponse.error))
                      } else {
                        resolve(connectResponse)
                      }
                    }
                  )
                })
              }
            )
          }
        )

        console.log('✅ Joined room and transports created')
      } catch (err) {
        console.error('Error setting up transports:', err)
      }
    }

    joinRoom()

    return () => {
      if (roomId.current) {
        socket.emit('leaveRoom', { roomId: roomId.current })
        roomId.current = null
      }
    }
  }, [socket, userId, selectedFriendId])

  // Start talking (produce audio)
  const startTalking = useCallback(async () => {
    if (!webrtcManager.current || !roomId.current) {
      console.error('WebRTC not ready')
      return
    }

    try {
      await webrtcManager.current.produce()
      setIsTalking(true)
      console.log('🎤 Started talking')
    } catch (err: any) {
      console.error('Failed to start talking:', err)
      setError(err.message)
    }
  }, [])

  // Stop talking (close producer)
  const stopTalking = useCallback(() => {
    if (!webrtcManager.current || !roomId.current || !socket) {
      return
    }

    webrtcManager.current.closeProducer()
    socket.emit('closeProducer', { roomId: roomId.current })
    setIsTalking(false)
    console.log('🎤 Stopped talking')
  }, [socket])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (webrtcManager.current) {
        webrtcManager.current.cleanup()
      }
      if (audioElement.current) {
        audioElement.current.srcObject = null
      }
    }
  }, [])

  return {
    isConnected,
    isTalking,
    isListening,
    error,
    startTalking,
    stopTalking,
  }
}
