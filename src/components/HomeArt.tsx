/*
 * The home screen's own drawings, cut from the same paper as the rest of it:
 * flat shapes in the app's four colours, laid one on another.
 *
 * The two buttons used to carry small photographs that looked alike at a
 * glance — both a phone held over a table. A camera and a pile of prints are
 * different shapes from across the room, which is the distance a child
 * decides at.
 */

const hide = { 'aria-hidden': true, focusable: false } as const

/** A camera, for "Take a photo". */
export const TakeArt = () => (
  <svg className="big-art" viewBox="0 0 120 96" {...hide}>
    <rect x="15" y="31" width="96" height="58" rx="13" fill="#5e0444" opacity=".35" />
    <rect x="36" y="13" width="36" height="20" rx="7" fill="#fff" />
    <rect x="10" y="25" width="96" height="58" rx="13" fill="#fff" />
    <rect x="18" y="16" width="14" height="9" rx="4.5" fill="#f5a623" />
    <rect x="82" y="34" width="15" height="9" rx="4.5" fill="#f5a623" />
    <circle cx="58" cy="54" r="22" fill="#12b3a4" />
    <circle cx="58" cy="54" r="13.5" fill="#0b5a52" />
    <circle cx="52.5" cy="48.5" r="4.2" fill="#fff" opacity=".85" />
  </svg>
)

/** Two prints, one on the other, for "Choose a photo". */
export const ChooseArt = () => (
  <svg className="big-art" viewBox="0 0 120 96" {...hide}>
    <g transform="rotate(-9 52 48)">
      <rect x="14" y="14" width="72" height="62" rx="7" fill="#fff" />
      <rect x="20" y="20" width="60" height="40" rx="3" fill="#ffd98a" />
      <circle cx="38" cy="36" r="7" fill="#f5a623" />
    </g>
    <g transform="rotate(7 70 54)">
      <rect x="39" y="27" width="72" height="62" rx="7" fill="#7a0a59" opacity=".3" />
      <rect x="35" y="22" width="72" height="62" rx="7" fill="#fff" />
      <rect x="41" y="28" width="60" height="40" rx="3" fill="#d6f2ef" />
      <circle cx="88" cy="40" r="6" fill="#f5a623" />
      <path d="M41 68 58 47l11 12 9-8 23 17z" fill="#12b3a4" />
    </g>
  </svg>
)

/**
 * Bits and bobs, left lying beside the heading: a tube, a bottle top, a scrap
 * of paper, a button. They are the things the sentence next to them names.
 */
export const Bits = () => (
  <svg className="bits" viewBox="0 0 210 96" {...hide}>
    <g transform="rotate(-16 46 52)">
      <rect x="8" y="38" width="78" height="30" rx="15" fill="#12b3a4" />
      <ellipse cx="72" cy="53" rx="7" ry="11" fill="#0b5a52" />
    </g>
    <path d="M120 8 166 22 132 54z" fill="#dd4f97" />
    <circle cx="112" cy="70" r="19" fill="#f5a623" />
    <circle cx="112" cy="70" r="11" fill="#ffd98a" />
    <circle cx="176" cy="64" r="15" fill="#b00b80" />
    <circle cx="171" cy="60" r="2.6" fill="#fff" />
    <circle cx="181" cy="60" r="2.6" fill="#fff" />
    <circle cx="171" cy="69" r="2.6" fill="#fff" />
    <circle cx="181" cy="69" r="2.6" fill="#fff" />
    <path d="m190 12 3.4 7.6 8.2.9-6.1 5.6 1.7 8.1-7.2-4.1-7.2 4.1 1.7-8.1-6.1-5.6 8.2-.9z" fill="#f5a623" />
  </svg>
)
