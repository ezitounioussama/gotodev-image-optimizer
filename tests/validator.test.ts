import { describe, it, expect } from 'vitest'
import { validatePath, validateExtension, validateFileSize, ValidationError } from '../src/core/validator.ts'

describe('validator', () => {
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
    })
  })

  describe('validateExtension', () => {
    it('rejects unsupported extensions', () => {
      expect(() => validateExtension('exe')).toThrow(ValidationError)
      expect(() => validateExtension('pdf')).toThrow(ValidationError)
    })

    it('accepts valid extensions', () => {
      expect(() => validateExtension('jpg')).not.toThrow()
      expect(() => validateExtension('png')).not.toThrow()
      expect(() => validateExtension('webp')).not.toThrow()
      expect(() => validateExtension('svg')).not.toThrow()
    })
  })

  describe('validateFileSize', () => {
    it('rejects files over max size', () => {
      expect(() => validateFileSize(100 * 1024 * 1024, 50 * 1024 * 1024)).toThrow(ValidationError)
    })

    it('accepts files under max size', () => {
      expect(() => validateFileSize(1024 * 1024)).not.toThrow()
    })
  })
})
