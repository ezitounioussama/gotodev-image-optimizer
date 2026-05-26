import { describe, it, expect } from 'vitest'
import { computeSSIM } from '../src/utils/ssim.ts'

describe('computeSSIM', () => {
  it('returns 1 for identical images', () => {
    const pixels = new Uint8Array([100, 100, 100, 100, 100, 100, 100, 100, 100])
    expect(computeSSIM(pixels, pixels, 3, 3)).toBe(1)
  })

  it('returns lower value for different images', () => {
    const original = new Uint8Array(64).fill(100)
    const compressed = new Uint8Array(64).fill(50)
    expect(computeSSIM(original, compressed, 8, 8)).toBeLessThan(1)
  })

  it('returns near-1 for slight differences', () => {
    const original = new Uint8Array(256)
    const compressed = new Uint8Array(256)
    for (let i = 0; i < 256; i++) {
      original[i] = i % 256
      compressed[i] = (i + 1) % 256
    }
    const ssim = computeSSIM(original, compressed, 16, 16)
    expect(ssim).toBeGreaterThan(0.9)
    expect(ssim).toBeLessThan(1)
  })

  it('handles single-pixel images', () => {
    const pixels = new Uint8Array([42])
    expect(computeSSIM(pixels, pixels, 1, 1)).toBe(1)
  })
})
