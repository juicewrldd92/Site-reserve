/* eslint-disable react/only-export-components -- Les icônes sont produites par
   une fabrique, que le linter ne reconnaît pas comme des composants. */

/**
 * Icônes de Réserve — tracés repris des maquettes (stroke 1.6–1.9, bouts ronds).
 * Elles héritent de `currentColor` : la couleur se pilote par la classe texte.
 */
import type { ReactNode, SVGProps } from 'react'

export type IconProps = Omit<SVGProps<SVGSVGElement>, 'viewBox' | 'fill'> & {
  size?: number
}

function makeIcon(box: number, path: ReactNode, defaultWidth = 1.7) {
  return function Icon({ size = 22, strokeWidth, ...props }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${box} ${box}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth ?? defaultWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...props}
      >
        {path}
      </svg>
    )
  }
}

export const HomeIcon = makeIcon(22, <path d="M3 9.5 11 3l8 6.5M5.5 8.8V19h11V8.8" />, 1.7)

export const BoxIcon = makeIcon(
  22,
  <path d="M3 7.5 11 3.5l8 4v7L11 18.5l-8-4zM3 7.5 11 11.5l8-4M11 11.5v7" />,
  1.7,
)

export const BellIcon = makeIcon(
  22,
  <path d="M5.7 9a5 5 0 0 1 10 0c0 4.3 1.7 5.3 1.7 5.3H4S5.7 13.3 5.7 9ZM8.9 17.2a2 2 0 0 0 3.4 0" />,
  1.7,
)

export const CartIcon = makeIcon(
  22,
  <>
    <path d="M2.5 3.5h2.3l2.2 9.6h8.3l1.7-6.6H6.3" />
    <circle cx="8.6" cy="17.2" r="1.4" />
    <circle cx="15.2" cy="17.2" r="1.4" />
  </>,
  1.7,
)

export const ScanIcon = makeIcon(
  27,
  <path d="M4 9V6a2 2 0 0 1 2-2h3M18 4h3a2 2 0 0 1 2 2v3M23 18v3a2 2 0 0 1-2 2h-3M9 23H6a2 2 0 0 1-2-2v-3M4 13.5h19" />,
  1.9,
)

export const PlusIcon = makeIcon(18, <path d="M9 3.5v11M3.5 9h11" />, 2)

export const MinusIcon = makeIcon(18, <path d="M3.5 9h11" />, 2)

export const CheckIcon = makeIcon(22, <path d="M5 11.5 9.2 15.5 17 7" />, 2.4)

export const CloseIcon = makeIcon(19, <path d="M5 5l9 9M14 5l-9 9" />, 1.9)

export const ChevronRightIcon = makeIcon(18, <path d="M7 4.5 12 9l-5 4.5" />, 1.8)

export const ChevronDownIcon = makeIcon(16, <path d="M4 6.5 8 10.5l4-4" />, 1.8)

export const SearchIcon = makeIcon(
  19,
  <>
    <circle cx="8.5" cy="8.5" r="5.5" />
    <path d="M12.6 12.6 17 17" />
  </>,
  1.8,
)

export const CalendarIcon = makeIcon(
  17,
  <>
    <rect x="2.5" y="4" width="12" height="11" rx="3" />
    <path d="M5.5 2.5v3M11.5 2.5v3M2.5 8h12" />
  </>,
  1.7,
)

export const PinIcon = makeIcon(
  22,
  <>
    <path d="M11 19s6-5.2 6-9.5a6 6 0 1 0-12 0C5 13.8 11 19 11 19Z" />
    <circle cx="11" cy="9.4" r="2.2" />
  </>,
  1.7,
)

export const SlidersIcon = makeIcon(
  19,
  <>
    <path d="M2.5 6h4M11 6h6M2.5 13h7M13.5 13h3.5" />
    <circle cx="8.7" cy="6" r="2" />
    <circle cx="11.7" cy="13" r="2" />
  </>,
  1.6,
)

export const UploadIcon = makeIcon(18, <path d="M9 3v12M3.5 8.5 9 3l5.5 5.5" />, 2)

export const DownloadIcon = makeIcon(18, <path d="M9 15V3M3.5 9.5 9 15l5.5-5.5" />, 2)

export const OfflineIcon = makeIcon(
  22,
  <>
    <path d="M3 3l16 16" />
    <path d="M4.2 8.6a11 11 0 0 1 3.6-2.2M14.6 6.6a11 11 0 0 1 3.2 2M7 11.7a7 7 0 0 1 2-1.2M13.3 10.7a7 7 0 0 1 1.7 1M9.6 14.6a3 3 0 0 1 2.9.2" />
    <circle cx="11" cy="17.6" r="0.6" fill="currentColor" />
  </>,
  1.7,
)

/** Logo « Réserve » : carré arrondi corail + viseur de scan. */
export function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <span
      className="bg-corail flex items-center justify-center"
      style={{ width: size, height: size, borderRadius: size * 0.32 }}
    >
      <svg
        width={size * 0.59}
        height={size * 0.59}
        viewBox="0 0 22 22"
        fill="none"
        stroke="#fff"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M3 7V4.5A1.5 1.5 0 0 1 4.5 3H7M15 3h2.5A1.5 1.5 0 0 1 19 4.5V7M19 15v2.5a1.5 1.5 0 0 1-1.5 1.5H15M7 19H4.5A1.5 1.5 0 0 1 3 17.5V15M3 11h16" />
      </svg>
    </span>
  )
}
