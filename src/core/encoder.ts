import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { contentHash, sriHash } from '../utils/hash.ts'
import type { AnalysisResult } from './analyzer.ts'
import { analyzeImage, computeTargetQuality } from './analyzer.ts'
import { isAnimatedFormat, isAnimatedWebp } from './formats.ts'
import { preprocessImage } from './preprocessor.ts'
import { sanitizeSvg } from './sanitizer.ts'
import { autoTuneQuality } from './tuner.ts'
import type { ImageVariant, ManifestEntry, OutputFormat, QualityTier, TierConfig } from './types.ts'
import {
  validateFileSize,
  validateImageContent,
  validateOutputFormat,
  validatePath,
} from './validator.ts'

const FORMAT_FALLBACK: Record<OutputFormat, OutputFormat[]> = {
  avif: ['webp', 'jpeg'],
  webp: ['jpeg'],
  jpeg: [],
  png: [],
}

const FORMAT_EXT: Record<OutputFormat, string> = {
  avif: 'avif',
  webp: 'webp',
  jpeg: 'jpg',
  png: 'png',
}

export interface EncodeOptions {
  widths: number[]
  formats: OutputFormat[]
  tiers: Record<QualityTier, TierConfig>
  autoTune: boolean
  adaptive: boolean
  preprocess: boolean
  faceDetection: boolean
  outDir: string
  verbose?: boolean
}

export interface EncodeResult {
  entries: Record<string, ManifestEntry>
}

function readFileSafe(filePath: string): Buffer {
  validatePath(filePath)
  const buffer = readFileSync(filePath)
  validateFileSize(buffer.length)
  return buffer
}

function warn(message: string): void {
  console.warn(`[vite-image-react] ${message}`)
}

async function prepareSharpPipeline(source: string | Buffer): Promise<sharp.Sharp> {
  const img = typeof source === 'string' ? sharp(source) : sharp(source)
  const metadata = await img.metadata()

  if (metadata.orientation && metadata.orientation !== 1) {
    img.rotate()
  }

  if (metadata.chromaSubsampling === '4:4:4' || metadata.space === 'cmyk') {
    img.toColorspace('srgb')
  }

  return img
}

async function encodeVariantWithFallback(
  source: string | Buffer,
  width: number,
  primaryFormat: OutputFormat,
  quality: number,
  outDir: string,
  verbose = false,
): Promise<ImageVariant | null> {
  const fallbacks = [primaryFormat, ...FORMAT_FALLBACK[primaryFormat]]

  for (const fmt of fallbacks) {
    try {
      validateOutputFormat(fmt)
      const result = await encodeSingleVariant(source, width, fmt, quality, outDir)
      if (result) return result
    } catch (error) {
      if (verbose) {
        warn(
          `Failed to encode ${width}w as ${fmt}: ${error instanceof Error ? error.message : error}`,
        )
      }
    }
  }

  return null
}

async function encodeSingleVariant(
  source: string | Buffer,
  width: number,
  format: OutputFormat,
  quality: number,
  outDir: string,
): Promise<ImageVariant | null> {
  const proc = await prepareSharpPipeline(source)
  const metadata = await proc.metadata()
  const ext = FORMAT_EXT[format]
  const isUpScaled = (metadata.width ?? 0) <= width

  if (isUpScaled) {
    const buffer = await proc.toFormat(format, { quality }).toBuffer()
    const hash = contentHash(buffer)
    const filename = `${hash}-${width}.${ext}`
    const outPath = join(outDir, filename)
    await sharp(buffer).toFile(outPath)
    return {
      src: filename,
      width: width,
      format,
      size: buffer.length,
      integrity: sriHash(buffer),
    }
  }

  const resized = await proc.resize(width).toBuffer()
  const encoded = await sharp(resized).toFormat(format, { quality }).toBuffer()
  const hash = contentHash(encoded)
  const filename = `${hash}-${width}.${ext}`
  const outPath = join(outDir, filename)
  await sharp(encoded).toFile(outPath)

  return {
    src: filename,
    width,
    format,
    size: encoded.length,
    integrity: sriHash(encoded),
  }
}

