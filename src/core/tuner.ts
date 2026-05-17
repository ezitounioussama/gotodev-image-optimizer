import sharp from 'sharp'
import { computeSSIM } from '../utils/ssim.ts'
import type { OutputFormat } from './types.ts'

const SSIM_THRESHOLD = 0.97
const QUALITY_RANGE = [70, 75, 80, 85, 90, 95] as const

export interface TunedResult {
  quality: number
  ssim: number
  size: number
}

export async function autoTuneQuality(
  source: string | Buffer,
  format: OutputFormat,
  options?: {
    threshold?: number
    minQuality?: number
    maxQuality?: number
  },
): Promise<TunedResult> {
  const threshold = options?.threshold ?? SSIM_THRESHOLD
  const minQ = options?.minQuality ?? 70
  const maxQ = options?.maxQuality ?? 95

  const candidateQualities = QUALITY_RANGE.filter((q) => q >= minQ && q <= maxQ)

  const original = await sharp(source)
    .resize(256, 256, { fit: 'inside' })
    .grayscale()
    .raw()
    .toBuffer()

  const originalMeta = await sharp(source).metadata()
  const resizeW = Math.min(256, originalMeta.width ?? 256)
  const resizeH = Math.min(256, originalMeta.height ?? 256)

  let best: TunedResult = { quality: minQ, ssim: 1, size: Number.POSITIVE_INFINITY }

  for (const quality of candidateQualities) {
    const { data, info } = await sharp(source)
      .resize(resizeW, resizeH, { fit: 'inside' })
      [format]({ quality })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const ssim = computeSSIM(
      new Uint8Array(original),
      new Uint8Array(data),
      info.width,
      info.height,
    )
    const size = Buffer.byteLength(data)

    if (ssim >= threshold && size < best.size) {
      best = { quality, ssim, size }
    }

    if (ssim >= threshold && quality === minQ) {
      return best
    }
  }

  if (best.ssim >= threshold) return best
  return { quality: maxQ, ssim: best.ssim, size: best.size }
}
