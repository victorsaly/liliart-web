/**
 * liliart-api
 *
 * The OpenAI key lives here and only here. The browser never sees it, which is
 * the whole reason this worker exists — a key compiled into a public bundle is
 * a key anyone can spend. The words and the pictures both come from OpenAI.
 *
 *   POST /v1/ai/materials  a photo  -> what craft materials are in it
 *   POST /v1/ai/ideas      materials -> a few things a child could make
 *   POST /v1/ai/craft      one idea  -> tools, steps, how long it takes
 *   POST /v1/ai/picture    a craft   -> a picture of it, or of one step
 *
 * Every call is metered per day, per signed-out address, so a passer-by who
 * finds the endpoint cannot run up the bill.
 */

const json = (data, init = {}) =>
  new Response(JSON.stringify(data), {
    status: init.status ?? 200,
    headers: { "content-type": "application/json; charset=utf-8", ...(init.headers ?? {}) },
  });

const origins = (env) => (env.ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);

const CORS = (origin, allowed) => ({
  "access-control-allow-origin": allowed.includes(origin) ? origin : allowed[0] ?? "",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-max-age": "86400",
  vary: "origin",
});

const now = () => Math.floor(Date.now() / 1000);
const OPENAI = "https://api.openai.com/v1";
/* Reads photos and writes. Tried against gpt-4o-mini on the same photos: it
   counted better, answered in half the time and cost about half as much. It
   can reason before answering, which these short asks do not need. */
const MODEL = "gpt-6-luna";
/* The picture model. About 1.7 cents a picture at this size and quality,
   which is why a picture counts for so much against the daily cap below. */
const IMAGE_MODEL = "gpt-image-2.6-flare";
/*
 * The daily ceiling, in units rather than calls: it is here so a leaked
 * endpoint cannot drain the key overnight, not to ration a family. One
 * household shares one address, so a parent and a child both making things
 * count against the same number — hence the room.
 *
 * A picture costs nearly a hundred times what a text call does, so it is
 * weighed accordingly. A whole craft — photo, ideas, the steps, four idea
 * pictures and six step pictures — is about forty-three units, so the cap is
 * five or so crafts a day and about a dollar of pictures per address.
 */
const DAILY = 240;
const COST = {
  "/v1/ai/materials": 1,
  "/v1/ai/ideas": 1,
  "/v1/ai/craft": 1,
  "/v1/ai/picture": 4,
};

const str = (v, max = 400) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const strs = (v, max = 40) => (Array.isArray(v) ? v.map((x) => str(x, 120)).filter(Boolean).slice(0, max) : []);

/**
 * Materials arrive as {name, amount} now. How much of a thing there is changes
 * what can be made from it — one tube is a rocket, six are a marble run — so
 * the amount goes to the model rather than being dropped on the way.
 */
const materialList = (v, max = 40) => {
  if (!Array.isArray(v)) return [];
  return v
    .map((m) => (typeof m === "string"
      ? { name: str(m, 120), amount: "" }
      : { name: str(m?.name, 120), amount: str(m?.amount, 60) }))
    .filter((m) => m.name)
    .slice(0, max);
};
const describe = (items) =>
  items.map((m) => (m.amount ? `${m.name} (${m.amount})` : m.name)).join(", ");

/**
 * The house rules for every answer. The audience is a child making something
 * at a kitchen table with a grown-up nearby, so the model is told what it may
 * not suggest as firmly as what it should.
 */
const SAFETY =
  "You are helping a child of about seven make something at home with a parent. " +
  "Only ever suggest crafts that are safe at a kitchen table: no oven, no hob, no naked flame, " +
  "no bleach or solvents, no power tools, nothing that needs a craft knife without saying an adult cuts. " +
  "Where a step needs scissors, a hot glue gun or anything sharp or hot, say plainly that a grown-up does that part. " +
  "Never suggest anything that involves eating what is made unless it is plainly food. " +
  "Use short, plain sentences a seven-year-old can read. No brand names. " +
  "Use British English words: yoghurt pot, lolly stick, clothes peg, sticky tape.";

/**
 * Things that are never craft materials, whatever the model thinks it saw.
 *
 * The prompt asks for these to be left out and the model mostly obliges, but
 * in testing a box of matches on a kitchen counter came back as "matchbox"
 * twice running. A child's safety should not rest on a model following an
 * instruction, so anything matching this is dropped before it reaches the app.
 */
