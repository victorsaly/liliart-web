import { useRef, useState } from 'react'
import { toDataUrl } from '../lib/photo'
import { Camera } from './Camera'
import { CameraIcon, PictureIcon } from './icons'

interface Props {
  onPhoto: (full: string, small: string) => void
  /** the photo currently being looked at, if any */
  looking?: string
}

/**
 * Which camera TAKE should open.
 *
 * A phone's own camera app takes a better photo than `getUserMedia` does, and
 * `capture="environment"` opens it — but only on a phone. On a laptop, Edge and
 * every other desktop browser ignore the attribute and quietly open a file
 * picker, so TAKE never turns a camera on. There we open one ourselves.
 */
function ownCameraIsBetter(): boolean {
  if (typeof window === 'undefined') return false
  if (!navigator.mediaDevices?.getUserMedia) return false
  const touch = window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(pointer: fine)').matches
  return !touch
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
  const [shooting, setShooting] = useState(false)

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

  if (shooting) {
    return (
      <Camera
        onClose={() => setShooting(false)}
        onShot={(file) => { setShooting(false); take(file) }}
      />
    )
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
        <button
          type="button" className="big-btn"
          onClick={() => (ownCameraIsBetter() ? setShooting(true) : camera.current?.click())}
        >
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
