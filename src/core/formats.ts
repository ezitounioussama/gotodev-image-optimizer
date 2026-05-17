import type { ImageFormat, OutputFormat } from './types.ts'

const MAGIC_BYTES: Record<string, Uint8Array> = {
  jpeg: new Uint8Array([0xff, 0xd8, 0xff]),
  png: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
  webp: new Uint8Array([0x52, 0x49, 0x46, 0x46]),
  gif: new Uint8Array([0x47, 0x49, 0x46, 0x38]),
  bmp: new Uint8Array([0x42, 0x4d]),
  tiff: new Uint8Array([0x49, 0x49, 0x2a, 0x00]),
  ico: new Uint8Array([0x00, 0x00, 0x01, 0x00]),
  svg: new Uint8Array([0x3c]), // '<'
}

const EXTENSION_MAP: Record<string, ImageFormat> = {
  jpg: 'jpeg',
  jpeg: 'jpeg',
  png: 'png',
  webp: 'webp',
  avif: 'avif',
  gif: 'gif',
  svg: 'svg',
  bmp: 'bmp',
  tiff: 'tiff',
  tif: 'tiff',
  ico: 'ico',
}

export function detectFormat(buffer: Uint8Array, extension: string): ImageFormat {
  const extFormat = EXTENSION_MAP[extension.toLowerCase()]
  if (extFormat === 'svg') return 'svg'

  for (const [format, magic] of Object.entries(MAGIC_BYTES)) {
    if (buffer.length >= magic.length) {
      let match = true
      for (let i = 0; i < magic.length; i++) {
        if (buffer[i] !== magic[i]) {
          match = false
          break
        }
      }
      if (match) {
        if (format === 'webp') {
          const riffType = new TextDecoder().decode(buffer.slice(8, 12))
          if (riffType === 'WEBP') return 'webp'
          continue
        }
        return format as ImageFormat
      }
    }
  }

  return extFormat ?? 'jpeg'
}

export function getExtension(format: ImageFormat): string {
  const map: Record<ImageFormat, string> = {
    jpeg: 'jpg',
    png: 'png',
    webp: 'webp',
    avif: 'avif',
    gif: 'gif',
    svg: 'svg',
    bmp: 'bmp',
    tiff: 'tiff',
    ico: 'ico',
  }
  return map[format]
}

export function getMimeType(format: ImageFormat | OutputFormat): string {
  const map: Record<string, string> = {
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    avif: 'image/avif',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    bmp: 'image/bmp',
    tiff: 'image/tiff',
    ico: 'image/x-icon',
  }
  return map[format] ?? 'application/octet-stream'
}

export function isRasterFormat(format: ImageFormat): boolean {
  return format !== 'svg'
}

export function isAnimatedFormat(format: ImageFormat): boolean {
  return format === 'gif'
}

export function outputFormatsFrom(format: ImageFormat): OutputFormat[] {
  if (format === 'svg') return []
  if (format === 'gif') return ['webp', 'jpeg']
  return ['avif', 'webp', 'jpeg']
}
