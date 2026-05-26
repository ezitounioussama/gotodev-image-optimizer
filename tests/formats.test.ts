import { describe, it, expect } from 'vitest'
import { getMimeType, isAnimatedFormat, outputFormatsFrom, getExtension, isRasterFormat } from '../src/core/formats.ts'
import type { ImageFormat } from '../src/core/types.ts'

describe('formats', () => {
  describe('detectFormat', () => {
    it('detects JPEG by magic bytes', () => {
      const buffer = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0])
      expect(detectFormat(buffer, 'jpg')).toBe('jpeg')
    })

    it('detects PNG by magic bytes', () => {
      const buffer = new Uint8Array([0x89, 0x50, 0x4E, 0x47])
      expect(detectFormat(buffer, 'png')).toBe('png')
    })

    it('detects SVG by extension', () => {
      const buffer = new Uint8Array([0x3C, 0x73, 0x76, 0x67])
      expect(detectFormat(buffer, 'svg')).toBe('svg')
    })

    it('returns extension-based fallback for unknown magic bytes', () => {
      const buffer = new Uint8Array([0x00, 0x00, 0x00, 0x00])
      expect(detectFormat(buffer, 'png')).toBe('png')
    })

    it('detects GIF by magic bytes', () => {
      const buffer = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
      expect(detectFormat(buffer, 'gif')).toBe('gif')
    })

    it('detects BMP by magic bytes', () => {
      const buffer = new Uint8Array([0x42, 0x4D])
      expect(detectFormat(buffer, 'bmp')).toBe('bmp')
    })
  })

  describe('isAnimatedFormat', () => {
    it('returns true for gif', () => {
      expect(isAnimatedFormat('gif')).toBe(true)
    })

    it('returns true for webp', () => {
      expect(isAnimatedFormat('webp')).toBe(true)
    })

    it('returns false for non-animated formats', () => {
      expect(isAnimatedFormat('jpeg')).toBe(false)
      expect(isAnimatedFormat('png')).toBe(false)
      expect(isAnimatedFormat('avif')).toBe(false)
    })
  })

  describe('getMimeType', () => {
    it('returns correct mime types', () => {
      expect(getMimeType('jpeg')).toBe('image/jpeg')
      expect(getMimeType('webp')).toBe('image/webp')
      expect(getMimeType('avif')).toBe('image/avif')
      expect(getMimeType('svg')).toBe('image/svg+xml')
      expect(getMimeType('png')).toBe('image/png')
      expect(getMimeType('gif')).toBe('image/gif')
    })

    it('returns application/octet-stream for unknown formats', () => {
      expect(getMimeType('unknown' as ImageFormat)).toBe('application/octet-stream')
    })
  })

  describe('getExtension', () => {
    it('returns correct extensions', () => {
      expect(getExtension('jpeg')).toBe('jpg')
      expect(getExtension('png')).toBe('png')
      expect(getExtension('webp')).toBe('webp')
      expect(getExtension('avif')).toBe('avif')
      expect(getExtension('svg')).toBe('svg')
    })
  })

  describe('isRasterFormat', () => {
    it('returns false for svg', () => {
      expect(isRasterFormat('svg')).toBe(false)
    })

    it('returns true for raster formats', () => {
      expect(isRasterFormat('jpeg')).toBe(true)
      expect(isRasterFormat('png')).toBe(true)
      expect(isRasterFormat('webp')).toBe(true)
    })
  })

  describe('outputFormatsFrom', () => {
    it('returns avif/webp/jpeg for jpeg input', () => {
      expect(outputFormatsFrom('jpeg')).toEqual(['avif', 'webp', 'jpeg'])
    })

    it('returns avif/webp/jpeg for png input', () => {
      expect(outputFormatsFrom('png')).toEqual(['avif', 'webp', 'jpeg'])
    })

    it('returns webp/jpeg for gif', () => {
      expect(outputFormatsFrom('gif')).toEqual(['webp', 'jpeg'])
    })

    it('returns empty for svg', () => {
      expect(outputFormatsFrom('svg')).toEqual([])
    })
  })
})

// Need to import detectFormat here for the tests
import { detectFormat } from '../src/core/formats.ts'
