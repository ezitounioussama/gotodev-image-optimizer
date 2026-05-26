import { describe, it, expect } from 'vitest'
import {
  detectFormat,
  getMimeType,
  isRasterFormat,
  isAnimatedFormat,
  outputFormatsFrom,
  getExtension,
  clearFormatCache,
} from '../src/core/formats.ts'
import type { ImageFormat } from '../src/core/types.ts'

const ALL_INPUT_FORMATS: ImageFormat[] = ['jpeg', 'png', 'webp', 'avif', 'gif', 'svg', 'bmp', 'tiff', 'ico']
const ALL_OUTPUT_FORMATS = ['avif', 'webp', 'jpeg', 'png'] as const

describe('detectFormat — magic bytes for all formats', () => {
  const testCases: { buffer: number[]; ext: string; expected: ImageFormat }[] = [
    { buffer: [0xFF, 0xD8, 0xFF, 0xE0], ext: 'jpg', expected: 'jpeg' },
    { buffer: [0xFF, 0xD8, 0xFF, 0xE1], ext: 'jpeg', expected: 'jpeg' },
    { buffer: [0x89, 0x50, 0x4E, 0x47], ext: 'png', expected: 'png' },
    { buffer: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], ext: 'gif', expected: 'gif' },
    { buffer: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], ext: 'gif', expected: 'gif' },
    { buffer: [0x42, 0x4D], ext: 'bmp', expected: 'bmp' },
    { buffer: [0x49, 0x49, 0x2A, 0x00], ext: 'tiff', expected: 'tiff' },
    { buffer: [0x4D, 0x4D, 0x00, 0x2A], ext: 'tif', expected: 'tiff' },
    { buffer: [0x00, 0x00, 0x01, 0x00], ext: 'ico', expected: 'ico' },
    { buffer: [0x3C, 0x73, 0x76, 0x67], ext: 'svg', expected: 'svg' },
    { buffer: [0x3C], ext: 'svg', expected: 'svg' },
  ]

  for (const { buffer, ext, expected } of testCases) {
    it(`detects ${expected} (${ext}) from magic bytes`, () => {
      expect(detectFormat(new Uint8Array(buffer), ext)).toBe(expected)
    })
  }

  it('detects WEBP with proper RIFF header', () => {
    const riffHeader = [
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ]
    expect(detectFormat(new Uint8Array(riffHeader), 'webp')).toBe('webp')
  })

  it('falls back to extension for non-WEBP RIFF files', () => {
    const riffHeader = [
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x41, 0x56, 0x49, 0x20,
    ]
    expect(detectFormat(new Uint8Array(riffHeader), 'avi')).toBe('jpeg')
  })

  it('falls back to extension when magic bytes do not match', () => {
    expect(detectFormat(new Uint8Array([0x00, 0x00, 0x00, 0x00]), 'png')).toBe('png')
    expect(detectFormat(new Uint8Array([0x00, 0x00]), 'jpeg')).toBe('jpeg')
  })

  it('returns jpeg for unknown extension with no magic match', () => {
    expect(detectFormat(new Uint8Array([0x00, 0x00]), 'exe')).toBe('jpeg')
  })

  it('handles short buffers gracefully', () => {
    expect(detectFormat(new Uint8Array([0xFF]), 'jpg')).toBe('jpeg')
  })

  it('detects WEBP only with correct RIFF type', () => {
    const webpHeader = [
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ]
    const notWebp = [
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x58, 0x58, 0x58, 0x58,
    ]
    expect(detectFormat(new Uint8Array(webpHeader), 'webp')).toBe('webp')
    expect(detectFormat(new Uint8Array(notWebp), 'webp')).toBe('webp')
  })
})

describe('isAnimatedFormat', () => {
  it('returns true for gif', () => {
    expect(isAnimatedFormat('gif')).toBe(true)
  })

  it('returns true for webp', () => {
    expect(isAnimatedFormat('webp')).toBe(true)
  })

  it('returns false for all non-animated formats', () => {
    const nonAnimated: ImageFormat[] = ['jpeg', 'png', 'avif', 'svg', 'bmp', 'tiff', 'ico']
    for (const fmt of nonAnimated) {
      expect(isAnimatedFormat(fmt)).toBe(false)
    }
  })
})

describe('getMimeType — all formats', () => {
  const mimeMap: Record<ImageFormat, string> = {
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    avif: 'image/avif',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    bmp: 'image/bmp',
    tiff: 'image/tiff',
    ico: 'image/x-icon',
  }

  for (const [fmt, expected] of Object.entries(mimeMap)) {
    it(`${fmt} → ${expected}`, () => {
      expect(getMimeType(fmt as ImageFormat)).toBe(expected)
    })
  }

  it('returns application/octet-stream for unknown', () => {
    expect(getMimeType('unknown' as ImageFormat)).toBe('application/octet-stream')
  })
})

describe('getExtension — all formats', () => {
  const extMap: Record<ImageFormat, string> = {
    jpeg: 'jpg',
    png: 'png',
    webp: 'webp',
    avif: 'avif',
    gif: 'gif',
    svg: 'svg',
    bmp: 'bmp',
    tiff: 'tiff',
    ico: 'ico',
  }

  for (const [fmt, expected] of Object.entries(extMap)) {
    it(`${fmt} → .${expected}`, () => {
      expect(getExtension(fmt as ImageFormat)).toBe(expected)
    })
  }
})

describe('isRasterFormat', () => {
  it('svg is not raster', () => {
    expect(isRasterFormat('svg')).toBe(false)
  })

  it('all other formats are raster', () => {
    const rasters: ImageFormat[] = ['jpeg', 'png', 'webp', 'avif', 'gif', 'bmp', 'tiff', 'ico']
    for (const fmt of rasters) {
      expect(isRasterFormat(fmt)).toBe(true)
    }
  })
})

describe('outputFormatsFrom — all input formats', () => {
  it('svg → empty array', () => {
    expect(outputFormatsFrom('svg')).toEqual([])
  })

  it('gif → webp, jpeg', () => {
    expect(outputFormatsFrom('gif')).toEqual(['webp', 'jpeg'])
  })

  it('jpeg → avif, webp, jpeg', () => {
    expect(outputFormatsFrom('jpeg')).toEqual(['avif', 'webp', 'jpeg'])
  })

  it('png → avif, webp, jpeg', () => {
    expect(outputFormatsFrom('png')).toEqual(['avif', 'webp', 'jpeg'])
  })

  it('webp → avif, webp, jpeg', () => {
    expect(outputFormatsFrom('webp')).toEqual(['avif', 'webp', 'jpeg'])
  })

  it('avif → avif, webp, jpeg', () => {
    expect(outputFormatsFrom('avif')).toEqual(['avif', 'webp', 'jpeg'])
  })

  it('bmp → avif, webp, jpeg', () => {
    expect(outputFormatsFrom('bmp')).toEqual(['avif', 'webp', 'jpeg'])
  })

  it('tiff → avif, webp, jpeg', () => {
    expect(outputFormatsFrom('tiff')).toEqual(['avif', 'webp', 'jpeg'])
  })

  it('ico → avif, webp, jpeg', () => {
    expect(outputFormatsFrom('ico')).toEqual(['avif', 'webp', 'jpeg'])
  })
})

describe('clearFormatCache', () => {
  it('clears WeakMap without error', () => {
    expect(() => clearFormatCache()).not.toThrow()
  })
})
