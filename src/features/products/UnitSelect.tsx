import { Select } from '@/components/ui/Select'
import type { ProductUnit } from '@/lib/database.types'

import { FAMILY_LABELS, UNITS_BY_FAMILY, unitLabel } from './units'

/**
 * Choix de l'unité de mesure.
 *
 * Les unités sont groupées par famille (à l'unité, poids, volume,
 * conditionnement) : la liste reste lisible même quand elle s'allonge. Pour en
 * ajouter une, on touche `units.ts` et l'enum en base — pas cet écran.
 */
export function UnitSelect({
  value,
  onChange,
  label = 'Unité',
  className,
}: {
  value: ProductUnit
  onChange: (unit: ProductUnit) => void
  label?: string
  className?: string
}) {
  return (
    <Select
      label={label}
      value={value}
      className={className}
      onChange={(event) => onChange(event.target.value as ProductUnit)}
    >
      {UNITS_BY_FAMILY.filter((group) => group.units.length > 0).map((group) => (
        <optgroup key={group.family} label={FAMILY_LABELS[group.family]}>
          {group.units.map((unit) => (
            <option key={unit} value={unit}>
              {unitLabel(unit, 2)}
            </option>
          ))}
        </optgroup>
      ))}
    </Select>
  )
}
