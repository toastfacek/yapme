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

    return this.recvTransport
  }

  async getAudioStream(): Promise<MediaStream> {
    if (this.audioStream) {
      return this.audioStream
    }

    this.audioStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    })

    return this.audioStream
  }

  async produce(): Promise<Producer | null> {
    if (!this.sendTransport) {
      console.error('Send transport not created')
      return null
    }

    try {
      const stream = await this.getAudioStream()
      const audioTrack = stream.getAudioTracks()[0]

      this.producer = await this.sendTransport.produce({
        track: audioTrack,
      })

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
    }

    if (this.audioStream) {
      this.audioStream.getTracks().forEach((track) => track.stop())
      this.audioStream = null
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

      // Resume the consumer (ensures track is enabled)
      await consumer.resume()

      return new MediaStream([consumer.track])
    } catch (error) {
      console.error('Failed to consume:', error)
      return null
    }
  }

  getRecvTransport(): Transport | null {
    return this.recvTransport
  }

  hasRecvTransport(): boolean {
    return this.recvTransport !== null
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
  }
}
