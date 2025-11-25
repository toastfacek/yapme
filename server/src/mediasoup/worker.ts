import * as mediasoup from 'mediasoup'
import { types as MediasoupTypes } from 'mediasoup'

let worker: MediasoupTypes.Worker | null = null
let router: MediasoupTypes.Router | null = null

// Mediasoup configuration
const mediaCodecs: MediasoupTypes.RtpCodecCapability[] = [
  {
    kind: 'audio',
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 2,
    preferredPayloadType: 111,
  },
]

export async function createWorker(): Promise<MediasoupTypes.Worker> {
  if (worker) {
    return worker
  }

  worker = await mediasoup.createWorker({
    logLevel: 'warn',
    rtcMinPort: 10000,
    rtcMaxPort: 10100,
  })

  console.log('✅ Mediasoup worker created [PID:', worker.pid, ']')

  worker.on('died', () => {
    console.error('❌ Mediasoup worker died, exiting in 2 seconds...')
    setTimeout(() => process.exit(1), 2000)
  })

  return worker
}

export async function createRouter(): Promise<MediasoupTypes.Router> {
  if (router) {
    return router
  }

  if (!worker) {
    await createWorker()
  }

  router = await worker!.createRouter({ mediaCodecs })
  console.log('✅ Mediasoup router created')

  return router
}

export function getRouter(): MediasoupTypes.Router | null {
  return router
}

export function getWorker(): MediasoupTypes.Worker | null {
  return worker
}
