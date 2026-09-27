import { useRef, useState } from 'react'
import { toDataUrl } from '../lib/photo'

interface Props {
  onPhoto: (full: string, small: string) => void
  /** the photo currently being looked at, if any */
  looking?: string
}

/**
 * The table: put something on it. Camera on a phone, file picker anywhere,
 * and a drop target on a desktop — all three land in the same place.
 */
export function PhotoStep({ onPhoto, looking }: Props) {
  const camera = useRef<HTMLInputElement>(null)
  const library = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const [problem, setProblem] = useState<string>()

  async function take(file?: File | null) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setProblem('That is not a picture. Try a photo instead.')
      return
    }
    setProblem(undefined)
    try {
      const { full, small } = await toDataUrl(file)
      onPhoto(full, small)
    } catch {
      setProblem("Couldn't open that picture. Try taking another one.")
    }
  }

  if (looking) {
    return (
      <div>
        <figure className="shot" style={{ margin: 0 }}>
          <img src={looking} alt="The photo you took" />
          <figcaption className="shot-tag">Looking…</figcaption>
        </figure>
        <div className="looking">
          {/* the MAUI app's own line, kept */}
          <p className="looking-text">Lili is preparing your new idea…</p>
          <p className="looking-sub">This takes a few seconds.</p>
          <span className="bar" aria-hidden="true"><i /></span>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`table ${over ? 'is-over' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer.files?.[0]) }}
    >
      {/* TAKE and PICK, side by side and huge, as they are in the MAUI app */}
      <div className="big-pair">
        <button type="button" className="big-btn" onClick={() => camera.current?.click()}>
          <CameraIcon />
          <span>TAKE</span>
        </button>
        <button type="button" className="big-btn is-second" onClick={() => library.current?.click()}>
          <PictureIcon />
          <span>PICK</span>
        </button>
      </div>
      <p className="table-hint">
        Put your bits and bobs on the table and photograph them — boxes, tubes, lids, scraps,
        odd socks. The more it can see, the better the ideas.
      </p>
      {problem && <p className="note err" style={{ marginTop: '.9rem' }}>{problem}</p>}

      <input
        ref={camera} type="file" accept="image/*" capture="environment" hidden
        onChange={(e) => take(e.target.files?.[0])}
      />
      <input
        ref={library} type="file" accept="image/*" hidden
        onChange={(e) => take(e.target.files?.[0])}
      />
    </div>
  )
}

/* Material's photo-camera and image outlines, the two the MAUI app used. */
function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.8l1.2-2h6.9l1.2 2h2.9A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="3.6" />
    </svg>
  )
}

function PictureIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="14" rx="1.8" />
      <circle cx="9" cy="10" r="1.7" />
      <path d="M5 17l4.2-4.4 3 3 2.6-2.4L19 17" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
