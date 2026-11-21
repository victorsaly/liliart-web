import { useCallback, useEffect, useState } from 'react'

/**
 * Reading a step out loud, with the voice the device already has.
 *
 * For a child who reads slowly and has glue on both hands, being read to is
 * the difference between following the step and waiting for a grown-up. It
 * uses the browser's own speech, so nothing is sent anywhere and it works
 * with the wifi off. Where there is no such voice, `can` is false and the
 * button is not shown.
 */
export function useSpeak(): { can: boolean; speaking: boolean; say: (text: string) => void; hush: () => void } {
  const can = typeof window !== 'undefined' && 'speechSynthesis' in window
  const [speaking, setSpeaking] = useState(false)

  const hush = useCallback(() => {
    if (!can) return
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [can])

  const say = useCallback((text: string) => {
    if (!can) return
    window.speechSynthesis.cancel()
    const words = new SpeechSynthesisUtterance(text)
    /* the app is written in British English; a device set to another English keeps its own */
    words.lang = navigator.language?.startsWith('en') ? navigator.language : 'en-GB'
    words.rate = 0.9
    words.onend = () => setSpeaking(false)
    words.onerror = () => setSpeaking(false)
    setSpeaking(true)
    window.speechSynthesis.speak(words)
  }, [can])

  /* never carry on talking after the screen that asked for it has gone */
  useEffect(() => () => { if (can) window.speechSynthesis.cancel() }, [can])

  return { can, speaking, say, hush }
}
