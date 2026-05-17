export function computeEntropy(pixels: Uint8Array): number {
  const histogram = new Float64Array(256)
  const len = pixels.length

  for (let i = 0; i < len; i++) {
    const val = pixels[i]
    if (val !== undefined) {
      histogram[val] = (histogram[val] ?? 0) + 1
    }
  }

  let entropy = 0
  const lenF = len
  for (let i = 0; i < 256; i++) {
    const count = histogram[i]
    if (count && count > 0) {
      const p = count / lenF
      entropy -= p * Math.log2(p)
    }
  }

  return entropy
}

export function computeEdgeDensity(pixels: Uint8Array, width: number, height: number): number {
  let edges = 0
  let total = 0

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x
      const center = pixels[idx] ?? 0
      const right = pixels[idx + 1] ?? 0
      const down = pixels[idx + width] ?? 0
      const dx = Math.abs(center - right)
      const dy = Math.abs(center - down)

      if (dx > 20 || dy > 20) {
        edges++
      }
      total++
    }
  }

  return total > 0 ? edges / total : 0
}

export function computeSaliency(pixels: Uint8Array, width: number, height: number): number {
  const entropy = computeEntropy(pixels)
  const edgeDensity = computeEdgeDensity(pixels, width, height)
  const normalizedEntropy = entropy / 8.0
  return normalizedEntropy * 0.5 + edgeDensity * 0.5
}

export function computeCenterWeight(
  tileX: number,
  tileY: number,
  tilesX: number,
  tilesY: number,
): number {
  const cx = (tileX + 0.5) / tilesX - 0.5
  const cy = (tileY + 0.5) / tilesY - 0.5
  const dist = Math.sqrt(cx * cx + cy * cy)
  const normalizedDist = Math.min(1, dist / Math.SQRT1_2)
  return 1.0 - normalizedDist * 0.4
}
