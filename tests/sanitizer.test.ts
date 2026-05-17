import { describe, it, expect } from 'vitest'
import { sanitizeSvg, validateSvgContent } from '../src/core/sanitizer.ts'

describe('sanitizer', () => {
  describe('sanitizeSvg', () => {
    it('strips script tags', () => {
      const input = '<svg><script>alert("xss")</script></svg>'
      const result = sanitizeSvg(input)
      expect(result).not.toContain('script')
      expect(result).not.toContain('alert')
    })

    it('strips event handlers', () => {
      const input = '<svg onload="alert(1)"><rect onmouseover="evil()"/></svg>'
      const result = sanitizeSvg(input)
      expect(result).not.toContain('onload')
      expect(result).not.toContain('onmouseover')
    })

    it('strips javascript: URIs', () => {
      const input = '<svg><a xlink:href="javascript:alert(1)">click</a></svg>'
      const result = sanitizeSvg(input)
      expect(result).not.toContain('javascript:')
    })

    it('preserves safe SVG content', () => {
      const input = '<svg><rect width="100" height="100" fill="red"/></svg>'
      const result = sanitizeSvg(input)
      expect(result).toContain('rect')
      expect(result).toContain('fill="red"')
    })
  })

  describe('validateSvgContent', () => {
    it('rejects dangerous content', () => {
      expect(validateSvgContent('<svg><script></svg>')).toBe(false)
      expect(validateSvgContent('<svg onload="alert(1)">')).toBe(false)
      expect(validateSvgContent('<svg><?php echo "xss"; ?></svg>')).toBe(false)
    })

    it('accepts safe content', () => {
      expect(validateSvgContent('<svg><rect fill="blue"/></svg>')).toBe(true)
    })
  })
})
