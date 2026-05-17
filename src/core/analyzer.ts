import sharp from 'sharp'
import { computeCenterWeight, computeEdgeDensity, computeEntropy } from '../utils/entropy.ts'
import type { TileAnalysis, TileQuality } from './types.ts'

export interface AnalysisResult {
  tiles: TileAnalysis[]
  tileQualities: TileQuality[]
  overallImportance: number
  tileSize: number
  width: number
  height: number
}

function computeSkinRatio(pixels: Uint8Array, width: number, height: number): number {
  let skin = 0
  const total = width * height

  for (let i = 0; i < total; i++) {
    const r = pixels[i * 3] ?? 0
    const g = pixels[i * 3 + 1] ?? 0
    const b = pixels[i * 3 + 2] ?? 0

    const cr = (r - 128) * 0.713 + (g - 128) * -0.287 + (b - 128) * -0.426 + 128
    const cb = (r - 128) * -0.169 + (g - 128) * -0.331 + (b - 128) * 0.5 + 128

    if (cr >= 133 && cr <= 173 && cb >= 77 && cb <= 127) {
      skin++
    }
  }

  return total > 0 ? skin / total : 0
}

export async function analyzeImage(
  imagePath: string,
  tileSize = 64,
  detectFaces = false,
): Promise<AnalysisResult> {
  const metadata = await sharp(imagePath).metadata()
  const width = metadata.width ?? 0
  const height = metadata.height ?? 0

  if (width === 0 || height === 0) {
    throw new Error('Could not read image dimensions')
  }

  const tilesX = Math.ceil(width / tileSize)
  const tilesY = Math.ceil(height / tileSize)
  const tiles: TileAnalysis[] = []

  let totalImportance = 0

  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      const left = tx * tileSize
      const top = ty * tileSize
      const tileW = Math.min(tileSize, width - left)
      const tileH = Math.min(tileSize, height - top)

      const buffer = await sharp(imagePath)
        .extract({ left, top, width: tileW, height: tileH })
        .raw()
        .toBuffer()

      const raw = new Uint8Array(buffer)
      const pixelCount = tileW * tileH
      const gray = new Uint8Array(pixelCount)

      for (let i = 0; i < pixelCount; i++) {
        const r = raw[i * 3] ?? 0
        const g = raw[i * 3 + 1] ?? 0
        const b = raw[i * 3 + 2] ?? 0
        gray[i] = Math.round(r * 0.299 + g * 0.587 + b * 0.114)
      }

      const entropy = computeEntropy(gray)
      const edgeDensity = computeEdgeDensity(gray, tileW, tileH)
      const centerWeight = computeCenterWeight(tx, ty, tilesX, tilesY)

      const normalizedEntropy = entropy / 8.0
      let importance = Math.min(1, normalizedEntropy * 0.4 + edgeDensity * 0.6)

      if (detectFaces && importance < 0.9) {
        const skinRatio = computeSkinRatio(raw, tileW, tileH)
        if (skinRatio > 0.05) {
          importance = Math.min(1, importance + 0.3)
        }
      }

      tiles.push({
        x: tx,
        y: ty,
        entropy,
        edgeDensity,
        importance,
        centerWeight,
      })

      totalImportance += importance
    }
  }

  const tileQualities = computeTileQualities(tiles)

  return {
    tiles,
    tileQualities,
    overallImportance: tiles.length > 0 ? totalImportance / tiles.length : 0,
    tileSize,
    width,
    height,
  }
}

function computeTileQualities(tiles: TileAnalysis[]): TileQuality[] {
  const tileQualities: TileQuality[] = []

  for (const tile of tiles) {
    let importance = tile.importance

    // Edge-density bonus: protect text and fine details
    if (tile.edgeDensity > 0.3) {
      const bonus = Math.min(0.2, (tile.edgeDensity - 0.3) * 0.5)
      importance = Math.min(1, importance + bonus)
    }

    // Center-weight bonus: photo subjects tend to be centered
    if (tile.centerWeight > 0.7) {
      importance = Math.min(1, importance + (tile.centerWeight - 0.7) * 0.3)
    }

    tileQualities.push({
      x: tile.x,
      y: tile.y,
      saliency: importance,
      quality: 0,
      weight: importance ** 2 + 0.1,
    })
  }

  return tileQualities
}

export function computeTargetQuality(
  analysis: AnalysisResult,
  baseQuality = 80,
  options?: {
    minQuality?: number
    maxQuality?: number
  },
): number {
  if (analysis.tiles.length === 0) return baseQuality

  const minQuality = options?.minQuality ?? Math.max(20, baseQuality - 30)
  const maxQuality = options?.maxQuality ?? Math.min(95, baseQuality + 10)

  const tileQualities = analysis.tileQualities

  // Compute per-tile quality and weight
  const weighted = tileQualities.map((tq) => ({
    quality: minQuality + tq.saliency * (maxQuality - minQuality),
    weight: tq.weight,
  }))

  // Sort by quality descending
  weighted.sort((a, b) => b.quality - a.quality)

  // Top 30% tiles get 70% weight — prioritizes important content
  const splitIndex = Math.max(1, Math.ceil(weighted.length * 0.3))
  const highPriority = weighted.slice(0, splitIndex)
  const lowPriority = weighted.slice(splitIndex)

  const highW = highPriority.reduce((s, t) => s + t.weight, 0)
  const lowW = lowPriority.reduce((s, t) => s + t.weight, 0)

  const highAvg = highPriority.reduce((s, t) => s + t.quality * t.weight, 0) / (highW || 1)
  const lowAvg = lowPriority.reduce((s, t) => s + t.quality * t.weight, 0) / (lowW || 1)

  const weightedQuality = highAvg * 0.7 + lowAvg * 0.3

  // Variance boost: high variance = mixed content → protect detail
  const qualities = weighted.map((t) => t.quality)
  const mean = qualities.reduce((s, q) => s + q, 0) / qualities.length
  const variance = qualities.reduce((s, q) => s + (q - mean) ** 2, 0) / qualities.length
  const stdDev = Math.sqrt(variance)
  const varianceBoost = stdDev > 12 ? Math.min(5, stdDev * 0.12) : 0

  return Math.round(Math.min(maxQuality, Math.max(minQuality, weightedQuality + varianceBoost)))
}
