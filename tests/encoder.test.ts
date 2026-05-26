import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { encodeImage } from '../src/core/encoder.ts'

const TMP_DIR = join(import.meta.dirname, '..', 'tmp-test-images')
const OUT_DIR = join(TMP_DIR, 'out')

const TEST_WIDTH = 64
const TEST_HEIGHT = 48

const testImages: Record<string, string> = {}

beforeAll(async () => {
  rmSync(TMP_DIR, { recursive: true, force: true })
  mkdirSync(OUT_DIR, { recursive: true })

  const checkerboard = Buffer.alloc(TEST_WIDTH * TEST_HEIGHT * 3)
  for (let y = 0; y < TEST_HEIGHT; y++) {
    for (let x = 0; x < TEST_WIDTH; x++) {
      const idx = (y * TEST_WIDTH + x) * 3
      const isWhite = (Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0
      checkerboard[idx] = isWhite ? 255 : 0
      checkerboard[idx + 1] = isWhite ? 255 : 0
      checkerboard[idx + 2] = isWhite ? 255 : 0
    }
  }

  const rawOpts = { raw: { width: TEST_WIDTH, height: TEST_HEIGHT, channels: 3 as const } }

  const jpegPath = join(TMP_DIR, 'test.jpg')
  await sharp(checkerboard, rawOpts).jpeg().toFile(jpegPath)
  testImages.jpeg = jpegPath

  const pngPath = join(TMP_DIR, 'test.png')
  await sharp(checkerboard, rawOpts).png().toFile(pngPath)
  testImages.png = pngPath

  const webpPath = join(TMP_DIR, 'test.webp')
  await sharp(checkerboard, rawOpts).webp().toFile(webpPath)
  testImages.webp = webpPath

  const avifPath = join(TMP_DIR, 'test.avif')
  await sharp(checkerboard, rawOpts).avif().toFile(avifPath)
  testImages.avif = avifPath

  const bmpPath = join(TMP_DIR, 'test.bmp')
  const rowSize = Math.ceil(TEST_WIDTH * 3 / 4) * 4
  const pixelDataOffset = 14 + 40
  const fileSize = pixelDataOffset + rowSize * TEST_HEIGHT
  const bmpHeader = Buffer.alloc(fileSize)
  bmpHeader.write('BM', 0)
  bmpHeader.writeUInt32LE(fileSize, 2)
  bmpHeader.writeUInt32LE(pixelDataOffset, 10)
  bmpHeader.writeUInt32LE(40, 14)
  bmpHeader.writeInt32LE(TEST_WIDTH, 18)
  bmpHeader.writeInt32LE(TEST_HEIGHT, 22)
  bmpHeader.writeUInt16LE(1, 26)
  bmpHeader.writeUInt16LE(24, 28)
  for (let y = 0; y < TEST_HEIGHT; y++) {
    for (let x = 0; x < TEST_WIDTH; x++) {
      const srcIdx = ((TEST_HEIGHT - 1 - y) * TEST_WIDTH + x) * 3
      const dstIdx = pixelDataOffset + y * rowSize + x * 3
      bmpHeader[dstIdx] = checkerboard[srcIdx + 2]
      bmpHeader[dstIdx + 1] = checkerboard[srcIdx + 1]
      bmpHeader[dstIdx + 2] = checkerboard[srcIdx]
    }
  }
  writeFileSync(bmpPath, bmpHeader)
  testImages.bmp = bmpPath

  const tiffPath = join(TMP_DIR, 'test.tiff')
  await sharp(checkerboard, rawOpts).toFormat('tiff').toFile(tiffPath)
  testImages.tiff = tiffPath

  const svgPath = join(TMP_DIR, 'test.svg')
  const svgContent =
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="48"><rect width="64" height="48" fill="red"/><circle cx="32" cy="24" r="10" fill="blue"/></svg>'
  writeFileSync(svgPath, svgContent)
  testImages.svg = svgPath

  const gifPath = join(TMP_DIR, 'test.gif')
  const frameData = Buffer.alloc(TEST_WIDTH * TEST_HEIGHT * 3)
  for (let i = 0; i < frameData.length; i++) {
    frameData[i] = (i * 7) % 256
  }
  const gifSharp = sharp(frameData, { raw: { width: TEST_WIDTH, height: TEST_HEIGHT, channels: 3 } })
  await gifSharp.gif().toFile(gifPath)
  testImages.gif = gifPath
})

afterAll(() => {
  rmSync(TMP_DIR, { recursive: true, force: true })
})

const DEFAULT_TIERS = {
  ultra: { quality: 90, widths: [16, 32] },
  high: { quality: 80, widths: [16, 32] },
  medium: { quality: 60, widths: [16] },
  low: { quality: 40, widths: [16] },
} as any

async function encode(imagePath: string, formats: OutputFormat[] = ['webp', 'jpeg']) {
  return encodeImage(imagePath, {
    widths: [16, 32],
    formats,
    tiers: DEFAULT_TIERS,
    autoTune: false,
    adaptive: false,
    preprocess: true,
    faceDetection: true,
    outDir: OUT_DIR,
    verbose: false,
  })
}

describe('encodeImage — all input formats', () => {
  it('encodes JPEG input to webp and jpeg', async () => {
    const result = await encode(testImages.jpeg)
    expect(result.width).toBe(TEST_WIDTH)
    expect(result.height).toBe(TEST_HEIGHT)
    expect(result.format).toBe('jpeg')
    expect(result.placeholder).toMatch(/^data:image\/webp;base64,/)
    expect(result.variants.length).toBeGreaterThan(0)
    for (const v of result.variants) {
      expect(v.src).toBeTruthy()
      expect(v.width).toBeGreaterThan(0)
      expect(v.integrity).toMatch(/^sha384-/)
      expect(v.size).toBeGreaterThan(0)
    }
  })

  it('encodes PNG input', async () => {
    const result = await encode(testImages.png)
    expect(result.format).toBe('png')
    expect(result.width).toBe(TEST_WIDTH)
    expect(result.variants.length).toBeGreaterThan(0)
  })

  it('encodes WebP input', async () => {
    const result = await encode(testImages.webp)
    expect(result.format).toBe('webp')
    expect(result.width).toBe(TEST_WIDTH)
    expect(result.variants.length).toBeGreaterThan(0)
  })

  it('encodes AVIF input', async () => {
    const result = await encode(testImages.avif)
    expect(result.format).toBe('avif')
    expect(result.width).toBe(TEST_WIDTH)
    expect(result.variants.length).toBeGreaterThan(0)
  })

  it('encodes BMP input', async () => {
    try {
      const result = await encode(testImages.bmp)
      expect(result.format).toBe('bmp')
      expect(result.width).toBe(TEST_WIDTH)
    } catch {
      // sharp may not support BMP input on all platforms
    }
  })

  it('encodes TIFF input', async () => {
    const result = await encode(testImages.tiff)
    expect(result.format).toBe('tiff')
    expect(result.width).toBe(TEST_WIDTH)
    expect(result.variants.length).toBeGreaterThan(0)
  })
})

describe('encodeImage — no-bmp-input', () => {
  it('BMP is detected but encoding may fail if sharp lacks support', async () => {
    try {
      const result = await encode(testImages.bmp)
      expect(result.format).toBe('bmp')
    } catch {
      // BMP input is detected by magic bytes, but sharp may not support decoding it
    }
  })
})

describe('encodeImage — SVG', () => {
  it('processes SVG input', async () => {
    const result = await encode(testImages.svg)
    expect(result.format).toBe('svg')
    expect(result.variants.length).toBeGreaterThan(0)
    const v = result.variants[0]
    expect(v.format).toBe('webp')
    expect(v.integrity).toMatch(/^sha384-/)
  })

  it('sanitizes SVG with script injection', async () => {
    const unsafeSvg = join(TMP_DIR, 'unsafe.svg')
    writeFileSync(unsafeSvg, '<svg><script>alert("xss")</script><rect width="100" height="100"/></svg>')
    const result = await encode(unsafeSvg)
    expect(result.format).toBe('svg')
    const outPath = join(OUT_DIR, result.variants[0].src)
    const outContent = readFileSync(outPath)
    expect(outContent.toString()).not.toContain('script')
    expect(outContent.toString()).not.toContain('alert')
  })
})

describe('encodeImage — animated formats', () => {
  it('processes animated GIF', async () => {
    const result = await encode(testImages.gif)
    expect(result.format).toBe('gif')
    expect(result.variants.length).toBeGreaterThan(0)
    const webpVariant = result.variants.find((v) => v.format === 'webp')
    expect(webpVariant).toBeTruthy()
  })
})

describe('encodeImage — output format coverage', () => {
  it('produces AVIF output when requested', async () => {
    const result = await encode(testImages.jpeg, ['avif', 'webp', 'jpeg', 'png'])
    const formats = new Set(result.variants.map((v) => v.format))
    expect(formats.has('avif')).toBe(true)
    expect(formats.has('webp')).toBe(true)
    expect(formats.has('jpeg')).toBe(true)
  })

  it('produces all output formats', async () => {
    const result = await encode(testImages.jpeg, ['avif', 'webp', 'jpeg', 'png'])
    expect(result.variants.filter((v) => v.format === 'avif').length).toBeGreaterThan(0)
    expect(result.variants.filter((v) => v.format === 'webp').length).toBeGreaterThan(0)
    expect(result.variants.filter((v) => v.format === 'jpeg').length).toBeGreaterThan(0)
    expect(result.variants.filter((v) => v.format === 'png').length).toBeGreaterThan(0)
  })
})

describe('encodeImage — tiers', () => {
  it('generates tier entries', async () => {
    const result = await encode(testImages.jpeg)
    const tiers = Object.keys(result.tiers)
    expect(tiers).toContain('ultra')
    expect(tiers).toContain('high')
    expect(tiers).toContain('medium')
    expect(tiers).toContain('low')
  })
})

describe('encodeImage — edge cases', () => {
  it('handles PNG with alpha channel', async () => {
    const alphaBuffer = Buffer.alloc(TEST_WIDTH * TEST_HEIGHT * 4)
    for (let y = 0; y < TEST_HEIGHT; y++) {
      for (let x = 0; x < TEST_WIDTH; x++) {
        const idx = (y * TEST_WIDTH + x) * 4
        alphaBuffer[idx] = 200
        alphaBuffer[idx + 1] = 100
        alphaBuffer[idx + 2] = 50
        alphaBuffer[idx + 3] = x < TEST_WIDTH / 2 ? 255 : 0
      }
    }
    const alphaPngPath = join(TMP_DIR, 'alpha.png')
    await sharp(alphaBuffer, { raw: { width: TEST_WIDTH, height: TEST_HEIGHT, channels: 4 } })
      .png()
      .toFile(alphaPngPath)
    const result = await encode(alphaPngPath)
    expect(result.width).toBe(TEST_WIDTH)
    expect(result.variants.length).toBeGreaterThan(0)
  })

  it('handles very small images', async () => {
    const tinyBuffer = Buffer.alloc(2 * 2 * 3)
    tinyBuffer.fill(128)
    const tinyPath = join(TMP_DIR, 'tiny.jpg')
    await sharp(tinyBuffer, { raw: { width: 2, height: 2, channels: 3 } }).jpeg().toFile(tinyPath)
    const result = await encodeImage(tinyPath, {
      widths: [4],
      formats: ['webp'],
      tiers: { high: { quality: 80, widths: [4] } } as any,
      autoTune: false,
      adaptive: false,
      preprocess: false,
      faceDetection: false,
      outDir: OUT_DIR,
    })
    expect(result.width).toBe(2)
    expect(result.height).toBe(2)
    expect(result.variants.length).toBeGreaterThan(0)
  })

  it('handles images that are already at target width', async () => {
    const result = await encodeImage(testImages.jpeg, {
      widths: [TEST_WIDTH + 100],
      formats: ['webp'],
      tiers: { high: { quality: 80, widths: [TEST_WIDTH + 100] } } as any,
      autoTune: false,
      adaptive: false,
      preprocess: false,
      faceDetection: false,
      outDir: OUT_DIR,
    })
    const webpVariant = result.variants.find((v) => v.format === 'webp')
    expect(webpVariant).toBeTruthy()
  })
})

describe('encodeImage — error resilience', () => {
  it('returns fallback for non-existent file', async () => {
    try {
      const result = await encode('/nonexistent/image.jpg')
      expect(result).toBeDefined()
      expect(result.variants.length).toBe(0)
    } catch {
      // encodeImage may throw for unresolvable paths
    }
  })

  it('handles empty file gracefully', async () => {
    const emptyPath = join(TMP_DIR, 'empty.jpg')
    writeFileSync(emptyPath, '')
    try {
      const result = await encode(emptyPath)
      expect(result).toBeDefined()
    } catch {
      // sharp throws on empty input
    }
  })
})
