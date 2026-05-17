import { describe, it, expect } from 'vitest'
import { renderToString } from 'react-dom/server'
import GImage from '../src/components/GImage.tsx'
import type { ManifestEntry } from '../src/core/types.ts'

function makeMeta(overrides: Partial<ManifestEntry> = {}): ManifestEntry {
  return {
    src: 'test.jpg',
    width: 1920,
    height: 1080,
    format: 'jpeg',
    placeholder: '',
    tiers: { ultra: 'test.jpg', high: 'test.jpg', medium: 'test.jpg', low: 'test.jpg' },
    variants: [
      { src: 'test-480.webp', width: 480, format: 'webp', size: 10000, integrity: 'sha384-test' },
      { src: 'test-1024.webp', width: 1024, format: 'webp', size: 20000, integrity: 'sha384-test' },
      { src: 'test-480.jpg', width: 480, format: 'jpeg', size: 15000, integrity: 'sha384-test' },
    ],
    ...overrides,
  }
}

describe('GImage', () => {
  it('renders img with alt text', () => {
    const html = renderToString(<GImage src={makeMeta()} alt="Test Alt" />)
    expect(html).toContain('Test Alt')
    expect(html).toContain('<img')
  })

  it('renders picture element with sources', () => {
    const html = renderToString(<GImage src={makeMeta()} alt="Test" />)
    expect(html).toContain('<picture')
    expect(html).toContain('<source')
    expect(html).toContain('image/webp')
    expect(html).toContain('test-480.webp')
  })

  it('renders plain img when src is a string', () => {
    const html = renderToString(<GImage src="https://example.com/image.jpg" alt="Remote" />)
    expect(html).toContain('https://example.com/image.jpg')
    expect(html).not.toContain('<picture')
  })

  it('passes width/height for CLS prevention', () => {
    const html = renderToString(<GImage src={makeMeta()} alt="Cls" />)
    expect(html).toContain('width="1920"')
    expect(html).toContain('height="1080"')
  })
})
