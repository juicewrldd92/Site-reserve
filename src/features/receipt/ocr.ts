/**
 * Reconnaissance de texte sur une photo de ticket.
 *
 * Tesseract tourne entièrement dans le navigateur : rien ne part sur un
 * serveur, aucune clé d'API, aucun coût par ticket. En contrepartie la lecture
 * d'un ticket thermique froissé reste approximative — c'est pour ça que
 * l'écran de révision est obligatoire avant l'écriture en stock.
 *
 * Le moteur est isolé derrière `recognizeReceipt()` : passer plus tard à un
 * OCR spécialisé ne touchera que ce fichier.
 */

export type OcrProgress = {
  /** 0 → 1. */
  ratio: number
  label: string
}

const STEP_LABELS: Record<string, string> = {
  'loading tesseract core': 'Préparation du moteur…',
  'initializing tesseract': 'Préparation du moteur…',
  'loading language traineddata': 'Chargement du français…',
  'initializing api': 'Presque prêt…',
  'recognizing text': 'Lecture du ticket…',
}

/**
 * Redimensionne et contraste la photo avant reconnaissance.
 *
 * Un ticket photographié fait 4000 px de large pour un texte fin et gris.
 * Passer en niveaux de gris avec un seuil dur double la qualité de lecture, et
 * réduire la taille évite de faire ramer le téléphone.
 */
async function prepare(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  try {
    const maxEdge = 1600
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return file

    context.drawImage(bitmap, 0, 0, width, height)

    const image = context.getImageData(0, 0, width, height)
    const pixels = image.data
    for (let i = 0; i < pixels.length; i += 4) {
      const grey =
        0.299 * (pixels[i] ?? 0) + 0.587 * (pixels[i + 1] ?? 0) + 0.114 * (pixels[i + 2] ?? 0)
      // Seuil volontairement haut : l'encre thermique est pâle.
      const value = grey > 160 ? 255 : 0
      pixels[i] = value
      pixels[i + 1] = value
      pixels[i + 2] = value
    }
    context.putImageData(image, 0, 0)

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/png'),
    )
    return blob ?? file
  } finally {
    bitmap.close()
  }
}

/**
 * @returns le texte brut reconnu, ligne par ligne.
 * @throws si le moteur ne peut pas être chargé (hors-ligne au premier usage).
 */
export async function recognizeReceipt(
  file: Blob,
  onProgress?: (progress: OcrProgress) => void,
): Promise<string> {
  // Import dynamique : Tesseract pèse plusieurs mégaoctets et ne doit pas
  // ralentir le démarrage de l'app pour ceux qui ne scannent pas de ticket.
  const { createWorker } = await import('tesseract.js')

  const prepared = await prepare(file)

  const worker = await createWorker('fra', 1, {
    logger: (message: { status?: string; progress?: number }) => {
      if (!onProgress) return
      onProgress({
        ratio: message.progress ?? 0,
        label: STEP_LABELS[message.status ?? ''] ?? 'Lecture du ticket…',
      })
    },
  })

  try {
    const { data } = await worker.recognize(prepared)
    return data.text
  } finally {
    await worker.terminate()
  }
}
