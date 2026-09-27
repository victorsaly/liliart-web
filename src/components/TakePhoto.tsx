import { useRef, useState, type ReactNode } from 'react'
import { Camera } from './Camera'

/**
 * Which camera a "take a photo" button should open.
 *
 * A phone's own camera app takes a better photo than `getUserMedia` does, and
 * `capture="environment"` opens it — but only on a phone. On a laptop, Edge
 * and every other desktop browser ignore the attribute and quietly open a
 * file picker, so the button never turns a camera on. There we open one
 * ourselves.
 */
export function ownCameraIsBetter(): boolean {
  if (typeof window === 'undefined') return false
  if (!navigator.mediaDevices?.getUserMedia) return false
  const touch = window.matchMedia('(pointer: coarse)').matches && !window.matchMedia('(pointer: fine)').matches
  return !touch
}

interface Props {
  onPhoto: (file: File) => void
  /** a camera, or the pictures already on the device */
  source: 'camera' | 'library'
  className?: string
  children: ReactNode
}

/** One button that gets a photo, however this device prefers to give one. */
export function TakePhoto({ onPhoto, source, className, children }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [shooting, setShooting] = useState(false)

  if (shooting) {
    return (
      <Camera
        onClose={() => setShooting(false)}
        onShot={(file) => { setShooting(false); onPhoto(file) }}
      />
    )
  }

  return (
    <>
      <button
        type="button" className={className}
        onClick={() => (source === 'camera' && ownCameraIsBetter()
          ? setShooting(true)
          : input.current?.click())}
      >
        {children}
      </button>
      <input
        ref={input} type="file" accept="image/*" hidden
        {...(source === 'camera' ? { capture: 'environment' as const } : {})}
        onChange={(e) => {
          const file = e.target.files?.[0]
          /* let the same picture be chosen twice in a row */
          e.target.value = ''
          if (file) onPhoto(file)
        }}
      />
    </>
  )
}
