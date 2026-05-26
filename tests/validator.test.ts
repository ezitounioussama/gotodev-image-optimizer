import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validatePath, validateExtension, validateFileSize, validateImageContent, validateOutputFormat, ValidationError } from '../src/core/validator.ts'

describe('validatePath', () => {
  it('rejects path traversal', () => {
    expect(() => validatePath('../etc/passwd')).toThrow(ValidationError)
    expect(() => validatePath('images/../../../etc/passwd')).toThrow(ValidationError)
  })

  it('rejects null bytes', () => {
    expect(() => validatePath('image.jpg\0')).toThrow(ValidationError)
  })

  it('accepts safe paths', () => {
    expect(() => validatePath('images/photo.jpg')).not.toThrow()
    expect(() => validatePath('assets/img.png')).not.toThrow()
    expect(() => validatePath('deeply/nested/path/image.webp')).not.toThrow()
  })
})

describe('validateExtension', () => {
  it('rejects unsupported extensions', () => {
    expect(() => validateExtension('exe')).toThrow(ValidationError)
    expect(() => validateExtension('pdf')).toThrow(ValidationError)
    expect(() => validateExtension('txt')).toThrow(ValidationError)
  })

  it('accepts valid image extensions', () => {
    expect(() => validateExtension('jpg')).not.toThrow()
    expect(() => validateExtension('jpeg')).not.toThrow()
    expect(() => validateExtension('png')).not.toThrow()
    expect(() => validateExtension('webp')).not.toThrow()
    expect(() => validateExtension('avif')).not.toThrow()
    expect(() => validateExtension('svg')).not.toThrow()
    expect(() => validateExtension('gif')).not.toThrow()
    expect(() => validateExtension('bmp')).not.toThrow()
    expect(() => validateExtension('tiff')).not.toThrow()
    expect(() => validateExtension('tif')).not.toThrow()
    expect(() => validateExtension('ico')).not.toThrow()
  })
})

describe('validateFileSize', () => {
  it('rejects files over max size', () => {
    expect(() => validateFileSize(100 * 1024 * 1024, 50 * 1024 * 1024)).toThrow(ValidationError)
  })

  it('accepts files under max size', () => {
    expect(() => validateFileSize(1024 * 1024)).not.toThrow()
  })

  it('accepts files at exactly max size', () => {
    expect(() => validateFileSize(50 * 1024 * 1024, 50 * 1024 * 1024)).not.toThrow()
  })
})

describe('validateImageContent', () => {
  it('detects JPEG from magic bytes', () => {
    const buffer = new Uint8Array([0xFF, 0xD8, 0xFF])
    expect(validateImageContent(buffer, 'jpg')).toBe('jpeg')
  })

  it('detects PNG from magic bytes', () => {
    const buffer = new Uint8Array([0x89, 0x50, 0x4E, 0x47])
    expect(validateImageContent(buffer, 'png')).toBe('png')
  })

  it('detects SVG by extension', () => {
    const buffer = new Uint8Array([0x3c])
    expect(validateImageContent(buffer, 'svg')).toBe('svg')
  })

  it('falls back to jpeg for undetectable content', () => {
    expect(validateImageContent(new Uint8Array([0, 0, 0]), 'exe')).toBe('jpeg')
  })
})

describe('validateOutputFormat', () => {
  it('accepts valid output formats', () => {
    expect(() => validateOutputFormat('avif')).not.toThrow()
    expect(() => validateOutputFormat('webp')).not.toThrow()
    expect(() => validateOutputFormat('jpeg')).not.toThrow()
    expect(() => validateOutputFormat('png')).not.toThrow()
  })

  it('rejects invalid output formats', () => {
    expect(() => validateOutputFormat('gif')).toThrow(ValidationError)
    expect(() => validateOutputFormat('svg')).toThrow(ValidationError)
  })
})
