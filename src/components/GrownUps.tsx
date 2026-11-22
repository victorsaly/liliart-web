import { useEffect, useRef, useState } from 'react'
import { picturesLeft } from '../lib/ai'
import { ArrowLeftIcon } from './icons'

const STORIES = 'https://victorsaly.github.io/LilianaBlog/'

/**
 * The page a parent looks for before they hand the tablet over: where the
 * photo goes, who wrote the steps, what stays on the device.
 *
 * It is also the only way out of the app. The link to Lili's stories used to
 * be a third of the tab bar, one sticky thumb from any screen; here it sits
 * behind a sum a seven-year-old is not expected to do in their head.
 */
export function GrownUps({ onClose }: { onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null)
  const [left, setLeft] = useState<number>()
  useEffect(() => { picturesLeft().then(setLeft) }, [])

  useEffect(() => {
    box.current?.focus()
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onClose])

  return (
    <div className="how" ref={box} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="grown-title">
      <div className="how-in grown">
        <button type="button" className="btn btn-small" onClick={onClose} style={{ justifySelf: 'start' }}>
          <ArrowLeftIcon /> Back
        </button>
        <h2 id="grown-title" style={{ margin: 0 }}>For grown-ups</h2>

        <section className="sheet-block">
          <h3>What happens to the photo</h3>
          <p>
            The photo of the table is made smaller on this device, then sent to our server, which
            passes it to an AI service (OpenAI) to list the materials in it. We do not keep the
            photo. Please keep faces and anything private out of the picture.
          </p>
        </section>

        <section className="sheet-block">
          <h3>Who writes the ideas</h3>
          <p>
            The ideas, the steps and the pictures are made by AI, so they can be wrong. It is told
            to suggest only things that are safe at a kitchen table, and to mark any step with
            scissors or anything sharp or hot for a grown-up. Read the steps before you start, and
            stay nearby.
          </p>
        </section>

        <section className="sheet-block">
          <h3>Pictures</h3>
          <p>
            The ideas, the steps and reading aloud are free. Pictures cost us money to make, so
            they come in sessions: one photo of the table, with pictures for its ideas and for
            each step of what you make from it. Every device starts with three free sessions.
            {typeof left === 'number' && (
              <> <b>This device has {left === 0 ? 'none' : left} left.</b></>
            )}
            {' '}Packs of more sessions are coming to the app. Until then, crafts work without
            pictures once the free ones are used.
          </p>
        </section>

        <section className="sheet-block">
          <h3>What stays on this device</h3>
          <p>
            Kept crafts, and photos of what your child made, are stored on this device only. There
            are no accounts, no adverts and no analytics. To stop misuse, our server counts how
            many requests come from each internet address per day, and how many picture sessions
            this device has used, against a random number the app makes up. It is not linked to
            you.
          </p>
        </section>

        <section className="sheet-block">
          <h3>Lili's stories</h3>
          <p>A website of stories, outside this app.</p>
          <Gate />
        </section>
      </div>
    </div>
  )
}

/** A sum to do before leaving the app. Picked once, so a wrong guess does not change it. */
function Gate() {
  const [sum] = useState(() => ({ a: 6 + Math.floor(Math.random() * 4), b: 6 + Math.floor(Math.random() * 4) }))
  const [typed, setTyped] = useState('')
  const [wrong, setWrong] = useState(false)

  return (
    <form
      className="gate"
      onSubmit={(e) => {
        e.preventDefault()
        if (Number(typed) === sum.a * sum.b) {
          setWrong(false)
          window.open(STORIES, '_blank', 'noopener,noreferrer')
        } else {
          setWrong(true)
        }
      }}
    >
      <label htmlFor="gate-answer">To open it, type the answer: {sum.a} × {sum.b}</label>
      <div className="gate-row">
        <input
          id="gate-answer" inputMode="numeric" autoComplete="off" value={typed}
          onChange={(e) => { setTyped(e.target.value.replace(/\D/g, '').slice(0, 3)); setWrong(false) }}
        />
        <button type="submit" className="btn" disabled={!typed}>Open the website</button>
      </div>
      {wrong && <p className="note err" role="alert">That is not it. This part is for a grown-up.</p>}
    </form>
  )
}
