import { describe, it, expect } from 'vitest'
import { detectFormat, getMimeType, isRasterFormat, isAnimatedFormat, outputFormatsFrom } from '../src/core/formats.ts'

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
  })

  describe('getMimeType', () => {
    it('returns correct mime types', () => {
      expect(getMimeType('jpeg')).toBe('image/jpeg')
      expect(getMimeType('webp')).toBe('image/webp')
      expect(getMimeType('avif')).toBe('image/avif')
      expect(getMimeType('svg')).toBe('image/svg+xml')
    })
  })

  describe('isRasterFormat', () => {
    it('returns false for svg', () => {
      expect(isRasterFormat('svg')).toBe(false)
    })

    it('returns true for raster formats', () => {
      expect(isRasterFormat('jpeg')).toBe(true)
      expect(isRasterFormat('png')).toBe(true)
    })
  })

  describe('isAnimatedFormat', () => {
    it('returns true for gif', () => {
      expect(isAnimatedFormat('gif')).toBe(true)
    })

    it('returns false for non-animated', () => {
      expect(isAnimatedFormat('jpeg')).toBe(false)
    })
  })

  describe('outputFormatsFrom', () => {
    it('returns avif/webp/jpeg for jpeg input', () => {
      expect(outputFormatsFrom('jpeg')).toEqual(['avif', 'webp', 'jpeg'])
    })

    it('returns webp/jpeg for gif', () => {
      expect(outputFormatsFrom('gif')).toEqual(['webp', 'jpeg'])
    })

    it('returns empty for svg', () => {
      expect(outputFormatsFrom('svg')).toEqual([])
    })
  })
})
