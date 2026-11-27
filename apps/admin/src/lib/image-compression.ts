const DEFAULT_MAX_DIMENSION = 1200
const DEFAULT_QUALITY = 0.82
const SKIP_COMPRESSION_THRESHOLD_BYTES = 350 * 1024 // 350KB

async function loadImageSource(file: File): Promise<{
  source: CanvasImageSource
  width: number
  height: number
  cleanup: () => void
}> {
  // createImageBitmap respects EXIF orientation on modern mobile browsers
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(file)
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      cleanup: () => bitmap.close(),
    }
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      resolve({
        source: img,
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        cleanup: () => URL.revokeObjectURL(url),
      })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la imagen seleccionada.'))
    }
    img.src = url
  })
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality)
  })
}

/**
 * Resizes and compresses an image file in the browser so mobile camera photos
 * (often 3-12MB) stay well within Next.js / Vercel upload payload limits.
 */
export async function compressImageFile(
  file: File,
  maxDimension = DEFAULT_MAX_DIMENSION,
  quality = DEFAULT_QUALITY
): Promise<File> {
  if (!file.type.startsWith('image/')) {
    return file
  }

  const isAlreadyWebp = file.type === 'image/webp'
  if (isAlreadyWebp && file.size <= SKIP_COMPRESSION_THRESHOLD_BYTES) {
    return file
  }

  try {
    const { source, width, height, cleanup } = await loadImageSource(file)
    try {
      const longestSide = Math.max(width, height)
      const scale = longestSide > maxDimension ? maxDimension / longestSide : 1
      const targetWidth = Math.max(1, Math.round(width * scale))
      const targetHeight = Math.max(1, Math.round(height * scale))

      const canvas = document.createElement('canvas')
      canvas.width = targetWidth
      canvas.height = targetHeight

      const ctx = canvas.getContext('2d')
      if (!ctx) return file

      ctx.drawImage(source, 0, 0, targetWidth, targetHeight)

      // Always encode as WebP for consistency; fallback to JPEG only if browser lacks WebP encoding
      let blob = await canvasToBlob(canvas, 'image/webp', quality)
      let ext = 'webp'

      if (!blob || blob.type !== 'image/webp') {
        blob = await canvasToBlob(canvas, 'image/jpeg', quality)
        ext = 'jpg'
      }

      if (!blob || (isAlreadyWebp && blob.size >= file.size)) {
        return file
      }

      const baseName = file.name.replace(/\.[^.]+$/, '') || 'product'
      return new File([blob], `${baseName}.${ext}`, {
        type: blob.type,
        lastModified: Date.now(),
      })
    } finally {
      cleanup()
    }
  } catch {
    return file
  }
}

