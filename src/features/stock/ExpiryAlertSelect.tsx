import { useState } from 'react'

import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'
import { useTenancy } from '@/features/tenancy/useTenancy'

/** Les délais proposés, en jours. */
const PRESETS = [
  { days: 1, label: '1 jour avant' },
  { days: 3, label: '3 jours avant' },
  { days: 7, label: '1 semaine avant' },
  { days: 30, label: '1 mois avant' },
] as const

const CUSTOM = 'custom'
const INHERIT = 'inherit'

/**
 * Délai de prévenance avant la DLC, produit par produit.
 *
 * Un yaourt et un sac de farine ne se surveillent pas au même rythme. `null`
 * signifie « comme le reste de l'établissement » — c'est le défaut, et ça évite
 * d'obliger à choisir à chaque ajout.
 */
export function ExpiryAlertSelect({
  value,
  onChange,
  label = 'Me prévenir',
}: {
  value: number | null
  onChange: (days: number | null) => void
  label?: string
}) {
  const { current } = useTenancy()
  const inherited = current?.dlc_alert_days ?? 5

  const isPreset = value !== null && PRESETS.some((preset) => preset.days === value)
  const [custom, setCustom] = useState(value !== null && !isPreset)

  const selected = custom ? CUSTOM : value === null ? INHERIT : String(value)

  return (
    <div className="flex flex-col gap-2.5">
      <Select
        label={label}
        value={selected}
        onChange={(event) => {
          const next = event.target.value
          if (next === CUSTOM) {
            setCustom(true)
            onChange(value ?? inherited)
            return
          }
          setCustom(false)
          onChange(next === INHERIT ? null : Number(next))
        }}
      >
        <option value={INHERIT}>
          Comme l'établissement ({inherited} jour{inherited > 1 ? 's' : ''})
        </option>
        {PRESETS.map((preset) => (
          <option key={preset.days} value={preset.days}>
            {preset.label}
          </option>
        ))}
        <option value={CUSTOM}>Personnalisé…</option>
      </Select>

      {custom && (
        <Card className="flex items-center gap-3 px-4 py-3.5">
          <input
            type="number"
            min={1}
            max={365}
            inputMode="numeric"
            value={value ?? inherited}
            onChange={(event) => {
              const days = Number(event.target.value)
              if (Number.isFinite(days)) onChange(Math.min(365, Math.max(1, days)))
            }}
            className="w-20 border-0 bg-transparent text-[17px] font-bold outline-none"
            aria-label="Nombre de jours avant la DLC"
          />
          <span className="text-ink-muted text-[14px] font-semibold">
            jour{(value ?? inherited) > 1 ? 's' : ''} avant la date limite
          </span>
        </Card>
      )}
    </div>
  )
}
