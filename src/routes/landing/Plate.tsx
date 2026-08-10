import { cn } from '@/components/ui/cn'

/**
 * Photographie de la vitrine.
 *
 * Dimensions déclarées et chargement différé, comme `Photo` côté app : sans
 * elles la page saute quand les images arrivent, et c'est ce qui donne
 * l'impression que « ça rame » même sur bon réseau.
 *
 * Le `ratio` est passé en classe Tailwind plutôt qu'en style : on veut pouvoir
 * changer de cadrage selon la largeur d'écran.
 */
export function Plate({
  name,
  alt,
  className,
  eager = false,
}: {
  /** Nom du fichier dans `public/photos`, sans extension. */
  name: 'tomates' | 'mozzarella' | 'basilic' | 'farine' | 'legumes'
  alt: string
  className?: string
  eager?: boolean
}) {
  return (
    <img
      src={`/photos/${name}.jpg`}
      alt={alt}
      width={1100}
      height={733}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className={cn('h-full w-full object-cover', className)}
    />
  )
}
