import { useState, useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { WebRTCManager } from '@/lib/webrtc'

const SERVER_URL = import.meta.env.VITE_WS_URL || import.meta.env.VITE_SERVER_URL || 'https://yapme-production.up.railway.app'

console.log('🌐 WebRTC Server URL:', SERVER_URL)
console.log('🌐 VITE_WS_URL:', import.meta.env.VITE_WS_URL)
console.log('🌐 VITE_SERVER_URL:', import.meta.env.VITE_SERVER_URL)

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
      console.log('🔐 Authenticating with userId:', userId)
      newSocket.emit('authenticate', { userId }, (response: any) => {
        if (response?.error) {
          console.error('🔐 Authentication failed:', response.error)
          setError(`Authentication failed: ${response.error}`)
        } else {
          console.log('🔐 Authentication successful:', response)
        }
      })
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

  // Setup Web Audio API for playback with volume boost
  // This runs ONCE and refs persist across re-renders
  useEffect(() => {
    // Only create if not already created
    if (!audioContext.current) {
      console.log('🔊 Creating AudioContext with 5x gain boost')

      // Create AudioContext with gain node for volume amplification
      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      gainNode.current = audioContext.current.createGain()

      // BOOST: Set gain to 5x (500%) for very loud audio
      gainNode.current.gain.value = 5.0

      gainNode.current.connect(audioContext.current.destination)

      audioContext.current.resume().then(() => {
        console.log('🔊 AudioContext resumed with 5x gain boost')
      })
    }

    // NO CLEANUP - let refs persist for the component's entire lifetime
    // AudioContext will only be cleaned up when component truly unmounts
  }, [])

  // FIX 3: Resume AudioContext on any click (backup for autoplay policy)
  useEffect(() => {
    const resumeOnInteraction = async () => {
      if (audioContext.current?.state === 'suspended') {
        await audioContext.current.resume()
        console.log('🔊 AudioContext resumed on user interaction')
      }
      if (htmlAudioEl.current) {
        try {
          await htmlAudioEl.current.play()
          console.log('🔊 HTMLAudioElement playback resumed on interaction')
        } catch (err) {
          console.warn('Could not resume HTMLAudioElement:', err)
        }
      }
    }

    document.addEventListener('click', resumeOnInteraction, { once: true })

    return () => {
      document.removeEventListener('click', resumeOnInteraction)
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

        if (stream && audioContext.current && gainNode.current) {
          // FIX 1: Resume AudioContext if suspended (browser autoplay policy)
          if (audioContext.current.state === 'suspended') {
            console.log('🔊 AudioContext suspended, resuming...')
            await audioContext.current.resume()
            console.log('🔊 AudioContext resumed, state:', audioContext.current.state)
          }

          // CRITICAL: Store reference to prevent garbage collection
          // Disconnect old source if exists
          if (mediaStreamSource.current) {
            mediaStreamSource.current.disconnect()
          }

          // Route audio ONLY through Web Audio API for volume boost
          // DO NOT use audio element - creates conflict
          mediaStreamSource.current = audioContext.current.createMediaStreamSource(stream)
          mediaStreamSource.current.connect(gainNode.current)

          // Fallback/parallel: hidden audio element to force playback if Web Audio is blocked
          if (!htmlAudioEl.current) {
            htmlAudioEl.current = document.createElement('audio')
            htmlAudioEl.current.style.display = 'none'
            htmlAudioEl.current.playsInline = true
            htmlAudioEl.current.autoplay = true
            document.body.appendChild(htmlAudioEl.current)

            // Debug listeners
            htmlAudioEl.current.addEventListener('playing', () => {
              console.log('🔊 HTMLAudioElement event: playing')
            })
            htmlAudioEl.current.addEventListener('pause', () => {
              console.log('🔊 HTMLAudioElement event: pause')
            })
            htmlAudioEl.current.addEventListener('ended', () => {
              console.log('🔊 HTMLAudioElement event: ended')
            })
            htmlAudioEl.current.addEventListener('error', (e) => {
              console.error('🔊 HTMLAudioElement error:', e)
            })

            // expose for manual debugging
            ;(window as any).__yap_audio_el = htmlAudioEl.current
          }
          htmlAudioEl.current.srcObject = stream
          htmlAudioEl.current.muted = false
          htmlAudioEl.current.volume = 1.0
          htmlAudioEl.current.play().catch(err => {
            console.warn('HTMLAudioElement play blocked:', err)
          })

          console.log('🔊 Audio routing configured successfully')
          console.log('🔊 Stream tracks:', stream.getTracks().map(t => ({
            kind: t.kind,
            enabled: t.enabled,
            muted: t.muted,
            readyState: t.readyState
          })))
          console.log('🔊 AudioContext state:', audioContext.current.state)
          console.log('🔊 Gain node value:', gainNode.current.gain.value)
          console.log('🔊 MediaStreamSource connected:', !!mediaStreamSource.current)

          // DIAGNOSTIC: Check if audio data is flowing through the stream
          const audioTrack = stream.getAudioTracks()[0]
          if (audioTrack) {
            const settings = audioTrack.getSettings()
            console.log('🔊 Track settings:', settings)
            console.log('🔊 Sample rate:', settings.sampleRate)
            console.log('🔊 Channel count:', settings.channelCount)
          }
        }
      } catch (err) {
        console.error('Failed to consume audio:', err)
      }
    }

    const handleProducerClosed = () => {
      console.log('🔊 Producer closed')
      setIsListening(false)

      // Disconnect and clear media stream source
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
    // FIX 2: Resume AudioContext on PTT press (user gesture)
    if (audioContext.current?.state !== 'running') {
      await audioContext.current?.resume()
      console.log('🔊 AudioContext resumed on PTT press:', audioContext.current?.state)
    }

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
