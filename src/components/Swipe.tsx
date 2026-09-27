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
/*
 * ...or how fast. Distance alone punishes a flick: a quick confident swipe
 * that only travels 70px did nothing, which reads as the app ignoring you.
 * Past this speed a shorter pull still counts, so long as it went somewhere.
 */
const FLICK = 0.11  /* px per ms — the velocity-dismiss threshold */
const LEAST = 36    /* px — below this it was a nudge, however fast */

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
  const from = useRef<{ x: number; y: number; at: number } | null>(null)
  /* the untouched travel: `dx` has friction in it past the trip point, so it
     is the wrong number to measure speed with */
  const raw = useRef(0)
  const axis = useRef<'?' | 'x' | 'y'>('?')
  const moved = useRef(false)

  function down(e: React.PointerEvent) {
    /* Clear first, and for every kind of pointer: a swipe that ends without a
       tap would otherwise leave this armed and eat the next real press. */
    moved.current = false
    /* and clear the gesture itself, for every pointer kind: a mouse press
       returns below without starting one, so anything left over from the last
       swipe would still be sitting here when its release runs */
    axis.current = '?'
    raw.current = 0
    /* a mouse has the buttons; this is for thumbs */
    if (e.pointerType === 'mouse' || (!right && !left)) return
    from.current = { x: e.clientX, y: e.clientY, at: e.timeStamp }
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
    raw.current = x
    let v = x
    if (v > 0 && !right) v = 0
    if (v < 0 && !left) v = 0
    /* past the trip point it gets stiff, so the stop is something you feel */
    if (Math.abs(v) > TRIP) v = Math.sign(v) * (TRIP + (Math.abs(v) - TRIP) * 0.35)
    setDx(Math.max(-MAX, Math.min(MAX, v)))
  }

  function up(e: React.PointerEvent) {
    const start = from.current
    const sideways = axis.current === 'x'
    const travelled = Math.abs(raw.current)
    const towards = raw.current
    /* the gesture is over: nothing below may outlive this call */
    from.current = null
    axis.current = '?'
    raw.current = 0
    setDragging(false)
    if (!sideways || !start) { setDx(0); return }

    /* far enough, or fast enough — a confident flick need not go the distance */
    const speed = travelled / Math.max(1, e.timeStamp - start.at)
    const enough = travelled >= TRIP || (speed >= FLICK && travelled >= LEAST)

    const act = towards > 0 ? right : left
    if (!act || !enough) { setDx(0); return }

    if (act.tone === 'bin') {
      /* send it off the edge; the row unmounts behind the animation */
      setDx(towards > 0 ? 420 : -420)
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
