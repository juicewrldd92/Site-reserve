import { cn } from './cn'

/**
 * Photo de produit, d'établissement ou de profil.
 *
 * Trois choses que le `<img>` nu ne fait pas :
 *
 * 1. **Dimensions déclarées** — sans elles, le navigateur ne réserve pas la
 *    place et la grille saute quand les images arrivent. C'est ce qui donne
 *    l'impression que « ça rame » même quand le réseau est bon.
 * 2. **Décodage asynchrone** — l'image ne bloque plus le rendu du reste.
 * 3. **Chargement différé** — les photos hors écran attendent leur tour.
 *
 * Le cache est géré par le service worker (voir `vite.config.ts`) : une fois
 * vue, une photo ne se retélécharge jamais, et reste visible hors-ligne.
 */
export function Photo({
  src,
  /** Côté affiché en pixels CSS : réserve la place avant l'arrivée de l'image. */
  size,
  alt = '',
  className,
  eager = false,
}: {
  src: string | null | undefined
  size: number
  alt?: string
  className?: string
  eager?: boolean
}) {
  if (!src) return <span className={cn('photo-ph block', className)} />

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className={cn('photo-ph block object-cover', className)}
    />
  )
}

// Note : Supabase sait redimensionner à la volée via `/render/image/`, ce qui
// éviterait de télécharger 640 px pour une vignette de 56. C'est réservé aux
// offres payantes, et si l'option manque toutes les photos disparaissent — on
// s'en passe tant qu'on n'a pas vérifié le plan du projet.
