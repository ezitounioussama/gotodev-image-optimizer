import type { ManifestEntry, QualityTier } from '../core/types.ts'

export function resolveTierSrc(metadata: ManifestEntry, tier: QualityTier): string {
  const tierSrc = metadata.tiers[tier]
  if (tierSrc) return tierSrc

  const tierOrder: QualityTier[] = ['ultra', 'high', 'medium', 'low']
  const tierIndex = tierOrder.indexOf(tier)

  for (let i = tierIndex - 1; i >= 0; i--) {
    const fallbackTier = tierOrder[i]
    if (!fallbackTier) break
    const fallback = metadata.tiers[fallbackTier]
    if (fallback) return fallback
  }

  return metadata.src
}

export function resolveVariantsForTier(
  metadata: ManifestEntry,
  tier: QualityTier,
): ManifestEntry['variants'] {
  const tierWidths: Record<QualityTier, number> = {
    ultra: 1920,
    high: 1024,
    medium: 768,
    low: 480,
  }

  const maxWidth = tierWidths[tier]

  return metadata.variants.filter((v) => v.width <= maxWidth)
}
