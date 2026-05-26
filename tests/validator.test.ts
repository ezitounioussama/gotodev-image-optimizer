import { describe, it, expect } from 'vitest'
import {
  validatePath,
  validateExtension,
  validateFileSize,
  validateImageContent,
  validateOutputFormat,
  ValidationError,
} from '../src/core/validator.ts'
import type { ImageFormat } from '../src/core/types.ts'

const ALL_EXTENSIONS: [string, ImageFormat][] = [
  ['jpg', 'jpeg'],
  ['jpeg', 'jpeg'],
  ['png', 'png'],
  ['webp', 'webp'],
  ['avif', 'avif'],
  ['gif', 'gif'],
  ['svg', 'svg'],
  ['bmp', 'bmp'],
  ['tiff', 'tiff'],
  ['tif', 'tiff'],
  ['ico', 'ico'],
]

const ALL_OUTPUT_FORMATS = ['avif', 'webp', 'jpeg', 'png']

describe('validatePath', () => {
  it('rejects path traversal', () => {
    expect(() => validatePath('../etc/passwd')).toThrow(ValidationError)
    expect(() => validatePath('images/../../../etc/passwd')).toThrow(ValidationError)
    expect(() => validatePath('..\\windows\\system32')).toThrow(ValidationError)
  })

  it('rejects null bytes', () => {
    expect(() => validatePath('image.jpg\0')).toThrow(ValidationError)
    expect(() => validatePath('safe\0name.jpg')).toThrow(ValidationError)
  })

  it('accepts safe paths for all formats', () => {
    for (const [ext] of ALL_EXTENSIONS) {
      expect(() => validatePath(`images/photo.${ext}`)).not.toThrow()
      expect(() => validatePath(`deeply/nested/path/image.${ext}`)).not.toThrow()
    }
  })

  it('accepts paths with hyphens and underscores', () => {
    expect(() => validatePath('my-image_01.jpg')).not.toThrow()
    expect(() => validatePath('assets/hero-banner_v2.webp')).not.toThrow()
  })
})

describe('validateExtension — all image extensions', () => {
  for (const [ext] of ALL_EXTENSIONS) {
    it(`accepts .${ext}`, () => {
      expect(() => validateExtension(ext)).not.toThrow()
    })
  }

  it('rejects unsupported extensions', () => {
    const bad = ['exe', 'pdf', 'txt', 'html', 'js', 'ts', 'css', 'json', 'xml', 'doc', 'zip', 'mp4']
    for (const ext of bad) {
      expect(() => validateExtension(ext)).toThrow(ValidationError)
    }
  })

  it('is case-insensitive', () => {
    expect(() => validateExtension('JPG')).not.toThrow()
    expect(() => validateExtension('PnG')).not.toThrow()
    expect(() => validateExtension('SVG')).not.toThrow()
  })
})

describe('validateFileSize', () => {
  it('accepts files under max size', () => {
    expect(() => validateFileSize(0)).not.toThrow()
    expect(() => validateFileSize(1024)).not.toThrow()
    expect(() => validateFileSize(50 * 1024 * 1024)).not.toThrow()
  })

  it('rejects files over max size', () => {
    expect(() => validateFileSize(100 * 1024 * 1024, 50 * 1024 * 1024)).toThrow(ValidationError)
  })

  it('uses default 50MB max size', () => {
    expect(() => validateFileSize(60 * 1024 * 1024)).toThrow(ValidationError)
  })

  it('accepts custom max size', () => {
    expect(() => validateFileSize(10, 100)).not.toThrow()
    expect(() => validateFileSize(200, 100)).toThrow(ValidationError)
  })
})

describe('validateImageContent — all input formats', () => {
  it('detects JPEG', () => {
    expect(validateImageContent(new Uint8Array([0xFF, 0xD8, 0xFF]), 'jpg')).toBe('jpeg')
  })

  it('detects PNG', () => {
    expect(validateImageContent(new Uint8Array([0x89, 0x50, 0x4E, 0x47]), 'png')).toBe('png')
  })

  it('detects GIF', () => {
    expect(validateImageContent(new Uint8Array([0x47, 0x49, 0x46, 0x38]), 'gif')).toBe('gif')
  })

  it('detects SVG by extension', () => {
    expect(validateImageContent(new Uint8Array([0x3C]), 'svg')).toBe('svg')
  })

  it('detects BMP', () => {
    expect(validateImageContent(new Uint8Array([0x42, 0x4D]), 'bmp')).toBe('bmp')
  })

  it('detects TIFF (little-endian)', () => {
    expect(validateImageContent(new Uint8Array([0x49, 0x49, 0x2A, 0x00]), 'tiff')).toBe('tiff')
  })

  it('detects ICO', () => {
    expect(validateImageContent(new Uint8Array([0x00, 0x00, 0x01, 0x00]), 'ico')).toBe('ico')
  })

  it('falls back to jpeg for unrecognized content', () => {
    expect(validateImageContent(new Uint8Array([0x00, 0x00, 0x00]), 'exe')).toBe('jpeg')
  })
})

describe('validateOutputFormat — all output formats', () => {
  for (const fmt of ALL_OUTPUT_FORMATS) {
    it(`accepts ${fmt}`, () => {
      expect(() => validateOutputFormat(fmt)).not.toThrow()
    })
  }

  it('rejects non-output formats', () => {
    const bad = ['gif', 'svg', 'bmp', 'tiff', 'ico', 'jpg', 'pdf']
    for (const fmt of bad) {
      expect(() => validateOutputFormat(fmt)).toThrow(ValidationError)
    }
  })
})
