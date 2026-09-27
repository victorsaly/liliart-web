import { useEffect, useRef, useState } from 'react'
import { CameraIcon, CloseIcon } from './icons'

interface Props {
  onShot: (file: File) => void
  onClose: () => void
}

/**
 * A camera inside the app.
 *
 * `capture="environment"` on a file input is only a hint, and only phones take
 * it: on Windows in Edge — and on any desktop browser — it opens a file picker
 * and the camera never comes on. So when the browser can hand us a camera we
 * open one ourselves, and the file input stays as the fallback for when it
 * cannot, or when the person says no.
 */
export function Camera({ onShot, onClose }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const [problem, setProblem] = useState<string>()
  const [live, setLive] = useState(false)

  useEffect(() => {
    let dropped = false
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1600 } }, audio: false })
      .then((s) => {
        if (dropped) { s.getTracks().forEach((t) => t.stop()); return }
        stream.current = s
        if (video.current) {
          video.current.srcObject = s
          video.current.play().catch(() => {})
        }
        setLive(true)
      })
      .catch((err: DOMException) => {
        if (dropped) return
        setProblem(
          err?.name === 'NotAllowedError'
            ? 'The camera was not allowed. You can choose a picture instead.'
            : 'No camera here. You can choose a picture instead.',
        )
      })
    return () => {
      dropped = true
      stream.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  function shoot() {
    const v = video.current
    if (!v || !v.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = v.videoWidth
    canvas.height = v.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(v, 0, 0)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        stream.current?.getTracks().forEach((t) => t.stop())
        onShot(new File([blob], 'table.jpg', { type: 'image/jpeg' }))
      },
      'image/jpeg',
      0.9,
    )
  }

  return (
    <div className="cam">
      <div className="cam-top">
        <button type="button" className="btn btn-small" onClick={onClose}>
          <CloseIcon /> Close
        </button>
        <span className="cam-hint">Point it at your table</span>
      </div>

      <div className="cam-stage">
        {problem
          ? <p className="note err">{problem}</p>
          : <video ref={video} playsInline muted autoPlay />}
      </div>

      <div className="cam-foot">
        {problem
          ? <button type="button" className="btn btn-go btn-big" onClick={onClose}>Go back</button>
          : (
            <button
              type="button" className="cam-shoot" onClick={shoot} disabled={!live}
              aria-label="Take the photo"
            >
              <CameraIcon />
            </button>
          )}
      </div>
    </div>
  )
}
