import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { CloseIcon, PlusIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { cn } from '@/components/ui/cn'
import { productsQueryKey } from '@/features/products/productKeys'
import { resolveBarcode, type BarcodeResolution } from '@/features/products/productRepository'
import { ScanResultSheet } from '@/features/scan/ScanResultSheet'
import { scanFeedback } from '@/features/scan/feedback'
import { useBarcodeScanner } from '@/features/scan/useBarcodeScanner'
import { AddToStockSheet } from '@/features/stock/AddToStockSheet'
import { addToStock, stockQueryKey } from '@/features/stock/stockRepository'
import { useTenancy } from '@/features/tenancy/useTenancy'

/**
 * Scanner plein écran.
 *
 * Le viseur reste ouvert en continu : on scanne une caisse entière sans
 * revenir en arrière entre deux produits.
 */
export function Scan() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { current } = useTenancy()

  const [location, setLocation] = useState<string | null>(
    () => current?.locations[0] ?? null,
  )
  const [resolution, setResolution] = useState<BarcodeResolution | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [adding, setAdding] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const inFlight = useRef(false)

  const scanned = resolution?.kind === 'unknown' ? null : (resolution?.product ?? null)

  const onDetect = useCallback(
    (barcode: string) => {
      const orgId = current?.org_id
      if (!orgId || inFlight.current) return

      inFlight.current = true
      setBusy(true)
      setFailure(null)
      scanFeedback()

      void resolveBarcode(orgId, barcode)
        .then(async (result) => {
          if (result.kind === 'unknown') {
            // Inconnu d'Open Food Facts : on bascule en saisie manuelle avec le
            // code déjà rempli. C'est le cas courant sur des produits pro.
            navigate(`/produit/nouveau?code=${encodeURIComponent(result.barcode)}`)
            return
          }
          await queryClient.invalidateQueries({ queryKey: productsQueryKey })
          setResolution(result)
        })
        .catch((cause: unknown) => {
          setFailure(cause instanceof Error ? cause.message : 'Le scan a échoué.')
        })
        .finally(() => {
          setBusy(false)
          inFlight.current = false
        })
    },
    [current?.org_id, navigate, queryClient],
  )

  // On coupe la caméra pendant l'affichage du résultat : ça économise la
  // batterie et évite de re-scanner la boîte encore dans la main.
  const { videoRef, status, error, engine, retry } = useBarcodeScanner({
    enabled: resolution === null,
    onDetect,
  })

  /** « Ajouter ×1 » : quantité 1, unité et emplacement par défaut, on enchaîne. */
  const quickAdd = useCallback(() => {
    if (!scanned || !current) return
    setAdding(true)
    setFailure(null)
    void addToStock({
      establishmentId: current.id,
      productId: scanned.id,
      quantity: 1,
      unit: scanned.default_unit,
      location: location ?? '',
    })
      .then(async () => {
        await queryClient.invalidateQueries({ queryKey: stockQueryKey })
        setResolution(null)
      })
      .catch((cause: unknown) => {
        setFailure(cause instanceof Error ? cause.message : "L'ajout a échoué.")
      })
      .finally(() => setAdding(false))
  }, [current, location, queryClient, scanned])

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[#171310] text-white">
      <video
        ref={videoRef}
        muted
        playsInline
        className={cn(
          'absolute inset-0 h-full w-full object-cover transition-opacity duration-300',
          status === 'scanning' ? 'opacity-100' : 'opacity-0',
        )}
      />
      <div className="absolute inset-0 bg-[radial-gradient(120%_70%_at_50%_42%,rgb(255_255_255/0.10),rgb(0_0_0/0.55)_70%)]" />

      <header
        className="relative flex items-center justify-between px-5 pb-2"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 14px)' }}
      >
        <button
          type="button"
          aria-label="Fermer le scanner"
          onClick={() => navigate(-1)}
          className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-white/15 backdrop-blur-sm"
        >
          <CloseIcon size={19} />
        </button>
        <span className="text-[15.5px] font-bold">Scanner</span>
        <span className="w-[42px]" />
      </header>

      <div className="relative flex flex-1 flex-col items-center justify-center gap-6 px-6">
        {status === 'error' && error ? (
          <div className="flex max-w-[300px] flex-col items-center gap-4 text-center">
            <p className="text-[16px] leading-[1.5] font-semibold text-white/90">
              {error.message}
            </p>
            <Button block={false} onClick={retry}>
              Réessayer
            </Button>
          </div>
        ) : (
          <>
            <div className="relative h-[262px] w-[262px]">
              <span className="border-corail absolute top-0 left-0 h-14 w-14 rounded-tl-[22px] border-t-4 border-l-4" />
              <span className="border-corail absolute top-0 right-0 h-14 w-14 rounded-tr-[22px] border-t-4 border-r-4" />
              <span className="border-corail absolute bottom-0 left-0 h-14 w-14 rounded-bl-[22px] border-b-4 border-l-4" />
              <span className="border-corail absolute right-0 bottom-0 h-14 w-14 rounded-br-[22px] border-b-4 border-r-4" />
              {status === 'scanning' && !busy && (
                <span className="animate-sweep absolute top-1/2 right-3.5 left-3.5 h-0.5 bg-[linear-gradient(90deg,transparent,#FF5A3C,transparent)] shadow-[0_0_18px_rgb(255_90_60/0.9)]" />
              )}
            </div>
            <p className="max-w-[250px] text-center text-[15.5px] leading-[1.5] font-semibold text-white/85">
              {busy
                ? 'On cherche ce produit…'
                : status === 'scanning'
                  ? 'Vise le code-barres, on s’occupe du reste.'
                  : 'On allume la caméra…'}
            </p>
          </>
        )}

        {failure && (
          <p className="bg-alert-bg text-alert-ink rounded-card px-4 py-3 text-center text-[13.5px] font-semibold">
            {failure}
          </p>
        )}
      </div>

      <div
        className="relative flex flex-col gap-3.5 px-6"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 32px)' }}
      >
        {current && current.locations.length > 0 && (
          <div className="no-scrollbar flex gap-2.5 overflow-x-auto">
            {current.locations.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setLocation(option)}
                className={cn(
                  'rounded-full px-[15px] py-2.5 text-[13.5px] whitespace-nowrap backdrop-blur-sm',
                  location === option
                    ? 'bg-white font-bold text-[#1A1A1A]'
                    : 'bg-white/15 font-semibold text-white',
                )}
              >
                {option}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/produit/nouveau')}
            className="flex h-14 flex-1 items-center justify-center gap-2 rounded-full border-[1.6px] border-white/55 bg-white/10 text-[14.5px] font-bold text-white backdrop-blur-sm"
          >
            <PlusIcon size={18} strokeWidth={2} />
            Sans code-barre
          </button>
          <button
            type="button"
            onClick={() => navigate('/ticket')}
            className="flex h-14 flex-1 items-center justify-center gap-2 rounded-full border-[1.6px] border-white/55 bg-white/10 text-[14.5px] font-bold text-white backdrop-blur-sm"
          >
            Scanner un ticket
          </button>
        </div>

        {status === 'scanning' && (
          <p className="text-center font-mono text-[11px] text-white/40">
            moteur : {engine === 'native' ? 'BarcodeDetector' : 'ZXing'}
          </p>
        )}
      </div>

      {scanned && !detailsOpen && (
        <ScanResultSheet
          product={scanned}
          isNew={resolution?.kind === 'imported'}
          adding={adding}
          onQuickAdd={quickAdd}
          onDetails={() => setDetailsOpen(true)}
        />
      )}

      {scanned && detailsOpen && (
        <AddToStockSheet
          product={scanned}
          open
          defaultLocation={location}
          onClose={() => {
            setDetailsOpen(false)
            setResolution(null)
          }}
        />
      )}
    </div>
  )
}
