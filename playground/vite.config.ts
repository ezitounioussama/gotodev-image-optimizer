import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import viteImageReact from '../src/vite-plugin.ts'

export default defineConfig({
  plugins: [
    react(),
    viteImageReact({
      adaptive: true,
      autoTune: true,
      formats: ['avif', 'webp', 'jpeg'],
      verbose: true,
      tiers: {
        ultra: { quality: 90, widths: [480, 768, 1024, 1920] },
        high: { quality: 80, widths: [480, 768, 1024] },
        medium: { quality: 60, widths: [480, 768] },
        low: { quality: 40, widths: [480] },
      },
    }),
  ],
})
