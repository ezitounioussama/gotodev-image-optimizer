import { describe, it, expect } from 'vitest'
import { computeSSIM } from '../src/utils/ssim.ts'

describe('ssim', () => {
  it('returns 1 for identical images', () => {
    const pixels = new Uint8Array(64).fill(128)
    expect(computeSSIM(pixels, pixels, 8, 8)).toBeCloseTo(1, 2)
  })

  it('returns < 1 for different images', () => {
    const a = new Uint8Array(64).fill(128)
    const b = new Uint8Array(64).fill(0)
    expect(computeSSIM(a, b, 8, 8)).toBeLessThan(1)
  })

  it('handles small images', () => {
    const a = new Uint8Array(16).fill(100)
    const b = new Uint8Array(16).fill(200)
    expect(computeSSIM(a, b, 4, 4)).toBeGreaterThan(0)
  })
})
