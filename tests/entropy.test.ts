import { describe, it, expect } from 'vitest'
import { computeEntropy, computeEdgeDensity, computeSaliency } from '../src/utils/entropy.ts'

describe('entropy', () => {
  describe('computeEntropy', () => {
    it('returns 0 for uniform pixels', () => {
      const pixels = new Uint8Array(64).fill(128)
      expect(computeEntropy(pixels)).toBe(0)
    })

    it('returns > 0 for varying pixels', () => {
      const pixels = new Uint8Array(64)
      for (let i = 0; i < 64; i++) pixels[i] = i * 4
      expect(computeEntropy(pixels)).toBeGreaterThan(0)
    })
  })

  describe('computeEdgeDensity', () => {
    it('returns 0 for uniform image', () => {
      const pixels = new Uint8Array(100).fill(128)
      expect(computeEdgeDensity(pixels, 10, 10)).toBe(0)
    })

    it('returns > 0 for image with edges', () => {
      const pixels = new Uint8Array(100)
      for (let i = 0; i < 100; i++) {
        pixels[i] = i < 50 ? 0 : 255
      }
      expect(computeEdgeDensity(pixels, 10, 10)).toBeGreaterThan(0)
    })
  })

  describe('computeSaliency', () => {
    it('returns 0 for uniform image', () => {
      const pixels = new Uint8Array(64).fill(128)
      expect(computeSaliency(pixels, 8, 8)).toBe(0)
    })

    it('returns higher for complex image', () => {
      const complex = new Uint8Array(64)
      for (let i = 0; i < 64; i++) complex[i] = i * 4
      const uniform = new Uint8Array(64).fill(128)
      expect(computeSaliency(complex, 8, 8)).toBeGreaterThan(computeSaliency(uniform, 8, 8))
    })
  })
})
