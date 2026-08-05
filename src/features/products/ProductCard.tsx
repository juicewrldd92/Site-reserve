import { StatusBadge, type StatusTone } from '@/components/ui/StatusBadge'
import type { ProductRow } from '@/lib/database.types'

/**
 * Carte de la grille « façon Yuka » : photo 4:3, pastille en surimpression.
 * Le statut se lit sans lire le texte.
 */
export function ProductCard({
  product,
  subtitle,
  badge,
}: {
  product: ProductRow
  subtitle: string
  badge?: { tone: StatusTone; label: string }
}) {
  return (
    <article className="bg-surface rounded-card shadow-card-lg overflow-hidden">
      <div className="photo-ph relative h-[132px]">
        {product.image_url && (
          <img
            src={product.image_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        )}
        {badge && (
          <StatusBadge tone={badge.tone} size="sm" className="absolute top-2 right-2">
            {badge.label}
          </StatusBadge>
        )}
      </div>
      <div className="flex flex-col gap-[3px] px-3 pt-2.5 pb-3.5">
        <span className="line-clamp-2 text-[14.5px] leading-[1.25] font-bold">
          {product.name}
        </span>
        <span className="text-ink-muted text-[12.5px]">{subtitle}</span>
      </div>
    </article>
  )
}
