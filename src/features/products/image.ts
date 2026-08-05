/**
 * Compression des photos avant envoi.
 *
 * Une photo prise au téléphone pèse 3 à 12 Mo. En cuisine, sur un réseau
 * capricieux, envoyer ça est inacceptable — et le bucket refuse au-delà de
 * 5 Mo. On redimensionne côté client avant de toucher au réseau.
 */

const MAX_EDGE = 1024
const QUALITY = 0.82

export type PreparedImage = {
  blob: Blob
  extension: 'webp' | 'jpg'
  contentType: string
}

export async function prepareImage(source: Blob): Promise<PreparedImage> {
  const bitmap = await createImageBitmap(source)
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Impossible de préparer la photo')
    context.drawImage(bitmap, 0, 0, width, height)

    // Safari < 17 ne sait pas encoder en WebP : on retombe sur le JPEG.
    const webp = await toBlob(canvas, 'image/webp')
    if (webp) return { blob: webp, extension: 'webp', contentType: 'image/webp' }

    const jpeg = await toBlob(canvas, 'image/jpeg')
    if (jpeg) return { blob: jpeg, extension: 'jpg', contentType: 'image/jpeg' }

    throw new Error('Impossible de préparer la photo')
  } finally {
    bitmap.close()
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob !== null && blob.type === type ? blob : null),
      type,
      QUALITY,
    )
  })
}
