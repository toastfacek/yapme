import { useState, useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { WebRTCManager } from '@/lib/webrtc'

const SERVER_URL = import.meta.env.VITE_WS_URL || import.meta.env.VITE_SERVER_URL || 'https://yapme-production.up.railway.app'

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
  const audioContext = useRef<AudioContext | null>(null)
  const gainNode = useRef<GainNode | null>(null)
  const mediaStreamSource = useRef<MediaStreamAudioSourceNode | null>(null)
  const htmlAudioEl = useRef<HTMLAudioElement | null>(null)

  // Initialize socket connection
  useEffect(() => {
    if (!userId) return

    const newSocket = io(SERVER_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      timeout: 10000,
    })

    newSocket.on('connect', () => {
      console.log('✅ Connected to WebRTC server')
      setIsConnected(true)
      setError(null)

      // Authenticate
      newSocket.emit('authenticate', { userId }, (response: any) => {
        if (response?.error) {
          console.error('Authentication failed:', response.error)
          setError(`Authentication failed: ${response.error}`)
        }
      })
    })

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from server')
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
        socket.emit('getRouterRtpCapabilities', null, async (response: any) => {
          if (response.error) {
            setError('Failed to get router capabilities')
            return
          }

          const manager = new WebRTCManager()
          await manager.initDevice(response.rtpCapabilities)
          webrtcManager.current = manager
        })
      } catch (err: any) {
        console.error('WebRTC initialization error:', err)
        setError(err.message)
      }
    }

    initWebRTC()
  }, [socket, isConnected])

  // Setup Web Audio API for playback
  useEffect(() => {
    if (!audioContext.current) {
      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      gainNode.current = audioContext.current.createGain()
      gainNode.current.gain.value = 1.0
      gainNode.current.connect(audioContext.current.destination)
      audioContext.current.resume()
    }
  }, [])

  // Resume AudioContext on user interaction (autoplay policy)
  useEffect(() => {
    const resumeOnInteraction = async () => {
      if (audioContext.current?.state === 'suspended') {
        await audioContext.current.resume()
      }
      if (htmlAudioEl.current) {
        try {
          await htmlAudioEl.current.play()
        } catch (err) {
          // Ignore - will retry on next interaction
        }
      }
    }

    document.addEventListener('click', resumeOnInteraction, { once: true })
    return () => document.removeEventListener('click', resumeOnInteraction)
  }, [])

  // Listen for incoming audio (newProducer event)
  useEffect(() => {
    if (!socket) return

    const handleNewProducer = async ({ producerId }: { producerId: string }) => {
      setIsListening(true)

      if (!webrtcManager.current || !roomId.current) {
        console.error('WebRTC manager or room not ready')
        return
      }

      try {
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

        if (stream && audioContext.current && gainNode.current) {
          // Resume AudioContext if suspended
          if (audioContext.current.state === 'suspended') {
            await audioContext.current.resume()
          }

          // Disconnect old source if exists
          if (mediaStreamSource.current) {
            mediaStreamSource.current.disconnect()
          }

          // Route audio through Web Audio API
          mediaStreamSource.current = audioContext.current.createMediaStreamSource(stream)
          mediaStreamSource.current.connect(gainNode.current)

          // Also use HTMLAudioElement as backup
          if (!htmlAudioEl.current) {
            htmlAudioEl.current = document.createElement('audio')
            htmlAudioEl.current.style.display = 'none'
            htmlAudioEl.current.playsInline = true
            htmlAudioEl.current.autoplay = true
            document.body.appendChild(htmlAudioEl.current)
          }
          htmlAudioEl.current.srcObject = stream
          htmlAudioEl.current.muted = false
          htmlAudioEl.current.volume = 1.0
          htmlAudioEl.current.play().catch(() => {})
        }
      } catch (err) {
        console.error('Failed to consume audio:', err)
      }
    }

    const handleProducerClosed = () => {
      setIsListening(false)

      if (mediaStreamSource.current) {
        mediaStreamSource.current.disconnect()
        mediaStreamSource.current = null
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

      socket.emit('joinRoom', {
        roomId: newRoomId,
        targetUserId: selectedFriendId,
      })

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
    if (audioContext.current?.state !== 'running') {
      await audioContext.current?.resume()
    }

    if (!webrtcManager.current || !roomId.current) {
      console.error('WebRTC not ready')
      return
    }

    try {
      await webrtcManager.current.produce()
      setIsTalking(true)
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
  }, [socket])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (webrtcManager.current) {
        webrtcManager.current.cleanup()
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
