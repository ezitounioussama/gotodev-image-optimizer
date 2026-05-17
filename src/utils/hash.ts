import { createHash } from 'node:crypto'

export function contentHash(buffer: Buffer): string {
  return createHash('sha384').update(buffer).digest('base64url').slice(0, 16)
}

export function sriHash(buffer: Buffer): string {
  const hash = createHash('sha384').update(buffer).digest('base64')
  return `sha384-${hash}`
}