export async function encodeImage(
  imagePath: string,
  options: EncodeOptions,
): Promise<ManifestEntry> {
  const buffer = readFileSafe(imagePath)
  const ext = imagePath.split('.').pop() ?? 'jpg'
  const format = validateImageContent(buffer, ext)

  if (format === 'svg') {
    try {
      const content = buffer.toString('utf-8')
      const sanitized = sanitizeSvg(content)
      const hash = contentHash(Buffer.from(sanitized))
      const filename = `${hash}.svg`
      const svgBuffer = Buffer.from(sanitized)
      writeFileSync(join(options.outDir, filename), svgBuffer)
      return {
        src: filename,
        width: 0,
        height: 0,
        format: 'svg',
        placeholder: '',
        tiers: {} as Record<QualityTier, string>,
        variants: [
          {
            src: filename,
            width: 0,
            format: 'webp',
            size: svgBuffer.length,
            integrity: sriHash(svgBuffer),
          },
        ],
      }
    } catch (error) {
      warn(
        `SVG optimization failed for ${imagePath}: ${error instanceof Error ? error.message : error}`,
      )
      const filename = imagePath.split('/').pop() ?? 'image.svg'
      writeFileSync(join(options.outDir, filename), buffer)
      return {
        src: filename,
        width: 0,
        height: 0,
        format: 'svg',
        placeholder: '',
        tiers: {} as Record<QualityTier, string>,
        variants: [
          {
            src: filename,
            width: 0,
            format: 'webp',
            size: buffer.length,
            integrity: sriHash(buffer),
          },
        ],
      }
    }
  }

  let isAnimated = isAnimatedFormat(format)
  if (format === 'webp' && !isAnimated) {
    isAnimated = await isAnimatedWebp(buffer)
  }

  if (isAnimated) {
    try {
      const img = sharp(buffer, { animated: true })
      const metadata = await img.metadata()
      const width = metadata.width ?? 0
      const height = metadata.height ?? 0

      const webpBuffer = await img.webp({ quality: 75 }).toBuffer()
      const hash = contentHash(webpBuffer)
      const filename = `${hash}.webp`
      writeFileSync(join(options.outDir, filename), webpBuffer)

      return {
        src: filename,
        width,
        height,
        format: format,
        placeholder: '',
        tiers: {} as Record<QualityTier, string>,
        variants: [
          {
            src: filename,
            width,
            format: 'webp',
            size: webpBuffer.length,
            integrity: sriHash(webpBuffer),
          },
        ],
      }
    } catch (error) {
      warn(
        `Animated image encoding failed for ${imagePath}: ${error instanceof Error ? error.message : error}`,
      )
      return {
        src: imagePath.split('/').pop() ?? 'image',
        width: 0,
        height: 0,
        format,
        placeholder: '',
        tiers: {} as Record<QualityTier, string>,
        variants: [],
      }
    }
  }

  const metadata = await sharp(buffer).metadata()
  const originalWidth = metadata.width ?? 0
  const originalHeight = metadata.height ?? 0

  let placeholder = ''
  if (originalWidth > 0 && originalHeight > 0) {
    try {
      const placeholderBuffer = await sharp(buffer)
        .resize(32, 32, { fit: 'inside' })
        .webp({ quality: 20 })
        .toBuffer()
      placeholder = `data:image/webp;base64,${placeholderBuffer.toString('base64')}`
    } catch (error) {
      warn(
        `Placeholder generation failed for ${imagePath}: ${error instanceof Error ? error.message : error}`,
      )
    }
  }

  const tiers: Partial<Record<QualityTier, string>> = {}
  const variants: ImageVariant[] = []

  let analysis: AnalysisResult | null = null
  let preprocessedSource: Buffer | null = null

  if (options.adaptive || options.preprocess) {
    try {
      analysis = await analyzeImage(imagePath, 64, options.faceDetection)
    } catch (error) {
      if (options.verbose) {
        warn(
          `Image analysis failed for ${imagePath}: ${error instanceof Error ? error.message : error}`,
        )
      }
    }
  }

  if (options.preprocess && analysis) {
    try {
      preprocessedSource = await preprocessImage(imagePath, analysis)
    } catch (error) {
      if (options.verbose) {
        warn(
          `Preprocessing failed for ${imagePath}: ${error instanceof Error ? error.message : error}`,
        )
      }
    }
  }

  const source = preprocessedSource ?? imagePath

  for (const [tierKey, tierConfig] of Object.entries(options.tiers)) {
    const tier = tierKey as QualityTier
    let quality = tierConfig.quality

    if (options.adaptive && analysis) {
      try {
        quality = computeTargetQuality(analysis, quality, {
          minQuality: Math.max(20, quality - 30),
          maxQuality: Math.min(95, quality + 10),
        })
      } catch (error) {
        if (options.verbose) {
          warn(
            `Quality computation failed for tier ${tier}: ${error instanceof Error ? error.message : error}`,
          )
        }
      }
    }

    if (options.autoTune) {
      try {
        const tuned = await autoTuneQuality(source, 'webp', {
          threshold: 0.97,
          minQuality: Math.max(40, quality - 10),
          maxQuality: Math.min(95, quality + 5),
        })
        quality = tuned.quality
      } catch (error) {
        if (options.verbose) {
          warn(
            `SSIM auto-tune failed for tier ${tier}: ${error instanceof Error ? error.message : error}`,
          )
        }
      }
    }

    const widths = tierConfig.widths.filter((w) => w <= originalWidth)
    if (widths.length === 0) {
      widths.push(originalWidth)
    }

    for (const w of widths) {
      for (const fmt of options.formats) {
        const variant = await encodeVariantWithFallback(
          source,
          w,
          fmt,
          quality,
          options.outDir,
          options.verbose,
        )
        if (variant) {
          variants.push(variant)
        } else if (fmt === options.formats[options.formats.length - 1] && options.verbose) {
          warn(`All format encodings failed for ${imagePath} at ${w}w (quality=${quality})`)
        }
      }
    }

    const bestVariant = variants.find((v) => v.format === 'webp')
    if (bestVariant) {
      tiers[tier] = bestVariant.src
    }
  }

  return {
    src: imagePath.split('/').pop() ?? 'image',
    width: originalWidth,
    height: originalHeight,
    format,
    placeholder,
    tiers: tiers as Record<QualityTier, string>,
    variants,
  }
}
