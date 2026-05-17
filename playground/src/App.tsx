import { GImage } from '../../src/index.ts'

export default function App() {
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <h1>gotodev-image-optimizer Playground</h1>
      <p style={{ marginBottom: 32 }}>
        Images below are auto-optimized via the Vite plugin.
        Open DevTools → Network to see AVIF/WebP variants being served.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
        <section>
          <h2>Hero Image (Priority)</h2>
          <GImage
            src="/images/hero.jpg"
            alt="Hero"
            priority
            sizes="(max-width: 768px) 100vw, 1200px"
          />
        </section>
        <section>
          <h2>Product Photo</h2>
          <GImage src="/images/product.jpg" alt="Product" sizes="50vw" />
        </section>
        <section>
          <h2>Gallery (Lazy Loaded)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <GImage src="/images/gallery-1.jpg" alt="Gallery 1" />
            <GImage src="/images/gallery-2.jpg" alt="Gallery 2" />
            <GImage src="/images/gallery-3.jpg" alt="Gallery 3" />
            <GImage src="/images/gallery-4.jpg" alt="Gallery 4" />
          </div>
        </section>
      </div>
    </div>
  )
}
