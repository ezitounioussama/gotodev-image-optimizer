import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resolveTierSrc, resolveVariantsForTier } from '../src/adaptive/tier.ts'
import type { ManifestEntry } from '../src/core/types.ts'

function makeMeta(overrides: Partial<ManifestEntry> = {}): ManifestEntry {
  return {
    src: 'test.jpg',
    width: 1920,
    height: 1080,
    format: 'jpeg',
    placeholder: '',
    tiers: { ultra: 'ultra.webp', high: 'high.webp', medium: 'medium.webp', low: 'low.webp' },
    variants: [
      { src: '480.webp', width: 480, format: 'webp', size: 10000, integrity: 'sha384-a' },
      { src: '768.webp', width: 768, format: 'webp', size: 20000, integrity: 'sha384-b' },
      { src: '1024.webp', width: 1024, format: 'webp', size: 30000, integrity: 'sha384-c' },
      { src: '1920.webp', width: 1920, format: 'webp', size: 50000, integrity: 'sha384-d' },
      { src: '480.jpg', width: 480, format: 'jpeg', size: 15000, integrity: 'sha384-e' },
    ],
    ...overrides,
  }
}

describe('resolveTierSrc', () => {
  it('returns exact tier match', () => {
    expect(resolveTierSrc(makeMeta(), 'ultra')).toBe('ultra.webp')
    expect(resolveTierSrc(makeMeta(), 'low')).toBe('low.webp')
  })

  it('falls back to next available higher tier', () => {
    const meta = makeMeta({ tiers: { ultra: 'ultra.webp', high: 'high.webp', low: 'low.webp' } } as any)
    expect(resolveTierSrc(meta, 'medium')).toBe('high.webp')
  })

  it('returns metadata.src when no tier matches', () => {
    const meta = makeMeta({ tiers: {} as any })
    expect(resolveTierSrc(meta, 'ultra')).toBe('test.jpg')
  })
})

describe('resolveVariantsForTier', () => {
  it('filters variants by tier max width', () => {
    const meta = makeMeta()
    const low = resolveVariantsForTier(meta, 'low')
    expect(low.every((v) => v.width <= 480)).toBe(true)
  })

  it('ultra tier returns all variants', () => {
    const meta = makeMeta()
    const ultra = resolveVariantsForTier(meta, 'ultra')
    expect(ultra.length).toBe(5)
  })

  it('high tier filters variants above 1024', () => {
    const meta = makeMeta()
    const high = resolveVariantsForTier(meta, 'high')
    expect(high.every((v) => v.width <= 1024)).toBe(true)
  })
})
