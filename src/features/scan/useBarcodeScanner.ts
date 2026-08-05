import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Abstraction unique du scan de code-barre.
 *
 * ─ Le piège n°1 du projet ────────────────────────────────────────────────
 * `BarcodeDetector`, l'API native du navigateur, n'existe PAS sur iOS : tous
 * les navigateurs iPhone tournent sur WebKit, qui ne l'implémente pas. Une app
 * qui repose dessus échoue silencieusement chez la majorité de nos utilisateurs.
 *
 * Donc : ZXing (décodage JS, marche partout) est le moteur par défaut, et
 * `BarcodeDetector` n'est qu'un accélérateur optionnel quand il est là
 * (Chrome Android). Le reste de l'app ignore lequel des deux tourne.
 * ─────────────────────────────────────────────────────────────────────────
 */

/** Ce qu'on croise sur des produits alimentaires. */
const FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
]

const NATIVE_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128']

/** Deux lectures du même code à moins de 2,5 s : c'est la même boîte. */
const DEDUPE_MS = 2500

export type ScannerEngine = 'zxing' | 'native'

export type ScannerErrorKind =
  | 'insecure-context'
  | 'permission-denied'
  | 'no-camera'
  | 'unknown'

export type ScannerError = { kind: ScannerErrorKind; message: string }

export type ScannerStatus = 'idle' | 'starting' | 'scanning' | 'error'

type NativeDetector = {
  detect: (source: CanvasImageSource) => Promise<Array<{ rawValue: string }>>
}

type NativeDetectorConstructor = (new (options: { formats: string[] }) => NativeDetector) & {
  getSupportedFormats?: () => Promise<string[]>
}

const MESSAGES: Record<ScannerErrorKind, string> = {
  'insecure-context':
    "La caméra n'est autorisée qu'en HTTPS. Ouvre l'app en https:// ou sur localhost.",
  'permission-denied':
    "Accès à la caméra refusé. Autorise-le dans les réglages du navigateur, puis réessaie.",
  'no-camera': "Aucune caméra trouvée sur cet appareil.",
  unknown: "La caméra n'a pas voulu démarrer.",
}

export function useBarcodeScanner({
  enabled = true,
  onDetect,
}: {
  enabled?: boolean
  onDetect: (barcode: string) => void
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastHitRef = useRef<{ code: string; at: number }>({ code: '', at: 0 })

  // `onDetect` change à chaque rendu du parent : on le garde dans une ref pour
  // ne pas relancer la caméra à chaque fois.
  const onDetectRef = useRef(onDetect)
  onDetectRef.current = onDetect

  const [status, setStatus] = useState<ScannerStatus>('idle')
  const [error, setError] = useState<ScannerError | null>(null)
  const [engine, setEngine] = useState<ScannerEngine>('zxing')
  const [attempt, setAttempt] = useState(0)

  const retry = useCallback(() => {
    setError(null)
    setAttempt((n) => n + 1)
  }, [])

  const handleHit = useCallback((raw: string) => {
    const code = raw.trim()
    if (code.length === 0) return

    const now = Date.now()
    const last = lastHitRef.current
    if (last.code === code && now - last.at < DEDUPE_MS) return
    lastHitRef.current = { code, at: now }

    onDetectRef.current(code)
  }, [])

  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    // Capturé une fois : la ref aura pu changer au moment du nettoyage.
    const video = videoRef.current

    async function start() {
      setStatus('starting')

      if (!window.isSecureContext) {
        setError({ kind: 'insecure-context', message: MESSAGES['insecure-context'] })
        setStatus('error')
        return
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setError({ kind: 'no-camera', message: MESSAGES['no-camera'] })
        setStatus('error')
        return
      }

      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })
      } catch (cause) {
        if (cancelled) return
        setError({ kind: classify(cause), message: MESSAGES[classify(cause)] })
        setStatus('error')
        return
      }

      if (cancelled) {
        stopStream(stream)
        return
      }

      streamRef.current = stream
      if (!video) {
        stopStream(stream)
        return
      }

      video.srcObject = stream
      video.setAttribute('playsinline', 'true') // iOS refuse le plein écran sinon
      try {
        await video.play()
      } catch {
        // Safari peut refuser un play() concurrent : le flux tourne quand même.
      }
      if (cancelled) return

      const native = await getNativeDetector()
      if (native) {
        setEngine('native')
        runNativeLoop(native, video)
      } else {
        setEngine('zxing')
        await runZxing(video)
      }
      if (!cancelled) setStatus('scanning')
    }

    function runNativeLoop(detector: NativeDetector, video: HTMLVideoElement) {
      let busy = false
      // Sur certaines plateformes `BarcodeDetector` existe mais `detect()`
      // rejette à chaque frame. Sans ce garde-fou, le viseur tournerait dans le
      // vide sans jamais rien lire : au bout de quelques échecs d'affilée, on
      // repasse sur ZXing, qui lui marche partout.
      let consecutiveFailures = 0

      const tick = () => {
        if (cancelled) return
        rafRef.current = requestAnimationFrame(tick)
        if (busy || video.readyState < 2) return
        busy = true
        void detector
          .detect(video)
          .then((codes) => {
            consecutiveFailures = 0
            const first = codes[0]
            if (first) handleHit(first.rawValue)
          })
          .catch(() => {
            consecutiveFailures += 1
            if (consecutiveFailures < 5 || cancelled) return
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
            rafRef.current = null
            setEngine('zxing')
            void runZxing(video)
          })
          .finally(() => {
            busy = false
          })
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    async function runZxing(video: HTMLVideoElement) {
      const hints = new Map()
      hints.set(DecodeHintType.POSSIBLE_FORMATS, FORMATS)
      hints.set(DecodeHintType.TRY_HARDER, true)

      const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120 })
      controlsRef.current = await reader.decodeFromVideoElement(video, (result) => {
        if (result) handleHit(result.getText())
      })
    }

    void start()

    return () => {
      cancelled = true
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      controlsRef.current?.stop()
      controlsRef.current = null
      if (streamRef.current) stopStream(streamRef.current)
      streamRef.current = null
      if (video) video.srcObject = null
      setStatus('idle')
    }
  }, [enabled, attempt, handleHit])

  return { videoRef, status, error, engine, retry }
}

function stopStream(stream: MediaStream): void {
  for (const track of stream.getTracks()) track.stop()
}

/**
 * `null` si l'API native est absente (tout iOS) ou incapable de lire nos
 * formats — dans les deux cas, ZXing prend le relais.
 */
async function getNativeDetector(): Promise<NativeDetector | null> {
  const ctor = (globalThis as { BarcodeDetector?: NativeDetectorConstructor }).BarcodeDetector
  if (!ctor) return null
  try {
    const supported = (await ctor.getSupportedFormats?.()) ?? []
    const usable = NATIVE_FORMATS.filter((format) => supported.includes(format))
    if (usable.length === 0) return null
    return new ctor({ formats: usable })
  } catch {
    return null
  }
}

function classify(cause: unknown): ScannerErrorKind {
  const name = cause instanceof Error ? cause.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'permission-denied'
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'no-camera'
  return 'unknown'
}