const NEVER = /match|lighter|candle|kni(fe|ves)|blade|razor|scissor|cutter|needle|\bpins?\b|glass|batter(y|ies)|bleach|cleaner|detergent|medicine|pill|tablet|syringe|chopping board|\bmug\b|\bkeys?\b|phone|wallet|purse|\bcoins?\b|money|charger|cable/i;

let usageReady = false;
async function spend(request, env, cost = 1) {
  if (!usageReady) {
    await env.DB.prepare(
      "CREATE TABLE IF NOT EXISTS usage (key TEXT PRIMARY KEY, count INTEGER NOT NULL, updated_at INTEGER NOT NULL)",
    ).run();
    usageReady = true;
  }
  const who = request.headers.get("cf-connecting-ip") ?? "unknown";
  const key = `${who}:${new Date().toISOString().slice(0, 10)}`;
  const row = await env.DB.prepare(
    "INSERT INTO usage (key, count, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET count = count + excluded.count, updated_at = excluded.updated_at RETURNING count",
  ).bind(key, cost, now()).first();
  return row?.count ?? cost;
}

/** Why OpenAI said no, for the log: the worker hides it from the browser, and
 *  without this a spent balance and a busy model look the same from outside. */
async function refusal(response) {
  const body = await response.json().catch(() => null);
  return body?.error?.code ?? body?.error?.type ?? `http ${response.status}`;
}

/**
 * Ask the model for one JSON object. `user` is a string, or the parts of a
 * message when there is a photo to go with the words.
 */
