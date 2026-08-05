import { CheckIcon } from '@/components/icons'
import { Button } from '@/components/ui/Button'
import { unitLabel } from '@/features/products/units'
import type { ProductRow } from '@/lib/database.types'

/**
 * « Le moment satisfaisant » — la carte qui pop après un scan réussi.
 * Un tap pour enchaîner, l'app empile le reste toute seule.
 */
export function ScanResultSheet({
  product,
  isNew,
  adding,
  onQuickAdd,
  onDetails,
}: {
  product: ProductRow
  isNew: boolean
  adding: boolean
  /** Ajout express avec les valeurs par défaut : le geste nominal. */
  onQuickAdd: () => void
  onDetails: () => void
}) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-[radial-gradient(90%_55%_at_50%_45%,rgb(18_183_106/0.30),rgb(0_0_0/0.72)_72%)]" />

      <div className="animate-pop relative flex w-[296px] flex-col items-center gap-3.5 rounded-[30px] bg-white p-[22px] pt-[26px] shadow-[0_30px_70px_rgb(0_0_0/0.45)]">
        <div className="relative">
          <span className="photo-ph block h-[150px] w-[150px] overflow-hidden rounded-[26px]">
            {product.image_url && (
              <img src={product.image_url} alt="" className="h-full w-full object-cover" />
            )}
          </span>
          <span className="bg-ok absolute -right-2.5 -bottom-2.5 flex h-[46px] w-[46px] items-center justify-center rounded-full border-4 border-white text-white">
            <CheckIcon size={22} strokeWidth={2.4} />
          </span>
        </div>

        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-ok text-[13px] font-bold">
            {isNew ? 'Scan terminé 🎉' : 'Déjà dans ton catalogue'}
          </span>
          <span className="text-[19px] leading-tight font-extrabold tracking-[-0.02em]">
            {product.name}
          </span>
          <span className="text-ink-muted text-[13.5px]">
            {[product.brand, `en ${unitLabel(product.default_unit, 1)}`, product.barcode]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </div>

        <div className="flex w-full gap-2.5 pt-0.5">
          <Button variant="secondary" size="md" className="flex-1" onClick={onDetails}>
            Détails
          </Button>
          <Button
            size="md"
            className="flex-[1.4]"
            disabled={adding}
            onClick={onQuickAdd}
          >
            {adding ? 'On range…' : 'Ajouter ×1'}
          </Button>
        </div>
      </div>

      <p className="absolute bottom-24 left-0 w-full text-center text-[13.5px] font-semibold text-white/70">
        Continue à scanner, ça s'empile tout seul
      </p>
    </div>
  )
}
