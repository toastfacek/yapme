import { Device } from 'mediasoup-client'
import type { RtpCapabilities } from 'mediasoup-client/lib/RtpParameters'
import type { Transport } from 'mediasoup-client/lib/Transport'
import type { Producer } from 'mediasoup-client/lib/Producer'

export interface WebRTCTransportParams {
  id: string
  iceParameters: any
  iceCandidates: any[]
  dtlsParameters: any
}

export class WebRTCManager {
  private device: Device | null = null
  private sendTransport: Transport | null = null
  private recvTransport: Transport | null = null
  private producer: Producer | null = null
  private audioStream: MediaStream | null = null

  async initDevice(routerRtpCapabilities: RtpCapabilities): Promise<void> {
    this.device = new Device()
    await this.device.load({ routerRtpCapabilities })
    console.log('✅ Mediasoup device loaded')
  }

  getDevice(): Device | null {
    return this.device
  }

  async createSendTransport(
    transportParams: WebRTCTransportParams,
    onConnect: (dtlsParameters: any) => Promise<void>,
    onProduce: (kind: string, rtpParameters: any) => Promise<string>
  ): Promise<Transport> {
    if (!this.device) {
      throw new Error('Device not initialized')
    }

    this.sendTransport = this.device.createSendTransport(transportParams)

    this.sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        await onConnect(dtlsParameters)
        callback()
      } catch (error) {
        errback(error as Error)
      }
    })

    this.sendTransport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
      try {
        const id = await onProduce(kind, rtpParameters)
        callback({ id })
      } catch (error) {
        errback(error as Error)
      }
    })

    console.log('✅ Send transport created')
    return this.sendTransport
  }

  async createRecvTransport(
    transportParams: WebRTCTransportParams,
    onConnect: (dtlsParameters: any) => Promise<void>
  ): Promise<Transport> {
    if (!this.device) {
      throw new Error('Device not initialized')
    }

    this.recvTransport = this.device.createRecvTransport(transportParams)

    this.recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        await onConnect(dtlsParameters)
        callback()
      } catch (error) {
        errback(error as Error)
      }
    })

    console.log('✅ Receive transport created')
    return this.recvTransport
  }

  async getAudioStream(): Promise<MediaStream> {
    if (this.audioStream) {
      return this.audioStream
    }

    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      })

      console.log('🎤 Audio stream acquired')
      return this.audioStream
    } catch (error) {
      console.error('Failed to get audio stream:', error)
      throw error
    }
  }

  async produce(): Promise<Producer | null> {
    if (!this.sendTransport) {
      console.error('Send transport not created')
      return null
    }

    try {
      const stream = await this.getAudioStream()
      const audioTrack = stream.getAudioTracks()[0]

      console.log('🎤 Audio track details:', {
        kind: audioTrack.kind,
        enabled: audioTrack.enabled,
        muted: audioTrack.muted,
        readyState: audioTrack.readyState,
        label: audioTrack.label
      })

      this.producer = await this.sendTransport.produce({
        track: audioTrack,
      })

      console.log('🎤 Producer created:', this.producer.id)
      console.log('🎤 Producer track:', this.producer.track?.readyState)
      return this.producer
    } catch (error) {
      console.error('Failed to produce:', error)
      return null
    }
  }

  closeProducer(): void {
    if (this.producer) {
      this.producer.close()
      this.producer = null
      console.log('🎤 Producer closed')
    }

    // Stop and clear the audio stream so we get a fresh one next time
    if (this.audioStream) {
      this.audioStream.getTracks().forEach((track) => track.stop())
      this.audioStream = null
      console.log('🎤 Audio stream stopped')
    }
  }

  async consume(
    producerId: string,
    onConsume: (producerId: string, rtpCapabilities: RtpCapabilities) => Promise<any>
  ): Promise<MediaStream | null> {
    if (!this.recvTransport || !this.device) {
      console.error('Receive transport or device not ready')
      return null
    }

    try {
      const { id, kind, rtpParameters } = await onConsume(
        producerId,
        this.device.rtpCapabilities
      )

      const consumer = await this.recvTransport.consume({
        id,
        producerId,
        kind,
        rtpParameters,
      })

      const stream = new MediaStream([consumer.track])
      console.log('🔊 Consumer created, playing audio')

      return stream
    } catch (error) {
      console.error('Failed to consume:', error)
      return null
    }
  }

  cleanup(): void {
    this.closeProducer()

    if (this.sendTransport) {
      this.sendTransport.close()
      this.sendTransport = null
    }

    if (this.recvTransport) {
      this.recvTransport.close()
      this.recvTransport = null
    }

    if (this.audioStream) {
      this.audioStream.getTracks().forEach((track) => track.stop())
      this.audioStream = null
    }

    console.log('🧹 WebRTC cleaned up')
  }
}
