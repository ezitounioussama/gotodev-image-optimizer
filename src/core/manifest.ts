import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type { BuildManifest, ManifestEntry } from './types.ts'

const MANIFEST_VERSION = '1.0.0'

export function createManifest(): BuildManifest {
  return {
    version: MANIFEST_VERSION,
    generatedAt: new Date().toISOString(),
    entries: {},
  }
}

export function addToManifest(manifest: BuildManifest, key: string, entry: ManifestEntry): void {
  manifest.entries[key] = entry
}

export function writeManifest(manifest: BuildManifest, outPath: string): void {
  const dir = dirname(outPath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  writeFileSync(outPath, JSON.stringify(manifest, null, 2))
}

export function loadManifest(manifestPath: string): BuildManifest | null {
  try {
    const content = readFileSafe(manifestPath)
    return JSON.parse(content) as BuildManifest
  } catch {
    return null
  }
}

function readFileSafe(path: string): string {
  return readFileSync(path, 'utf-8')
}
