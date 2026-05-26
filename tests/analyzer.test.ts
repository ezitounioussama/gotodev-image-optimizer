import { describe, it, expect } from 'vitest'
import { computeTargetQuality } from '../src/core/analyzer.ts'
import type { AnalysisResult } from '../src/core/analyzer.ts'

function makeAnalysis(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    tiles: [
      { x: 0, y: 0, entropy: 7.5, edgeDensity: 0.8, importance: 0.9, centerWeight: 0.5 },
      { x: 1, y: 0, entropy: 2.0, edgeDensity: 0.1, importance: 0.2, centerWeight: 0.3 },
      { x: 0, y: 1, entropy: 5.0, edgeDensity: 0.4, importance: 0.6, centerWeight: 0.7 },
      { x: 1, y: 1, entropy: 1.0, edgeDensity: 0.05, importance: 0.1, centerWeight: 0.2 },
    ],
    tileQualities: [
      { x: 0, y: 0, saliency: 0.9, quality: 0, weight: 0.91 },
      { x: 1, y: 0, saliency: 0.2, quality: 0, weight: 0.14 },
      { x: 0, y: 1, saliency: 0.7, quality: 0, weight: 0.59 },
      { x: 1, y: 1, saliency: 0.1, quality: 0, weight: 0.11 },
    ],
    overallImportance: 0.45,
    tileSize: 64,
    width: 128,
    height: 128,
    ...overrides,
  }
}

describe('computeTargetQuality', () => {
  it('returns base quality for empty tiles', () => {
    const result = computeTargetQuality({ ...makeAnalysis(), tiles: [], tileQualities: [] }, 80)
    expect(result).toBe(80)
  })

  it('returns higher quality for high-saliency content', () => {
    const lowAnalysis = makeAnalysis({
      tileQualities: [
        { x: 0, y: 0, saliency: 0.1, quality: 0, weight: 0.11 },
        { x: 1, y: 0, saliency: 0.15, quality: 0, weight: 0.12 },
        { x: 0, y: 1, saliency: 0.12, quality: 0, weight: 0.11 },
        { x: 1, y: 1, saliency: 0.08, quality: 0, weight: 0.1 },
      ],
    })
    const highAnalysis = makeAnalysis({
      tileQualities: [
        { x: 0, y: 0, saliency: 0.95, quality: 0, weight: 0.95 },
        { x: 1, y: 0, saliency: 0.85, quality: 0, weight: 0.82 },
        { x: 0, y: 1, saliency: 0.9, quality: 0, weight: 0.91 },
        { x: 1, y: 1, saliency: 0.8, quality: 0, weight: 0.74 },
      ],
    })
    expect(computeTargetQuality(highAnalysis, 80)).toBeGreaterThan(
      computeTargetQuality(lowAnalysis, 80),
    )
  })

  it('respects minQuality and maxQuality bounds', () => {
    const analysis = makeAnalysis({
      tileQualities: [
        { x: 0, y: 0, saliency: 1.0, quality: 0, weight: 1.0 },
        { x: 1, y: 0, saliency: 1.0, quality: 0, weight: 1.0 },
        { x: 0, y: 1, saliency: 1.0, quality: 0, weight: 1.0 },
        { x: 1, y: 1, saliency: 1.0, quality: 0, weight: 1.0 },
      ],
    })
    const result = computeTargetQuality(analysis, 80, { minQuality: 50, maxQuality: 60 })
    expect(result).toBeGreaterThanOrEqual(50)
    expect(result).toBeLessThanOrEqual(60)
  })
})
