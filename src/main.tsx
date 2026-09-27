import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

/*
 * Offline, and installable to a home screen.
 *
 * Registered after load so it never competes with the first paint, and only
 * in a built app — a service worker in front of the dev server serves you
 * yesterday's bundle and is a bad afternoon. A new version takes over on the
 * next launch rather than swapping the page out from under someone mid-craft.
 */
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* blocked, unsupported, or a private window: the app works online */
    })
  })
}
