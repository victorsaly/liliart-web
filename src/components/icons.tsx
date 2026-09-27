/**
 * One drawn icon set, one stroke weight, so nothing in the app is an emoji
 * pretending to be an icon. 24px grid, 1.9 stroke, round caps — chunky enough
 * to read at a glance for someone who is seven.
 */

type Props = { className?: string }

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export const CameraIcon = (p: Props) => (
  <svg {...base} {...p}>
    <path d="M3 8.6A1.6 1.6 0 0 1 4.6 7h2.7l1.2-2h7l1.2 2h2.7A1.6 1.6 0 0 1 21 8.6v8.8a1.6 1.6 0 0 1-1.6 1.6H4.6A1.6 1.6 0 0 1 3 17.4z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
)

export const PictureIcon = (p: Props) => (
  <svg {...base} {...p}>
    <rect x="3.5" y="5" width="17" height="14" rx="2" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="M5 17.2l4.3-4.4 3 3 2.6-2.4L19 17.2" />
  </svg>
)

export const ScissorsIcon = (p: Props) => (
  <svg {...base} {...p}>
    <circle cx="6.5" cy="18" r="2.6" />
    <circle cx="6.5" cy="6" r="2.6" />
    <path d="M8.8 16.7 20 5.4M8.8 7.3 20 18.6M12.4 11.6 20 12" />
  </svg>
)

export const StarIcon = ({ filled = false, ...p }: Props & { filled?: boolean }) => (
  <svg {...base} {...p} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 3.6l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 17l-5.3 2.8 1.1-5.9L3.5 9.8l5.9-.8z" />
  </svg>
)

export const BookIcon = (p: Props) => (
  <svg {...base} {...p}>
    <path d="M4 5.2A1.2 1.2 0 0 1 5.2 4h4.3A2.5 2.5 0 0 1 12 6.5v12a2 2 0 0 0-2-2H5.2A1.2 1.2 0 0 1 4 15.3z" />
    <path d="M20 5.2A1.2 1.2 0 0 0 18.8 4h-4.3A2.5 2.5 0 0 0 12 6.5v12a2 2 0 0 1 2-2h4.8a1.2 1.2 0 0 0 1.2-1.2z" />
  </svg>
)

/** the grown-up marker: a bigger figure beside a smaller one */
export const GrownUpIcon = (p: Props) => (
  <svg {...base} {...p}>
    <circle cx="8.5" cy="6" r="2.4" />
    <path d="M4.8 20v-4.5a3.7 3.7 0 0 1 7.4 0V20" />
    <circle cx="17" cy="10.5" r="1.8" />
    <path d="M14.2 20v-3.2a2.8 2.8 0 0 1 5.6 0V20" />
  </svg>
)

export const PlusIcon = (p: Props) => (
  <svg {...base} {...p}><path d="M12 5.5v13M5.5 12h13" /></svg>
)

/** the odds and ends themselves: a box, a tube and a lid, sat on the table */
export const BitsIcon = (p: Props) => (
  <svg {...base} {...p}>
    <path d="M2.8 20.6h18.4" />
    <rect x="3.4" y="13.2" width="6.6" height="7.4" rx="1.2" />
    <rect x="11.6" y="9" width="4.4" height="11.6" rx="2.2" />
    <circle cx="19" cy="17.2" r="3.4" />
  </svg>
)

/** an idea: a bulb, with the little rays coming off it */
export const BulbIcon = (p: Props) => (
  <svg {...base} {...p}>
    <path d="M9.6 15.4a5 5 0 1 1 4.8 0v1.3a1.2 1.2 0 0 1-1.2 1.2h-2.4a1.2 1.2 0 0 1-1.2-1.2z" />
    <path d="M10.4 19.6h3.2" />
    <path d="M12 1.8v1.6M4.3 5.1l1.1 1.1M19.7 5.1l-1.1 1.1M2.4 12.4H4M20 12.4h1.6" />
  </svg>
)

export const BinIcon = (p: Props) => (
  <svg {...base} {...p}>
    <path d="M4.5 6.5h15M9.5 6.5V4.8a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1.7" />
    <path d="M6.2 6.5 7 19.2a1.6 1.6 0 0 0 1.6 1.5h6.8a1.6 1.6 0 0 0 1.6-1.5l.8-12.7" />
    <path d="M10.4 10.2v6.6M13.6 10.2v6.6" />
  </svg>
)

export const HideIcon = (p: Props) => (
  <svg {...base} {...p}>
    <path d="M3.2 12S6.7 6.2 12 6.2 20.8 12 20.8 12 17.3 17.8 12 17.8 3.2 12 3.2 12z" />
    <circle cx="12" cy="12" r="2.6" />
    <path d="M4.5 19.5 19.5 4.5" />
  </svg>
)

export const CloseIcon = (p: Props) => (
  <svg {...base} {...p}><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" /></svg>
)

export const ArrowLeftIcon = (p: Props) => (
  <svg {...base} {...p}><path d="M19 12H5.5M11 5.5 4.5 12l6.5 6.5" /></svg>
)

export const ArrowRightIcon = (p: Props) => (
  <svg {...base} {...p}><path d="M5 12h13.5M13 5.5 19.5 12 13 18.5" /></svg>
)

/** the finished-it mark: a ribbon rosette */
export const RosetteIcon = (p: Props) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="9" r="5.5" />
    <path d="M12 6.2l1.1 2.2 2.4.35-1.75 1.7.41 2.4L12 11.72 9.84 12.87l.41-2.4L8.5 8.77l2.4-.35z" />
    <path d="M8.6 13.7 6.5 21l5.5-2.6 5.5 2.6-2.1-7.3" />
  </svg>
)
