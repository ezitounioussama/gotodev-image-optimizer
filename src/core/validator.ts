import { detectFormat } from './formats.ts'
import type { ImageFormat } from './types.ts'

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

const MAX_FILE_SIZE = 50 * 1024 * 1024
const ALLOWED_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'webp',
  'avif',
  'gif',
  'svg',
  'bmp',
  'tiff',
  'tif',
  'ico',
])

export function validatePath(filePath: string): void {
  if (filePath.includes('..')) {
    throw new ValidationError('Path traversal detected', 'PATH_TRAVERSAL')
  }
  if (filePath.includes('\0')) {
    throw new ValidationError('Null byte in path', 'NULL_BYTE')
  }
}

export function validateExtension(extension: string): void {
  if (!ALLOWED_EXTENSIONS.has(extension.toLowerCase())) {
    throw new ValidationError(`Unsupported file extension: .${extension}`, 'UNSUPPORTED_EXTENSION')
  }
}

export function validateFileSize(size: number, maxSize: number = MAX_FILE_SIZE): void {
  if (size > maxSize) {
    throw new ValidationError(`File size ${size} exceeds maximum ${maxSize}`, 'FILE_TOO_LARGE')
  }
}

export function validateImageContent(buffer: Uint8Array, extension: string): ImageFormat {
  const detectedFormat = detectFormat(buffer, extension)
  if (!detectedFormat) {
    throw new ValidationError(`Cannot detect image format for .${extension}`, 'INVALID_FORMAT')
  }
  return detectedFormat
}

export function validateOutputFormat(format: string): void {
  const allowed: string[] = ['avif', 'webp', 'jpeg', 'png']
  if (!allowed.includes(format)) {
    throw new ValidationError(`Unsupported output format: ${format}`, 'UNSUPPORTED_OUTPUT_FORMAT')
  }
}
