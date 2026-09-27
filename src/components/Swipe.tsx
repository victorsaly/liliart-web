import { useRef, useState, type ReactNode } from 'react'

export interface SwipeAction {
  label: string
  icon: ReactNode
  /** 'go' is the keeping kind, 'bin' the removing kind — it colours the tray */
  tone: 'go' | 'bin'
  run: () => void
}

/** how far you have to pull before letting go does anything */
const TRIP = 84
const MAX = 128

interface Props {
  /** revealed by pulling right, the way a phone reveals a positive action */
  right?: SwipeAction
  /** revealed by pulling left */
  left?: SwipeAction
  children: ReactNode
}

/**
 * Slide a card sideways to act on it.
 *
 * `touch-action: pan-y` on the sliding layer is what makes this co-operate
 * with the page: the browser keeps vertical scrolling for itself and hands us
 * only the sideways movement, so a list still scrolls normally under a thumb.
 *
 * Every action here is also a real button on the card. A gesture nobody finds
 * is not a feature, and a seven-year-old will find the button first.
 */
export function Swipe({ right, left, children }: Props) {
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const from = useRef<{ x: number; y: number } | null>(null)
  const axis = useRef<'?' | 'x' | 'y'>('?')
  const moved = useRef(false)

  function down(e: React.PointerEvent) {
    /* Clear first, and for every kind of pointer: a swipe that ends without a
       tap would otherwise leave this armed and eat the next real press. */
    moved.current = false
    /* a mouse has the buttons; this is for thumbs */
    if (e.pointerType === 'mouse' || (!right && !left)) return
    from.current = { x: e.clientX, y: e.clientY }
    axis.current = '?'
  }

  function move(e: React.PointerEvent) {
    const start = from.current
    if (!start) return
    const x = e.clientX - start.x
    const y = e.clientY - start.y

    if (axis.current === '?') {
      if (Math.abs(x) < 10 && Math.abs(y) < 10) return
      axis.current = Math.abs(x) > Math.abs(y) ? 'x' : 'y'
      if (axis.current === 'x') {
        e.currentTarget.setPointerCapture(e.pointerId)
        setDragging(true)
      }
    }
    if (axis.current !== 'x') return

    moved.current = true
    let v = x
    if (v > 0 && !right) v = 0
    if (v < 0 && !left) v = 0
    /* past the trip point it gets stiff, so the stop is something you feel */
    if (Math.abs(v) > TRIP) v = Math.sign(v) * (TRIP + (Math.abs(v) - TRIP) * 0.35)
    setDx(Math.max(-MAX, Math.min(MAX, v)))
  }

  function up() {
    from.current = null
    setDragging(false)
    if (axis.current !== 'x') { setDx(0); return }

    const act = dx > 0 ? right : left
    if (!act || Math.abs(dx) < TRIP) { setDx(0); return }

    if (act.tone === 'bin') {
      /* send it off the edge; the row unmounts behind the animation */
      setDx(dx > 0 ? 420 : -420)
      window.setTimeout(act.run, 170)
    } else {
      setDx(0)
      act.run()
    }
  }

  const shown = dx > 0 ? right : dx < 0 ? left : undefined
  const armed = Math.abs(dx) >= TRIP

  return (
    <div className="swipe">
      {shown && (
        <div
          className={`swipe-tray tone-${shown.tone} ${dx > 0 ? 'is-left' : 'is-right'} ${armed ? 'is-armed' : ''}`}
          aria-hidden="true"
        >
          {shown.icon}
          <span>{shown.label}</span>
        </div>
      )}
      <div
        className="swipe-top"
        style={{
          transform: dx ? `translateX(${dx}px)` : undefined,
          transition: dragging ? 'none' : 'transform .22s var(--ease)',
        }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        /* a drag that ends on the card must not also count as a tap */
        onClickCapture={(e) => {
          if (!moved.current) return
          moved.current = false
          e.preventDefault()
          e.stopPropagation()
        }}
      >
        {children}
      </div>
    </div>
  )
}