async function chatJSON(env, system, user, maxTokens) {
  const response = await fetch(`${OPENAI}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      response_format: { type: "json_object" },
      reasoning_effort: "none",
      max_completion_tokens: maxTokens,
      messages: [{ role: "system", content: `${SAFETY} ${system}` }, { role: "user", content: user }],
    }),
  }).catch(() => null);

  if (!response) return { error: json({ error: "could not reach the AI" }, { status: 502 }) };
  if (!response.ok) {
    const why = await refusal(response);
    console.error("liliart-api text", response.status, why);
    if (response.status === 401) return { error: json({ error: "the AI key was refused" }, { status: 503 }) };
    if (why === "credit_balance_exhausted" || why === "insufficient_quota") {
      return { error: json({ error: "the AI is having a rest — try again later" }, { status: 503 }) };
    }
    if (response.status === 429) return { error: json({ error: "the AI is busy — try again in a moment" }, { status: 429 }) };
    return { error: json({ error: "the AI could not answer" }, { status: 502 }) };
  }

  const data = await response.json().catch(() => null);
  const content = data?.choices?.[0]?.message?.content;
  if (!content) return { error: json({ error: "the AI sent nothing back" }, { status: 502 }) };
  try {
    return { data: JSON.parse(content) };
  } catch {
    return { error: json({ error: "the AI sent something unreadable" }, { status: 502 }) };
  }
}

async function route(request, env, url) {
  const { pathname } = url;

  if (request.method === "GET" && pathname === "/v1/ai") {
    return json({ ready: Boolean(env.OPENAI_API_KEY) });
  }
  if (request.method !== "POST") return json({ error: "not found" }, { status: 404 });
  if (!env.OPENAI_API_KEY) return json({ error: "the AI is not set up yet" }, { status: 503 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return json({ error: "bad request" }, { status: 400 });

  if (await spend(request, env, COST[pathname] ?? 1) > DAILY) {
    return json(
      { error: "that's today's limit for this home — it starts again at midnight" },
      { status: 429 },
    );
  }

  /* ---------- 1. what is in the photo ---------- */
  if (pathname === "/v1/ai/materials") {
    const image = typeof body.image === "string" ? body.image : "";
    if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image)) {
      return json({ error: "a photo is required" }, { status: 400 });
    }
    const { data, error } = await chatJSON(
      env,
      "You list the things in a photo that could be used to make something.",
      [
        {
          type: "text",
          text:
            "What is in this photo that we could make something out of? Be specific — " +
            '"cardboard tube", "blue bottle top", "brown paper bag" — and skip anything ' +
            "that is not really usable. Leave out anything sharp, hot or that makes fire " +
            "(knives, scissors, matches, lighters), anything holding medicine or cleaning liquid, " +
            "and things someone is plainly using (a mug of tea, keys, a phone). " +
            "Count them: give a number when you can see one " +
            '("3", "6"), and only fall back to words when you truly cannot ("a handful", ' +
            '"half a roll", "a whole bag"). How many there are decides what can be built, ' +
            "so it is worth being careful. Lowercase names. " +
            'Reply with JSON: {"materials":[{"name":"...","amount":"a few"}]}',
        },
        { type: "image_url", image_url: { url: image, detail: "low" } },
      ],
      500,
    );
    if (error) {
      /* a photo it could not read is the likeliest reason, and the kindest to say */
      return error.status === 502 ? json({ error: "could not read the photo" }, { status: 502 }) : error;
    }
    const found = Array.isArray(data.materials) ? data.materials : [];
    return json({
      materials: found
        .filter((m) => m && typeof m.name === "string" && m.name.trim() && !NEVER.test(m.name))
        .slice(0, 20),
    });
  }

  /* ---------- 2. a few things we could make ---------- */
  if (pathname === "/v1/ai/ideas") {
    const materials = materialList(body.materials);
    if (!materials.length) return json({ error: "materials are required" }, { status: 400 });
    const { data, error } = await chatJSON(
      env,
      "You suggest craft ideas built from what someone already has.",
      "We have: " + describe(materials) + ". " +
        "The words in brackets are roughly how much of each thing there is, and they matter: " +
        "one cardboard tube is a rocket, six are a marble run. Do not plan a craft that needs more " +
        "of something than we have, and if a craft wants more, put that in \"alsoNeed\". " +
        "Suggest 4 different things we could make, using mostly these and at most one or two extras " +
        "that most homes already have (tape, glue, string, paper, felt tips). " +
        "Vary them: something quick, something that takes an afternoon, something that moves or plays, " +
        "something to give away. " +
        '"uses" must repeat our item names exactly. ' +
        'Reply with JSON: {"ideas":[{"title":"...","blurb":"one sentence on what it is and why it is fun",' +
        '"minutes":30,"uses":["..."],"alsoNeed":["..."],"mess":"low|medium|high"}]}',
      900,
    );
    if (error) return error;
    /* "uses" is meant to repeat our names exactly, but it sometimes comes back
       with the amount still attached — "cardboard tube (3)" — so take that off */
    const ideas = (Array.isArray(data.ideas) ? data.ideas : []).slice(0, 6).map((idea) => ({
      ...idea,
      uses: strs(idea?.uses, 20).map((name) => name.replace(/\s*\([^)]*\)\s*$/, "")),
    }));
    return json({ ideas });
  }

  /* ---------- 3. one idea, written out to make ---------- */
  if (pathname === "/v1/ai/craft") {
    const title = str(body.title, 120);
    if (!title) return json({ error: "a title is required" }, { status: 400 });
    const blurb = str(body.blurb, 300);
    const materials = materialList(body.materials);
    const { data, error } = await chatJSON(
      env,
      "You write the instructions for one craft, for a child to follow with a grown-up.",
      `We are making: ${title}. ${blurb}\nWe have: ${describe(materials) || "what is in the photo"}.\n` +
        "The brackets say roughly how much of each thing there is; keep the steps within that.\n" +
        "Write it out so a seven-year-old can follow it. Each step is one action, in one or two short " +
        "sentences, and says what it should look like when that step is done. " +
        /* without this, four steps in seven came back as "ask a grown-up to
           cut": safe, and nothing left for the child to do */
        "This is the child's craft, so plan it for the child to do: tear, fold, roll, scrunch, stick and " +
        "draw rather than cut. If something really must be cut, put all the cutting into one step near " +
        "the start for a grown-up, so the rest is the child's. " +
        "Mark any step a grown-up should do with \"grownUp\": true; that should be one step, two at most. " +
        'Reply with JSON: {"summary":"two sentences on what we are making",' +
        '"minutes":30,"mess":"low|medium|high",' +
        '"tools":[{"tool":"...","note":"what it is for"}],' +
        '"steps":[{"title":"short name for the step","description":"...","grownUp":false}],' +
        '"tips":["one thing that makes it turn out better"],' +
        '"picture":"a short description of the finished thing, for drawing it"}',
      1400,
    );
    if (error) return error;
    return json({
      summary: str(data.summary, 400),
      minutes: Number(data.minutes) || 30,
      mess: ["low", "medium", "high"].includes(data.mess) ? data.mess : "medium",
      tools: Array.isArray(data.tools) ? data.tools.slice(0, 15) : [],
      steps: Array.isArray(data.steps) ? data.steps.slice(0, 20) : [],
      tips: strs(data.tips, 5),
      picture: str(data.picture, 300),
    });
  }

  /* ---------- 4. a picture of the finished thing ----------
   * The MAUI app drew one of these for every idea. Here it is drawn once, for
   * the craft actually opened, because each one is a real charge on the key. */
  if (pathname === "/v1/ai/picture") {
    const what = str(body.what, 300);
    if (!what) return json({ error: "nothing to draw" }, { status: 400 });
    const made = describe(materialList(body.materials, 12));

    /*
     * Two kinds of picture. "finished" is the thing you are aiming at, shown
     * alone. "step" is one action being done — hands mid-job, the craft half
     * built — because what a child needs while following step four is to see
     * what step four looks like, not what the end looks like.
     */
    const isStep = body.kind === "step";
    const of = str(body.of, 120);
    const prompt = isStep
      ? `A photograph of one step of making ${of || "a child's craft"} at a kitchen table: ${what}. ` +
        (made ? `It is being made from ${made}. ` : "") +
        /* A step marked for a grown-up is drawn with a grown-up doing it. The
           picture is what a parent glances at, and a child's hand on a blade
           says the opposite of the label beside it. */
        (body.grownUp === true
          ? "Show a pair of adult's hands doing this one action, close up, on a plain pale table in soft " +
            "daylight. If anything is being cut, it is with ordinary round-ended scissors, never a knife or blade. "
          : "Show a pair of child's hands doing this one action, close up, on a plain pale table in soft " +
            "daylight. The hands hold only the craft itself: paper, card, tape, string. There are no " +
            /* left to itself the model reaches for scissors in any craft
               picture, including for a step that is only "choose a tube" */
            "scissors, knives or blades anywhere in the picture, and nothing is being cut. ") +
        "The craft is part-built and handmade — wonky, visible tape and glue — because this " +
        "is the middle of making it, not the end. Hands only, never a face. " +
        "No text, no words, no letters, no numbers, no labels, no watermark."
      : `A child's craft made at a kitchen table: ${what}. ` +
        (made ? `Made from ${made}. ` : "") +
        "Show only the finished object, sitting on a plain pale surface, photographed from " +
        "slightly above in soft daylight. It should look handmade by a seven-year-old — " +
        "a bit wonky, visible tape and glue, cut edges not quite straight — not a polished " +
        "studio product. No people, no hands, no text, no labels, no watermark.";

    /*
     * 4:3 and low quality: the least this model will draw, and the shape a
     * step picture is shown in anyway. "complexity" is how much it plans
     * before it draws, and one hand doing one thing needs very little.
     */
    const response = await fetch(`${OPENAI}/images/generations`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        prompt,
        n: 1,
        size: "1024x768",
        quality: "low",
        complexity: "low",
        output_format: "jpeg",
      }),
    }).catch(() => null);

    if (!response) return json({ error: "could not draw it" }, { status: 502 });
    if (!response.ok) {
      const why = await refusal(response);
      console.error("liliart-api picture", response.status, why);
      /* 429 is what the app shows as a note, so both of these are 429s: there
         will be no pictures for a while, and the child should be told so */
      if (why === "credit_balance_exhausted" || why === "insufficient_quota") {
        return json({ error: "no pictures just now — they will be back later" }, { status: 429 });
      }
      if (response.status === 429) return json({ error: "the drawing is busy — try again in a moment" }, { status: 429 });
      return json({ error: "could not draw it" }, { status: 502 });
    }
    const data = await response.json().catch(() => null);
    const drawn = data?.data?.[0]?.b64_json;
    if (!drawn) return json({ error: "could not draw it" }, { status: 502 });
    /* it answers in base64 — hand it over as a data URL so the browser has
       nothing else to fetch */
    return json({ image: `data:image/jpeg;base64,${drawn}` });
  }

  return json({ error: "not found" }, { status: 404 });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("origin") ?? "";
    const cors = CORS(origin, origins(env));
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    try {
      const response = await route(request, env, url);
      for (const [k, v] of Object.entries(cors)) response.headers.set(k, v);
      return response;
    } catch (error) {
      console.error("liliart-api", error?.stack ?? error);
      return json({ error: "something went wrong" }, { status: 500, headers: cors });
    }
  },
};
