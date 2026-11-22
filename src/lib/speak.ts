import { useCallback, useEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { TextToSpeech } from '@capacitor-community/text-to-speech'

/**
 * Reading a step out loud, with the voice the device already has.
 *
 * For a child who reads slowly and has glue on both hands, being read to is
 * the difference between following the step and waiting for a grown-up.
 * Nothing is sent anywhere and it works with the wifi off.
 *
 * There are two ways to the device's voice. A browser, and the iOS app, have
 * speech built into the page. Android's web view does not, so inside the
 * Android app the same request goes through a native plugin instead. Where
 * there is neither, `can` is false and the button is not shown.
 */
const inPage = typeof window !== 'undefined' && 'speechSynthesis' in window
const viaPlugin = !inPage && Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('TextToSpeech')

/* the app is written in British English; a device set to another English keeps its own */
const voice = (): string => (navigator.language?.startsWith('en') ? navigator.language : 'en-GB')

export function useSpeak(): { can: boolean; speaking: boolean; say: (text: string) => void; hush: () => void } {
  const can = inPage || viaPlugin
  const [speaking, setSpeaking] = useState(false)
  /* which reading is current: an older one finishing, or being cut short,
     must not switch the button off under a newer one */
  const turn = useRef(0)

  const quiet = useCallback(() => {
    if (inPage) window.speechSynthesis.cancel()
    else if (viaPlugin) void TextToSpeech.stop().catch(() => {})
  }, [])

  const hush = useCallback(() => {
    if (!can) return
    turn.current++
    quiet()
    setSpeaking(false)
  }, [can, quiet])

  const say = useCallback((text: string) => {
    if (!can) return
    const mine = ++turn.current
    const over = () => { if (turn.current === mine) setSpeaking(false) }
    quiet()
    setSpeaking(true)

    if (inPage) {
      const words = new SpeechSynthesisUtterance(text)
      words.lang = voice()
      words.rate = 0.9
      words.onend = over
      words.onerror = over
      window.speechSynthesis.speak(words)
    } else {
      /* resolves when it has finished speaking, and rejects if it could not start */
      TextToSpeech.speak({ text, lang: voice(), rate: 0.9 }).then(over, over)
    }
  }, [can, quiet])

  /* never carry on talking after the screen that asked for it has gone */
  useEffect(() => () => { if (can) quiet() }, [can, quiet])

  return { can, speaking, say, hush }
}
