import sharp from 'sharp'
import type { AnalysisResult } from './analyzer.ts'

const OVERLAP_PX = 8

export async function preprocessImage(
  imagePath: string,
  analysis: AnalysisResult,
): Promise<Buffer> {
  const { width, height, tileSize, tiles } = analysis

  const sorted = [...tiles].sort((a, b) => b.importance - a.importance)
  const topCount = Math.max(1, Math.ceil(sorted.length * 0.2))
  const importantTiles = sorted.slice(0, topCount)

  const composites: { input: Buffer; top: number; left: number }[] = []

  for (const tile of importantTiles) {
    const tileLeft = tile.x * tileSize
    const tileTop = tile.y * tileSize
    const tileW = Math.min(tileSize, width - tileLeft)
    const tileH = Math.min(tileSize, height - tileTop)

    const padL = tileLeft > 0 ? OVERLAP_PX : 0
    const padT = tileTop > 0 ? OVERLAP_PX : 0
    const padR = tileLeft + tileW < width ? OVERLAP_PX : 0
    const padB = tileTop + tileH < height ? OVERLAP_PX : 0

    const extLeft = tileLeft - padL
    const extTop = tileTop - padT
    const extWidth = tileW + padL + padR
    const extHeight = tileH + padT + padB

    const sigma = 1 + tile.importance * 1.2

    const sharpened = await sharp(imagePath)
      .extract({ left: extLeft, top: extTop, width: extWidth, height: extHeight })
      .sharpen(sigma)
      .png()
      .toBuffer()

    const trimmed = await sharp(sharpened)
      .extract({ left: padL, top: padT, width: tileW, height: tileH })
      .png()
      .toBuffer()

    composites.push({ input: trimmed, top: tileTop, left: tileLeft })
  }

  if (composites.length === 0) {
    return sharp(imagePath).png().toBuffer()
  }

  return sharp(imagePath)
    .composite(composites.map((c) => ({ input: c.input, top: c.top, left: c.left })))
    .png()
    .toBuffer()
}
