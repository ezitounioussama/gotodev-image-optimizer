import { describe, it, expect } from 'vitest'
import { contentHash, sriHash } from '../src/utils/hash.ts'

describe('contentHash', () => {
  it('returns a 16-character base64url string', () => {
    const hash = contentHash(Buffer.from('hello'))
    expect(hash).toHaveLength(16)
    expect(typeof hash).toBe('string')
  })

  it('returns consistent hashes for same input', () => {
    const a = contentHash(Buffer.from('test data'))
    const b = contentHash(Buffer.from('test data'))
    expect(a).toBe(b)
  })

  it('returns different hashes for different inputs', () => {
    const a = contentHash(Buffer.from('hello'))
    const b = contentHash(Buffer.from('world'))
    expect(a).not.toBe(b)
  })

  it('handles empty buffer', () => {
    const hash = contentHash(Buffer.from(''))
    expect(hash).toHaveLength(16)
  })
})

describe('sriHash', () => {
  it('returns a sha384 SRI hash', () => {
    const hash = sriHash(Buffer.from('hello'))
    expect(hash).toMatch(/^sha384-/)
    expect(hash.length).toBeGreaterThan(50)
  })

  it('returns consistent hashes for same input', () => {
    const a = sriHash(Buffer.from('test'))
    const b = sriHash(Buffer.from('test'))
    expect(a).toBe(b)
  })
})
