export function computeSSIM(
  original: Uint8Array,
  compressed: Uint8Array,
  width: number,
  height: number,
): number {
  const K1 = 0.01
  const K2 = 0.03
  const L = 255
  const C1 = (K1 * L) ** 2
  const C2 = (K2 * L) ** 2

  const windowSize = 8
  const step = 4
  let totalSSIM = 0
  let windows = 0

  for (let y = 0; y <= height - windowSize; y += step) {
    for (let x = 0; x <= width - windowSize; x += step) {
      let sumX = 0
      let sumY = 0
      let sumX2 = 0
      let sumY2 = 0
      let sumXY = 0
      let count = 0

      for (let wy = 0; wy < windowSize; wy++) {
        for (let wx = 0; wx < windowSize; wx++) {
          const idx = (y + wy) * width + (x + wx)
          const ox = original[idx] ?? 0
          const cy = compressed[idx] ?? 0
          sumX += ox
          sumY += cy
          sumX2 += ox * ox
          sumY2 += cy * cy
          sumXY += ox * cy
          count++
        }
      }

      const muX = sumX / count
      const muY = sumY / count
      const sigmaX2 = sumX2 / count - muX * muX
      const sigmaY2 = sumY2 / count - muY * muY
      const sigmaXY = sumXY / count - muX * muY

      const numerator = (2 * muX * muY + C1) * (2 * sigmaXY + C2)
      const denominator = (muX * muX + muY * muY + C1) * (sigmaX2 + sigmaY2 + C2)

      totalSSIM += denominator > 0 ? numerator / denominator : 1
      windows++
    }
  }

  return windows > 0 ? totalSSIM / windows : 1
}
