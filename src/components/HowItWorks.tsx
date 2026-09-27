import { useEffect, useRef } from 'react'

const KEY = 'liliart-seen-how'

/** Blocked storage means it shows again, which is the harmless way to be wrong. */
export function seenHow(): boolean {
  try { return localStorage.getItem(KEY) === '1' } catch { return false }
}
export function markSeenHow(): void {
  try { localStorage.setItem(KEY, '1') } catch { /* nothing to do about it */ }
}

/*
 * The pictures are photographs of the thing each step describes, made once and
 * shipped with the app rather than drawn at run time: they cost nothing to
 * show, and a child who cannot yet read the sentence can still see what is
 * being asked. All four were made to one brief — daylight, a pale table, hands
 * but no faces — so they sit together as a set.
 */
const STEPS = [
  {
    img: 'bits',
    title: 'Put your things out',
    text: 'Boxes, tubes, lids, scraps, odd socks. Spread them on the table.',
  },
  {
    img: 'photo',
    title: 'Take a photo of them',
    text: 'It looks at the picture and counts what it can see.',
  },
  {
    img: 'ideas',
    title: 'Pick an idea',
    text: 'Every one uses the things you actually have. Tap it for the steps.',
  },
  {
    img: 'made',
    title: 'Make it, then show it',
    text: 'One step at a time. Photograph the finished thing and it goes on your shelf.',
  },
]

/**
 * What happens here, before anything has happened. Shown once, and reachable
 * again from the table — a child meeting this for the first time has no idea
 * that photographing a pile of rubbish is the way in.
 */
export function HowItWorks({ onClose }: { onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    /* focus the panel, not the button: focusing the button paints a ring on
       it for someone who only tapped, and this is where reading starts */
    box.current?.focus()
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onClose])

  return (
    <div className="how" ref={box} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="how-title">
      <div className="how-in">
        <img className="how-logo" src="/icon.svg" alt="" width="60" height="60" />
        <p className="how-hello">Hello, this is LiliArt</p>
        <h2 id="how-title">Make something out of what you already have</h2>

        <ol className="how-steps">
          {STEPS.map((s, n) => (
            <li key={s.title}>
              <span className="how-mark">
                {/* the sentence beside it says the same thing, so this is decorative */}
                <img src={`/how/${s.img}.jpg`} alt="" width="88" height="88" />
                <i aria-hidden="true">{n + 1}</i>
              </span>
              <span className="how-text">
                <b>{s.title}</b>
                <span>{s.text}</span>
              </span>
            </li>
          ))}
        </ol>

        <button type="button" className="btn btn-go btn-big" onClick={onClose}>
          Let's make something
        </button>
      </div>
    </div>
  )
}
