import type { DeviceFingerprint, QualityTier } from '../core/types.ts'

function getConnectionType(): 'slow-2g' | '2g' | '3g' | '4g' | 'unknown' {
  try {
    const conn = (navigator as unknown as { connection?: { effectiveType?: string } }).connection
    if (conn?.effectiveType) {
      const type = conn.effectiveType
      if (['slow-2g', '2g', '3g', '4g'].includes(type)) {
        return type as 'slow-2g' | '2g' | '3g' | '4g'
      }
    }
  } catch {}
  return 'unknown'
}

function getDeviceMemory(): number {
  try {
    const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory
    return mem ?? 4
  } catch {
    return 4
  }
}

function getHardwareConcurrency(): number {
  try {
    return navigator.hardwareConcurrency ?? 4
  } catch {
    return 4
  }
}

function getDevicePixelRatio(): number {
  try {
    return window.devicePixelRatio ?? 1
  } catch {
    return 1
  }
}

function getSaveData(): boolean {
  try {
    const sd = (navigator as unknown as { connection?: { saveData?: boolean } }).connection
    return sd?.saveData ?? false
  } catch {
    return false
  }
}

function computeTier(fp: Omit<DeviceFingerprint, 'tier'>): QualityTier {
  if (fp.saveData) return 'low'

  if (fp.effectiveType === 'slow-2g' || fp.effectiveType === '2g') {
    return 'low'
  }

  const score =
    (fp.effectiveType === '4g' ? 40 : fp.effectiveType === '3g' ? 20 : 0) +
    Math.min(fp.deviceMemory / 8, 1) * 25 +
    Math.min(fp.hardwareConcurrency / 8, 1) * 20 +
    Math.min(fp.devicePixelRatio / 3, 1) * 15

  if (score >= 80) return 'ultra'
  if (score >= 55) return 'high'
  if (score >= 30) return 'medium'
  return 'low'
}

let cachedFingerprint: DeviceFingerprint | null = null

export function getDeviceFingerprint(): DeviceFingerprint {
  if (cachedFingerprint) return cachedFingerprint

  const base = {
    effectiveType: getConnectionType(),
    deviceMemory: getDeviceMemory(),
    hardwareConcurrency: getHardwareConcurrency(),
    devicePixelRatio: getDevicePixelRatio(),
    saveData: getSaveData(),
  }

  cachedFingerprint = {
    ...base,
    tier: computeTier(base),
  }

  return cachedFingerprint
}

export function clearFingerprintCache(): void {
  cachedFingerprint = null
}

export function listenForChanges(onChange: (fp: DeviceFingerprint) => void): () => void {
  const handler = () => {
    clearFingerprintCache()
    onChange(getDeviceFingerprint())
  }

  try {
    const conn = (
      navigator as unknown as {
        connection?: { addEventListener?: (type: string, handler: () => void) => void }
      }
    ).connection
    conn?.addEventListener?.('change', handler)
    return () => {
      try {
        ;(
          conn as { removeEventListener?: (t: string, h: () => void) => void }
        )?.removeEventListener?.('change', handler)
      } catch {}
    }
  } catch {
    return () => {}
  }
}
