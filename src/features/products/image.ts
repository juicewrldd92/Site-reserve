/**
 * Préparation des images avant envoi.
 *
 * Une photo prise au téléphone pèse 3 à 12 Mo. En cuisine, sur un réseau
 * capricieux, envoyer ça est inacceptable — et les buckets refusent au-delà de
 * leur limite. On redimensionne côté client avant de toucher au réseau.
 */

export type PreparedImage = {
  blob: Blob
  extension: 'webp' | 'jpg'
  contentType: string
}

export type PrepareOptions = {
  /** Plus grand côté après redimensionnement. */
  maxEdge?: number
  quality?: number
  /** Recadre au centre en carré — pour les photos de profil, affichées en rond. */
  square?: boolean
}

export async function prepareImage(
  source: Blob,
  options: PrepareOptions = {},
): Promise<PreparedImage> {
  const { maxEdge = 1024, quality = 0.82, square = false } = options

  const bitmap = await createImageBitmap(source)
  try {
    // En carré, on prend le plus grand carré centré plutôt que d'écraser
    // l'image : un visage déformé, ça se voit tout de suite.
    const cropSide = Math.min(bitmap.width, bitmap.height)
    const sx = square ? (bitmap.width - cropSide) / 2 : 0
    const sy = square ? (bitmap.height - cropSide) / 2 : 0
    const sw = square ? cropSide : bitmap.width
    const sh = square ? cropSide : bitmap.height

    const scale = Math.min(1, maxEdge / Math.max(sw, sh))
    const width = Math.max(1, Math.round(sw * scale))
    const height = Math.max(1, Math.round(sh * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Impossible de préparer la photo')
    context.drawImage(bitmap, sx, sy, sw, sh, 0, 0, width, height)

    // Safari < 17 ne sait pas encoder en WebP : on retombe sur le JPEG.
    const webp = await toBlob(canvas, 'image/webp', quality)
    if (webp) return { blob: webp, extension: 'webp', contentType: 'image/webp' }

    const jpeg = await toBlob(canvas, 'image/jpeg', quality)
    if (jpeg) return { blob: jpeg, extension: 'jpg', contentType: 'image/jpeg' }

    throw new Error('Impossible de préparer la photo')
  } finally {
    bitmap.close()
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob !== null && blob.type === type ? blob : null),
      type,
      quality,
    )
  })
}
