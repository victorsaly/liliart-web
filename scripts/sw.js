/*
 * LiliArt, offline.
 *
 * Installed to a home screen this has to open with no network at all, so the
 * whole shell is warmed on install rather than gathered as you browse: put it
 * on the home screen at the kitchen table, walk to the shed, and the crafts
 * you kept are still there.
 *
 * What it deliberately never touches is the API. Every call to the worker is
 * a fresh question about a photograph nobody has taken before; a cached answer
 * would be a wrong answer. Those requests are left alone to succeed or fail on
 * their own, and the app already says something sensible when they fail.
 *
 * SHELL and VERSION below are written by scripts/build-sw.mjs at build time —
 * the asset names carry a content hash, so they cannot be listed by hand.
 */

const VERSION = "__VERSION__";
const SHELL = __SHELL__;

const CORE = `liliart-core-${VERSION}`;
const KEEP = [CORE];

/** The page itself, whatever path the app was opened at. */
const INDEX = "/index.html";

/*
 * Match on the URL alone.
 *
 * A server that answers `Vary: Origin` (vite preview) or `Vary:
 * Accept-Encoding` (GitHub Pages) makes the cache compare headers too, and
 * install stored these with a plain fetch that carries neither. The request
 * for a `crossorigin` module script does carry Origin, which is enough to
 * miss every asset and open the app to a blank page — which is exactly what
 * happened to FeedmeAI, on the same shape of worker and the same host. These
 * files are content-hashed and immutable; there is nothing to vary by.
 */
const MATCH = { ignoreVary: true };

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CORE)
      /* one miss must not fail the whole install, or a single renamed file
         leaves the app with no offline copy at all */
      .then((cache) => Promise.all(SHELL.map((url) => cache.add(url).catch(() => {}))))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => !KEEP.includes(n)).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  /* the API: never cached, never intercepted. The typeface is one of our
     own files now, so it is in the shell with everything else. */
  if (url.origin !== self.location.origin) return;

  /*
   * Navigations: the network first, so a deployed change is picked up on the
   * next launch, falling back to the shell we hold. This is a single-page
   * app, so any path in scope is answered by the one page.
   */
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CORE).then((c) => c.put(INDEX, copy));
          return res;
        })
        .catch(async () => (await caches.match(INDEX, MATCH)) || Response.error())
    );
    return;
  }

  /*
   * Everything else same-origin is the built shell: script and style names
   * carry a content hash and the pictures never change, so what we have is
   * always right. Anything missed is fetched and kept for next time.
   */
  event.respondWith(
    caches.match(request, MATCH).then(
      (hit) =>
        hit ||
        fetch(request)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CORE).then((c) => c.put(request, copy));
            }
            return res;
          })
          .catch(() => hit || Response.error())
    )
  );
});
