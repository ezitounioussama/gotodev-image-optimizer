import { describe, it, expect } from 'vitest'
import { computeEntropy, computeEdgeDensity, computeSaliency, computeCenterWeight } from '../src/utils/entropy.ts'

describe('computeEntropy', () => {
  it('returns 0 for uniform pixel values', () => {
    const pixels = new Uint8Array(64).fill(128)
    expect(computeEntropy(pixels)).toBe(0)
  })

  it('returns positive entropy for varied pixels', () => {
    const pixels = new Uint8Array(256)
    for (let i = 0; i < 256; i++) pixels[i] = i
    const entropy = computeEntropy(pixels)
    expect(entropy).toBeGreaterThan(0)
    expect(entropy).toBeLessThanOrEqual(8)
  })

  it('entropy is max 8 for 256 bins', () => {
    const pixels = new Uint8Array(256)
    for (let i = 0; i < 256; i++) pixels[i] = i
    expect(computeEntropy(pixels)).toBeLessThanOrEqual(8)
  })

  it('handles empty pixel array', () => {
    expect(computeEntropy(new Uint8Array(0))).toBe(0)
  })
})

describe('computeEdgeDensity', () => {
  it('returns 0 for uniform image', () => {
    const pixels = new Uint8Array(100).fill(128)
    expect(computeEdgeDensity(pixels, 10, 10)).toBe(0)
  })

  it('returns positive for high-contrast image', () => {
    const width = 8
    const height = 8
    const pixels = new Uint8Array(width * height)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        pixels[y * width + x] = x < width / 2 ? 0 : 255
      }
    }
    expect(computeEdgeDensity(pixels, width, height)).toBeGreaterThan(0)
  })

  it('handles minimum size', () => {
    expect(computeEdgeDensity(new Uint8Array([1, 2, 3, 4]), 2, 2)).toBe(0)
  })
})

describe('computeSaliency', () => {
  it('returns low saliency for uniform image', () => {
    const pixels = new Uint8Array(64).fill(128)
    expect(computeSaliency(pixels, 8, 8)).toBeLessThan(0.5)
  })

  it('returns higher saliency for varied image', () => {
    const pixels = new Uint8Array(256)
    for (let i = 0; i < 256; i++) pixels[i] = (i * 7) % 256
    expect(computeSaliency(pixels, 16, 16)).toBeGreaterThan(0.3)
  })
})

describe('computeCenterWeight', () => {
  it('returns 1 for center tile', () => {
    expect(computeCenterWeight(2, 2, 5, 5)).toBeGreaterThan(0.9)
  })

  it('returns lower for corner tile', () => {
    const corner = computeCenterWeight(0, 0, 5, 5)
    const center = computeCenterWeight(2, 2, 5, 5)
    expect(corner).toBeLessThan(center)
  })

  it('is symmetric', () => {
    const a = computeCenterWeight(1, 2, 7, 7)
    const b = computeCenterWeight(2, 1, 7, 7)
    expect(a).toBe(b)
  })
})
