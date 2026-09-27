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
const FONTS = `liliart-fonts-${VERSION}`;
const KEEP = [CORE, FONTS];

/** The page itself, whatever path the app was opened at. */
const INDEX = "/index.html";

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

/** Google's font CSS and the font files it names. */
const isFont = (url) =>
  url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  /* the API: never cached, never intercepted */
  if (url.origin !== self.location.origin && !isFont(url)) return;

  /*
   * Fonts: serve what we have and refresh behind it. The app has a real
   * system-font fallback, so a cold start with no network looks slightly
   * different rather than broken.
   */
  if (isFont(url)) {
    event.respondWith(
      caches.open(FONTS).then(async (cache) => {
        const hit = await cache.match(request);
        const live = fetch(request)
          .then((res) => {
            if (res.ok || res.type === "opaque") cache.put(request, res.clone());
            return res;
          })
          .catch(() => hit);
        return hit || live;
      })
    );
    return;
  }

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
        .catch(async () => (await caches.match(INDEX)) || Response.error())
    );
    return;
  }

  /*
   * Everything else same-origin is the built shell: script and style names
   * carry a content hash and the pictures never change, so what we have is
   * always right. Anything missed is fetched and kept for next time.
   */
  event.respondWith(
    caches.match(request).then(
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
