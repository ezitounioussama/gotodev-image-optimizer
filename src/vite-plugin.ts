import { existsSync, mkdirSync } from 'node:fs'
import { basename, extname, resolve } from 'node:path'
import type { Plugin, ResolvedConfig } from 'vite'
import { encodeImage } from './core/encoder.ts'
import { addToManifest, createManifest, writeManifest } from './core/manifest.ts'
import type { PluginOptions, QualityTier, TierConfig } from './core/types.ts'

const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|avif|gif|svg|bmp|tiff?|ico)$/i

const DEFAULT_TIERS: Record<QualityTier, TierConfig> = {
  ultra: { quality: 90, widths: [480, 768, 1024, 1920] },
  high: { quality: 80, widths: [480, 768, 1024] },
  medium: { quality: 60, widths: [480, 768] },
  low: { quality: 40, widths: [480] },
}

export default function viteImageReact(userOptions: PluginOptions = {}): Plugin {
  let config: ResolvedConfig
  let manifest = createManifest()
  const options: PluginOptions = {
    tiers: { ...DEFAULT_TIERS, ...userOptions.tiers },
    adaptive: userOptions.adaptive ?? true,
    autoTune: userOptions.autoTune ?? true,
    preprocess: userOptions.preprocess ?? true,
    faceDetection: userOptions.faceDetection ?? true,
    formats: userOptions.formats ?? ['avif', 'webp', 'jpeg'],
    maxFileSize: userOptions.maxFileSize ?? 50 * 1024 * 1024,
    verbose: userOptions.verbose ?? false,
  }

  return {
    name: 'vite-image-react',
    enforce: 'post',

    configResolved(resolved: ResolvedConfig) {
      config = resolved
    },

    async buildStart() {
      manifest = createManifest()
    },

    async transform(_code: string, id: string) {
      if (!IMAGE_EXTENSIONS.test(id)) return
      if (id.includes('node_modules')) return

      const outDir = resolve(config.root, config.build.outDir ?? 'dist', 'assets')
      if (!existsSync(outDir)) {
        mkdirSync(outDir, { recursive: true })
      }

      const tiers = options.tiers as Record<QualityTier, TierConfig>

      const formats = options.formats ?? (['avif', 'webp', 'jpeg'] as const)

      try {
        const entry = await encodeImage(id, {
          widths: tiers.high.widths,
          formats: [...formats],
          tiers,
          autoTune: options.autoTune ?? true,
          adaptive: options.adaptive ?? true,
          preprocess: options.preprocess ?? true,
          faceDetection: options.faceDetection ?? true,
          outDir,
        })

        const key = basename(id)
        addToManifest(manifest, key, entry)

        if (options.verbose) {
          console.log(`[vite-image-react] Optimized: ${key}`)
        }

        const manifestData = JSON.stringify(entry)
        const manifestPath = resolve(outDir, 'gimage-manifest.json')
        writeManifest(manifest, manifestPath)

        return {
          code: `export default ${manifestData};`,
          map: null,
        }
      } catch (error) {
        if (options.verbose) {
          console.error(`[vite-image-react] Failed to optimize ${id}:`, error)
        }
        return {
          code: `export default ${JSON.stringify({
            src: basename(id),
            width: 0,
            height: 0,
            format: extname(id).slice(1),
            placeholder: '',
            variants: [],
            tiers: {},
          })};`,
          map: null,
        }
      }
    },

    closeBundle() {
      const outDir = resolve(config.root, config.build.outDir ?? 'dist', 'assets')
      if (!existsSync(outDir)) {
        mkdirSync(outDir, { recursive: true })
      }
      const manifestPath = resolve(outDir, 'gimage-manifest.json')
      writeManifest(manifest, manifestPath)
    },
  }
}
