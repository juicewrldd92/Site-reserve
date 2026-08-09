import { useEffect, useState, type InputHTMLAttributes } from 'react'

import { clean, format, parse } from './decimal'

/**
 * Saisie d'une quantité décimale, virgule comprise.
 *
 * `<input type="number">` refuse la virgule : un clavier français produit
 * « 0,5 » et le champ se vide sans rien dire. Comme on parle ici de kilos et de
 * litres, c'est le geste le plus fréquent de l'app qui cassait.
 *
 * On passe donc en `type="text"` avec `inputMode="decimal"` — le clavier
 * numérique s'affiche quand même sur mobile — et on tolère les deux
 * séparateurs.
 *
 * Le composant garde sa propre chaîne de saisie : sans ça, taper « 1, » serait
 * converti en `1` puis réaffiché « 1 », effaçant la virgule sous les doigts.
 */
export function DecimalInput({
  value,
  onValueChange,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: number
  onValueChange: (value: number) => void
}) {
  const [draft, setDraft] = useState(() => format(value))

  // Suit les changements venus d'ailleurs (boutons +/−, réinitialisation),
  // sans écraser ce que l'utilisateur est en train de taper.
  useEffect(() => {
    if (parse(draft) !== value) setDraft(format(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <input
      {...props}
      type="text"
      inputMode="decimal"
      value={draft}
      onChange={(event) => {
        const next = clean(event.target.value)
        setDraft(next)
        const parsed = parse(next)
        if (parsed !== null) onValueChange(parsed)
      }}
      onBlur={(event) => {
        // À la sortie du champ, on remet au propre : « 1, » devient « 1 ».
        setDraft(format(parse(draft) ?? 0))
        props.onBlur?.(event)
      }}
    />
  )
}
