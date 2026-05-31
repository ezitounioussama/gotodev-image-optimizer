import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { RemoteOptions } from './types.ts'

const DEFAULT_CACHE_DIR = 'node_modules/.cache/vite-image-react'

export class RemoteImageError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly url: string,
  ) {
    super(message)
    this.name = 'RemoteImageError'
  }
}

function urlToCacheKey(url: string): string {
  return createHash('sha256').update(url).digest('hex').slice(0, 32)
}

function validateDomain(url: URL, allowedDomains: string[]): void {
  const hostname = url.hostname.toLowerCase()
  const allowed = allowedDomains.some((domain) => {
    const normalized = domain.toLowerCase()
    return hostname === normalized || hostname.endsWith(`.${normalized}`)
  })
  if (!allowed) {
    throw new RemoteImageError(
      `Domain ${hostname} is not in the allowed domains list`,
      'DOMAIN_NOT_ALLOWED',
      url.href,
    )
  }
}

function validateScheme(url: URL): void {
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new RemoteImageError(
      `Unsupported protocol: ${url.protocol}`,
      'INVALID_PROTOCOL',
      url.href,
    )
  }
}

const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',
]

const MAX_REMOTE_FILE_SIZE = 50 * 1024 * 1024

function validateContentType(contentType: string | null): void {
  if (!contentType) return
  const normalized = contentType.split(';')[0]?.trim().toLowerCase()
  if (normalized && !ALLOWED_CONTENT_TYPES.includes(normalized)) {
    throw new RemoteImageError(
      `Unsupported content type: ${contentType}`,
      'UNSUPPORTED_CONTENT_TYPE',
      '',
    )
  }
}

function findCachedPath(basePath: string): string | null {
  const exts = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.svg', '.bmp', '.tiff']
  for (const ext of exts) {
    const p = `${basePath}${ext}`
    if (existsSync(p)) return p
  }
  return null
}

function inferExtension(contentType: string | null, url: string): string {
  if (contentType) {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/avif': '.avif',
      'image/gif': '.gif',
      'image/svg+xml': '.svg',
      'image/bmp': '.bmp',
      'image/tiff': '.tiff',
    }
    const normalized = contentType.split(';')[0]?.trim().toLowerCase()
    if (normalized && map[normalized]) return map[normalized]
  }

  try {
    const pathname = new URL(url).pathname
    const match = pathname.match(/\.(jpe?g|png|webp|avif|gif|svg|bmp|tiff?)$/i)
    if (match) return match[0]
  } catch {}

  return '.jpg'
}

export async function downloadRemoteImage(url: string, options: RemoteOptions): Promise<string> {
  const parsed = new URL(url)
  validateScheme(parsed)
  validateDomain(parsed, options.domains)

  const cacheDir = options.cacheDir ?? DEFAULT_CACHE_DIR
  const cacheKey = urlToCacheKey(url)
  const cachedPath = join(cacheDir, cacheKey)

  const existing = findCachedPath(cachedPath)
  if (existing) return existing

  mkdirSync(cacheDir, { recursive: true })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'vite-image-react/1.0' },
    })

    if (!response.ok) {
      throw new RemoteImageError(
        `HTTP ${response.status}: ${response.statusText}`,
        'HTTP_ERROR',
        url,
      )
    }

    validateContentType(response.headers.get('content-type'))

    const buffer = Buffer.from(await response.arrayBuffer())

    if (buffer.length > MAX_REMOTE_FILE_SIZE) {
      throw new RemoteImageError(
        `File size ${buffer.length} exceeds maximum ${MAX_REMOTE_FILE_SIZE}`,
        'FILE_TOO_LARGE',
        url,
      )
    }

    const ext = inferExtension(response.headers.get('content-type'), url)
    const filePath = `${cachedPath}${ext}`
    writeFileSync(filePath, buffer)
    return filePath
  } finally {
    clearTimeout(timeout)
  }
}

export function isRemoteUrl(id: string): boolean {
  return id.startsWith('https://') || id.startsWith('http://')
}
