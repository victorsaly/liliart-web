# LiliArt

Photograph the odds and ends you already have — boxes, tubes, lids, odd socks —
and LiliArt works out what a child could make from them, then writes it out one
step at a time.

**[liliart.victorsaly.com](https://liliart.victorsaly.com)**

The web version of the [LiliArt](https://github.com/victorsaly/liliart) .NET MAUI
app, rebuilt so it opens in a tap with nothing to install.

## What it does

One photo of the table → the things it can see, as stickers you can correct →
a few different things you could make with them → one of those written out in
full → a Make mode that shows a single step at a time.

Anything you like can be kept. Kept crafts live in the browser, so they open
with the wifi off, and nothing about a child's making ever leaves the device.

## Written for a seven-year-old

The model is told the audience before it is told the task, and it is told what
it may *not* suggest as firmly as what it should: nothing needing an oven, a
hob, a naked flame, bleach, solvents or power tools. Any step involving
scissors, a glue gun, or anything hot or sharp comes back flagged, and the app
puts **a grown-up does this bit** on it.

That rule lives in one place — `SAFETY` in `worker/src/index.js` — so it shapes
every answer the app can produce.

## How it is put together

```
src/
  App.tsx              the one page: table → ideas → craft → make
  components/
    PhotoStep.tsx      camera, file picker and drop target
    Materials.tsx      what it saw, as stickers you can peel off
    Ideas.tsx          a few things you could make
    CraftSheet.tsx     one idea written out: tools, steps, tips
    MakeScreen.tsx     one step, full screen, screen kept awake
    Kept.tsx           saved crafts
  lib/
    ai.ts              the three calls, and what to say when they fail
    photo.ts           768px JPEG before anything is uploaded
    saved.ts           local storage, with a cached snapshot for React
  styles/make.css      the whole look
worker/                the Cloudflare Worker that holds the OpenAI key
```

**The key is never in the browser.** The front end talks only to `liliart-api`,
a small Cloudflare Worker that holds the OpenAI key and meters use per day per
address, so finding the endpoint does not mean spending the bill. This is the
one thing worth copying from this repo: a key compiled into a public bundle is
a key anybody can read.

## Running it

```bash
npm install
npm run dev
```

It talks to the deployed worker by default. To point it elsewhere, set
`VITE_LILIART_API` in `.env`.

For the worker:

```bash
cd worker
npx wrangler secret put OPENAI_API_KEY
npx wrangler deploy
```

## Design

**Making Table** — the interface is the table you make things on. Warm paper
ground over a faint cutting-mat grid, cards that look cut out and laid down (a
thick ink edge and a hard offset shadow), and poster colours a seven-year-old
would pick from a pot. Fredoka for anything read at a glance, the system face
for anything read properly.

## Built with

React 19 · TypeScript · Vite · Cloudflare Workers · D1 · OpenAI gpt-4o-mini
