import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { rmSync, mkdirSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { downloadRemoteImage, isRemoteUrl, RemoteImageError } from '../src/core/remote.ts'

const TMP_DIR = join(import.meta.dirname, '..', 'tmp-remote-test')

beforeEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true })
  mkdirSync(TMP_DIR, { recursive: true })
})

afterEach(() => {
  rmSync(TMP_DIR, { recursive: true, force: true })
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('isRemoteUrl', () => {
  it('returns true for https URLs', () => {
    expect(isRemoteUrl('https://images.unsplash.com/photo.jpg')).toBe(true)
  })

  it('returns true for http URLs', () => {
    expect(isRemoteUrl('http://example.com/image.png')).toBe(true)
  })

  it('returns false for local paths', () => {
    expect(isRemoteUrl('./hero.jpg')).toBe(false)
    expect(isRemoteUrl('/absolute/path.jpg')).toBe(false)
    expect(isRemoteUrl('src/assets/photo.png')).toBe(false)
  })
})

describe('downloadRemoteImage', () => {
  beforeEach(() => {
    const headers = new Map<string, string>()
    headers.set('content-type', 'image/jpeg')
    const mockResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers,
      arrayBuffer: () => Promise.resolve(new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]).buffer),
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse))
  })

  it('rejects unsupported protocols', async () => {
    const url = 'ftp://images.unsplash.com/photo.jpg'
    await expect(
      downloadRemoteImage(url, { domains: ['images.unsplash.com'], cacheDir: TMP_DIR }),
    ).rejects.toThrow(RemoteImageError)
  })

  it('rejects disallowed domains with correct error code', async () => {
    const url = 'https://evil.com/photo.jpg'
    try {
      await downloadRemoteImage(url, { domains: ['images.unsplash.com'], cacheDir: TMP_DIR })
      expect.unreachable('Should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(RemoteImageError)
      expect((error as RemoteImageError).code).toBe('DOMAIN_NOT_ALLOWED')
    }
  })

  it('allows subdomains of allowed domains', async () => {
    const url = 'https://img.images.unsplash.com/photo.jpg'
    const result = await downloadRemoteImage(url, { domains: ['images.unsplash.com'], cacheDir: TMP_DIR })
    expect(result).toBeTruthy()
    expect(existsSync(result)).toBe(true)
  })

  it('rejects invalid URLs', async () => {
    await expect(
      downloadRemoteImage('not-a-url', { domains: ['example.com'], cacheDir: TMP_DIR }),
    ).rejects.toThrow()
  })

  it('downloads and caches files', async () => {
    const url = 'https://images.unsplash.com/photo-1.jpg'
    const result = await downloadRemoteImage(url, { domains: ['images.unsplash.com'], cacheDir: TMP_DIR })
    expect(existsSync(result)).toBe(true)
    const content = readFileSync(result)
    expect(content.length).toBeGreaterThan(0)

    const cached = await downloadRemoteImage(url, { domains: ['images.unsplash.com'], cacheDir: TMP_DIR })
    expect(cached).toBe(result)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('uses default cache directory when not specified', async () => {
    const url = 'https://images.unsplash.com/photo.jpg'
    const result = await downloadRemoteImage(url, { domains: ['images.unsplash.com'] })
    expect(result).toContain('node_modules/.cache/vite-image-react')
    expect(existsSync(result)).toBe(true)
  })

  it('rejects oversized files', async () => {
    const bigBuffer = new Uint8Array(100 * 1024 * 1024)
    const headers = new Map<string, string>()
    headers.set('content-type', 'image/jpeg')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers,
      arrayBuffer: () => Promise.resolve(bigBuffer.buffer),
    }))
    const url = 'https://images.unsplash.com/big.jpg'
    try {
      await downloadRemoteImage(url, { domains: ['images.unsplash.com'], cacheDir: TMP_DIR })
      expect.unreachable('Should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(RemoteImageError)
      expect((error as RemoteImageError).code).toBe('FILE_TOO_LARGE')
    }
  })

  it('rejects HTTP errors', async () => {
    const headers = new Map<string, string>()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers,
    }))
    const url = 'https://images.unsplash.com/missing.jpg'
    try {
      await downloadRemoteImage(url, { domains: ['images.unsplash.com'], cacheDir: TMP_DIR })
      expect.unreachable('Should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(RemoteImageError)
      expect((error as RemoteImageError).code).toBe('HTTP_ERROR')
    }
  })
})
