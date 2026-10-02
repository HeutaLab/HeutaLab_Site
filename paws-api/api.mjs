// Paws & Order's API: everything under /paws-and-order/api/. worker.js hands those requests
// here and does nothing else with them. Worker-only: this folder is never served as a file.
//
//   code              is this workshop code open, and at what level?
//   brief, compare    the prompt helper, on the key of the teacher who made the code
//   workshop/create   a teacher makes a code (their AI key is tested, then locked away)
//   workshop/status, workshop/end, workshop/level   the teacher's controls
//
// There are no house codes and no key of Glenn's: every code is made by a teacher on the
// Teachers page and runs on that teacher's own AI key (see vault.mjs for how it is kept).
// What is asked of the AI is in paws-and-order/ai.js, the same file a teacher's own-key
// browser uses, called here with opts.server.
//
// The rules that hold for every route:
//   - The Worker is the gatekeeper. The level comes from the code on every request, never
//     from the page, and the AI service, model and key come from the code's row, never from
//     a brief or compare request.
//   - Every value in a request is treated as hostile: fixed choices are checked against the
//     theme's own lists, free text is length-capped and reaches the AI only as material.
//   - Nothing a learner types is stored or logged. The only things ever written to the log
//     are a route name and a short fail code. No per-request record is kept anywhere.
//   - If it is not fully set up (a rate-limit binding, the vault secret or the table is
//     missing) every route answers "not open" rather than running half-guarded.
//
// One secret, set by Glenn by hand (see README.md): PAWS_VAULT_KEY.

import THEME from "../paws-and-order/theme.js";
import { PROVIDERS, readBrief, readCompare, makeBrief, compare, testConnection } from "../paws-and-order/ai.js";
import {
  CODE_SHAPE, normalise, makeCode, vaultKeys, codeId, sha256Hex, sameHex, makeManageToken, seal, unseal,
  isoOf, dayOf, tableReady, readRow, insertRow, madeSince, charge, endRow, setLevel, sweep,
} from "./vault.mjs";

export const PAWS_API = "/paws-and-order/api/";

const MAX_BODY = 32768;
const MAX_DRAIN = 1048576;        // how much of an oversize body is read and thrown away before hanging up
// All six must be bound (wrangler.jsonc), or nothing runs.
const LIMITERS = ["PAWS_SESSION_LIMIT", "PAWS_IP_LIMIT", "PAWS_CODE_CHECKS", "PAWS_CODE_IP", "PAWS_SETUP_IP", "PAWS_MANAGE_IP"];
// The services a workshop may run on. ai.js also knows "custom" (an address somebody types
// in), which must never be reachable from here.
const SERVICES = ["anthropic", "openai", "google"];
const DAYS = [1, 7, 30];
const CAPS = [300, 600, 1200];
// A Map, not an object literal: obj["constructor"] would find Object.prototype's properties.
const TIER_LEVEL = new Map([["basic", 1], ["medium", 2], ["advanced", 3]]);
// A class is waiting on each answer, so these are shorter than a browser on its own key gets.
const TIMEOUTS = { gate: 20000, brief: 45000, compare: 30000, test: 20000 };
const DEFAULT_SESSION_CAP = 40;   // AI requests per browser per six hours (var PAWS_SESSION_CAP)
const SIX_HOURS = 21600;
const KEY_TESTS_A_DAY = 400;      // live key tests per UTC day, per data centre
const KEY_TESTS_EACH = 20;        // ... and from any one address, so one address cannot use up everybody's
const CODES_A_DAY = 200;          // new codes per UTC day, everywhere

// The page shows its own words for most of these (workshop.js); they are here so a reply
// always says something a person can read.
const SAY = {
  wrong: "That code did not work. Check the spelling with your teacher.",
  expired: "That code has finished. Ask your teacher for today’s code.",
  ended: "Your teacher has closed that code. Ask for a new one.",
  used_up: "Your class has used up the helper for today. Tell your teacher. You can still carry on.",
  device_cap: "This device has asked the helper a lot today. You can still carry on.",
  busy: "Lots of people are asking at once. Wait a minute, then try again.",
  not_open: "Workshop codes are not switched on yet. Tell your teacher.",
  locked: "That level is not open yet. Your teacher opens it.",
  too_long: "That is too much text. Make it shorter, then try again.",
  bad_request: "That request could not be read.",
  bad_type: "Send JSON.",
  wrong_origin: "This only works from the Paws & Order pages.",
  post_only: "POST only.",
  not_found: "Not found.",
};

// ---------- replies and the log ----------

function json(obj, status = 200, headers) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...headers },
  });
}

// brief and compare answer in ai.js's shapes, so their refusals carry type "error" too.
const refuse = (ai, status, reason, message, extra, headers) =>
  json({ ...(ai ? { type: "error" } : null), reason, message: message || SAY[reason] || SAY.busy, ...extra }, status, headers);

// A route name and a short code, and for a thrown error its class name. Never a message,
// never anything from a request or from an AI service.
function log(route, fail, error) {
  const line = { route, fail: /^[a-z0-9_]{1,48}$/.test(fail) ? fail : "other" };
  if (error !== undefined) line.name = error && typeof error.name === "string" && /^[A-Za-z]{1,40}$/.test(error.name) ? error.name : "Error";
  console.error(JSON.stringify(line));
}

// ---------- the front door ----------

// A Map for the same reason as TIER_LEVEL: "constructor" is not a route.
const ROUTES = new Map([
  ["code", { name: "code", run: handleCode }],
  ["brief", { name: "brief", run: handleBrief, ai: true }],
  ["compare", { name: "compare", run: handleCompare, ai: true }],
  ["workshop/create", { name: "workshop/create", run: handleCreate }],
  ["workshop/status", { name: "workshop/status", run: handleStatus }],
  ["workshop/end", { name: "workshop/end", run: handleEnd }],
  ["workshop/level", { name: "workshop/level", run: handleLevel }],
]);

export async function handlePaws(request, env, ctx) {
  let name = "unknown", ai = false;
  try {
    const url = new URL(request.url);
    const route = ROUTES.get(url.pathname.slice(PAWS_API.length));
    if (route) {
      name = route.name;
      ai = route.ai === true;
    }

    // Same-origin JSON POSTs only. No CORS headers are ever sent, so another site's page
    // cannot read an answer, and these checks stop it sending a request that counts.
    if (request.method !== "POST") return refuse(ai, 405, "post_only", null, null, { allow: "POST" });
    if (!route) return refuse(false, 404, "not_found");
    if (!(request.headers.get("content-type") || "").trim().toLowerCase().startsWith("application/json")) return refuse(ai, 415, "bad_type");
    const origin = request.headers.get("origin"), site = request.headers.get("sec-fetch-site");
    if ((origin !== null && origin !== url.origin) || (site !== null && site !== "same-origin")) return refuse(ai, 403, "wrong_origin");

    const ready = await setUp(env);
    if (ready.fail) {
      log(name, ready.fail);
      return refuse(ai, 503, "not_open");
    }

    const read = await readBody(request);
    if (read.tooLong) return refuse(ai, 413, "too_long");
    let body = null;
    try {
      body = JSON.parse(read.text);
    } catch {
      // Falls through to the 400 below.
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) return refuse(ai, 400, "bad_request");

    const ip = request.headers.get("cf-connecting-ip") || "local";
    return await route.run({
      request, env, ctx, url, body, ip, name, db: ready.db, keys: ready.keys, now: Date.now(),
      // The page's random browser id if it sent one that looks right; else the address.
      session: typeof body.session === "string" && /^[A-Za-z0-9-]{16,40}$/.test(body.session) ? body.session : "ip-" + ip,
    });
  } catch (e) {
    log(name, "threw", e);
    return refuse(ai, 500, "busy");
  }
}

// The daily tidy (the cron in wrangler.jsonc), also run each time a new code is made.
// It never throws: a failed sweep is logged and tried again tomorrow.
export async function sweepPaws(env, now = Date.now()) {
  try {
    const db = env && (env.PAWS_DB || env.USAGE);
    if (!db || typeof db.prepare !== "function") return null;
    return await sweep(db, now);
  } catch (e) {
    log("sweep", "threw", e);
    return null;
  }
}

// ---------- is everything in place? ----------

// Databases already seen to hold the table, so the look happens once per Worker start.
const tablesSeen = new WeakSet();

async function setUp(env) {
  if (!LIMITERS.every((name) => env[name] && typeof env[name].limit === "function")) return { fail: "no_binding" };
  let keys = null;
  try {
    keys = await vaultKeys(env.PAWS_VAULT_KEY);
  } catch {
    // Treated as no vault.
  }
  if (!keys) return { fail: "no_vault" };
  const db = env.PAWS_DB || env.USAGE;
  if (!db || typeof db.prepare !== "function") return { fail: "no_table" };
  if (!tablesSeen.has(db)) {
    try {
      await tableReady(db);
    } catch {
      return { fail: "no_table" };
    }
    tablesSeen.add(db);
  }
  return { db, keys };
}

// The whole body, or tooLong. The declared length is checked first; then the bytes are
// counted as they arrive, because a declared length can be missing or a lie.
async function readBody(request) {
  if (Number(request.headers.get("content-length")) > MAX_BODY) return { tooLong: true };
  if (!request.body) return { text: "" };
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    // Too long: nothing more is kept, but the rest is read and thrown away (to a limit) before
    // answering. Hanging up in the middle of a body can break the connection for the request after it.
    if (size > MAX_BODY + MAX_DRAIN) {
      try { await reader.cancel(); } catch {}
      return { tooLong: true };
    }
    if (size <= MAX_BODY) chunks.push(value);
  }
  if (size > MAX_BODY) return { tooLong: true };
  const all = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    all.set(c, at);
    at += c.byteLength;
  }
  return { text: new TextDecoder().decode(all) };
}

// ---------- limits ----------

// The bindings are known to exist (setUp). One that throws is treated as not limited:
// the per-code daily allowance is still the bound on what a key can be made to spend.
async function limited(binding, key) {
  try {
    const { success } = await binding.limit({ key });
    return !success;
  } catch {
    return false;
  }
}

// Counted BEFORE the code is looked at, so once a limit is hit a right code and a wrong one
// get the same answer. Per browser it is tight; per address it is loose, because a whole
// class shares one school address and types the code at the same moment.
const codeChecksUsedUp = async (q) =>
  (await limited(q.env.PAWS_CODE_CHECKS, q.session)) || (await limited(q.env.PAWS_CODE_IP, q.ip));

// Adds one to a running total in the data centre's cache, unless it has already reached cap:
// then it answers true. If the cache is unavailable the count is skipped (answers false).
async function overCount(url, name, cap, maxAge) {
  if (typeof caches === "undefined") return false;
  try {
    const key = new Request(url.origin + PAWS_API + "_cap/" + name);
    const hit = await caches.default.match(key);
    const used = hit ? Number(await hit.text()) || 0 : 0;
    if (used >= cap) return true;
    await caches.default.put(key, new Response(String(used + 1), { headers: { "cache-control": "max-age=" + maxAge } }));
  } catch {
    // Fall through: not counted.
  }
  return false;
}

// What every AI request passes after its code and level are known to be good: a burst
// limit per browser, a six-hour total per browser (a courtesy, since the page invents the
// id), then one unit of the code's daily allowance, taken in one statement. Returns the
// refusal, or null to go ahead. One request is one unit however many AI calls it makes.
async function spend(q, id) {
  if (await limited(q.env.PAWS_SESSION_LIMIT, q.session)) return refuse(true, 429, "busy");
  const cap = Math.floor(Number(q.env.PAWS_SESSION_CAP)) >= 1 ? Math.floor(Number(q.env.PAWS_SESSION_CAP)) : DEFAULT_SESSION_CAP;
  if (await overCount(q.url, await sha256Hex(q.session), cap, SIX_HOURS)) return refuse(true, 429, "device_cap");
  if (!(await charge(q.db, id, q.now))) return refuse(true, 429, "used_up");
  return null;
}

// ---------- codes ----------

const NOT_A_CODE = { ok: false, status: 401, reason: "wrong" };

// What a code opens, or why it does not. withKey also unlocks the teacher's AI key (only
// the two routes that call the AI ask for it).
async function resolve(q, codeText, withKey) {
  const code = normalise(codeText);
  if (!CODE_SHAPE.test(code)) return NOT_A_CODE;   // no database read for something that cannot be a code
  const id = await codeId(q.keys, code);
  const row = await readRow(q.db, id);
  if (!row) return NOT_A_CODE;
  if (row.ended) return { ok: false, status: 410, reason: "ended" };
  if (typeof row.expires !== "string" || row.expires <= isoOf(q.now)) return { ok: false, status: 410, reason: "expired" };
  // The row is re-checked every time it is read: only the three services, a level of 1 to 3.
  const level = Number(row.level);
  if (!SERVICES.includes(row.provider) || !Number.isInteger(level) || level < 1 || level > 3
    || typeof row.model !== "string" || !/^[A-Za-z0-9._:-]{1,80}$/.test(row.model) || !row.ct) {
    log(q.name, "bad_row");
    return NOT_A_CODE;
  }
  if (row.last_day === dayOf(q.now) && Number(row.uses) >= Number(row.cap)) return { ok: false, status: 429, reason: "used_up" };
  const out = {
    ok: true, id, level, until: row.expires,
    platform: THEME.platforms.some((p) => p.id === row.platform) ? row.platform : null,
  };
  if (withKey) {
    const key = await unseal(q.keys, code, row);
    if (!key) {
      log(q.name, "bad_row");
      return NOT_A_CODE;
    }
    out.settings = { provider: row.provider, model: row.model, key };
  }
  return out;
}

// For tests only: an OpenAI-compatible address every AI call goes to instead of the real
// services (paws-and-order/dev/mock-ai-server.mjs). It comes from the Worker's own settings,
// never from a request, and is honoured for this machine alone: set to anything else it is
// ignored, because whatever is there would be sent teachers' keys.
function testBase(q) {
  const raw = q.env.PAWS_TEST_AI_BASE;
  if (typeof raw !== "string" || !raw) return undefined;
  try {
    const u = new URL(raw);
    if ((u.protocol === "http:" || u.protocol === "https:") && (u.hostname === "localhost" || u.hostname === "127.0.0.1")) return raw;
  } catch {
    // Not an address at all.
  }
  log(q.name, "test_base_ignored");
  return undefined;
}

const aiOptions = (q) => ({
  server: true, timeouts: TIMEOUTS, base: testBase(q),
  log: (where, fail) => log(q.name, where + "_" + fail),
});

// ---------- POST code ----------

async function handleCode(q) {
  if (await codeChecksUsedUp(q)) return refuse(false, 429, "busy", "Lots of people are checking codes. Wait a minute, then try again.");
  const r = await resolve(q, q.body.code, false);
  if (!r.ok) return refuse(false, r.status, r.reason);
  return json({ level: r.level, name: THEME.game.find((g) => g.level === r.level).name, platform: r.platform, until: r.until });
}

// ---------- POST brief ----------

async function handleBrief(q) {
  // ai.js's own checks, before anything is counted: a request that cannot be right costs nothing.
  const b = readBrief(q.body);
  if (b.error) return json(b.error, 400);

  if (await limited(q.env.PAWS_IP_LIMIT, q.ip)) return refuse(true, 429, "busy");
  if (await codeChecksUsedUp(q)) return refuse(true, 429, "busy");
  const r = await resolve(q, q.body.code, true);
  if (!r.ok) return refuse(true, r.status, r.reason);
  if (TIER_LEVEL.get(b.tier) > r.level) return refuse(true, 403, "locked", null, { locked: true });
  const stopped = await spend(q, r.id);
  if (stopped) return stopped;

  // makeBrief reads the body through readBrief again, so only the checked fields are used.
  const out = await makeBrief(r.settings, q.body, aiOptions(q));
  return aiReply(out);
}

// ---------- POST compare ----------

async function handleCompare(q) {
  const c = readCompare(q.body);
  if (c.error) return json(c.error, 400);

  if (await limited(q.env.PAWS_IP_LIMIT, q.ip)) return refuse(true, 429, "busy");
  if (await codeChecksUsedUp(q)) return refuse(true, 429, "busy");
  const r = await resolve(q, q.body.code, true);
  if (!r.ok) return refuse(true, r.status, r.reason);
  // A pasted-back prompt is answered here: no AI call, so nothing is spent.
  if (c.copied) return json(c.copied);
  const stopped = await spend(q, r.id);
  if (stopped) return stopped;

  // The reference description is a Storyteller step, so it is dropped below level 3.
  const out = await compare(r.settings, {
    prompt: q.body.prompt, description: q.body.description, reference: r.level >= 3 ? q.body.reference : "", brief: q.body.brief,
  }, aiOptions(q));
  return aiReply(out);
}

// ai.js's result as a reply. A refused key is the teacher's to fix (502); any other error
// from there is about what was sent (the AI declined it), so 400 with words to show.
function aiReply(out) {
  if (out.type !== "error") return json(out);
  if (out.setup === true) return refuse(true, 502, "setup", out.message, { setup: true });
  return json({ type: "error", message: out.message, ...(out.need ? { need: out.need } : null) }, 400);
}

// ---------- POST workshop/create ----------

// Checks what the Teachers page sent. Returns { error } (a sentence for the teacher) or the fields.
function readWorkshop(body) {
  const { provider, model, key, level, days, cap } = body;
  const platform = body.platform == null || body.platform === "" ? null : body.platform;
  if (!SERVICES.includes(provider) || !Object.hasOwn(PROVIDERS, provider)) return { error: "Choose Claude, ChatGPT or Gemini." };
  if (typeof model !== "string" || !PROVIDERS[provider].models.includes(model)) return { error: "Choose a model from the list." };
  if (typeof key !== "string" || !/^[\x21-\x7e]{20,300}$/.test(key)) return { error: "That does not look like an API key. Paste the whole key, with no spaces." };
  if (!Number.isInteger(level) || level < 1 || level > 3) return { error: "Choose the highest level." };
  if (platform !== null && !THEME.platforms.some((p) => p.id === platform)) return { error: "Choose the image tool from the list." };
  if (!DAYS.includes(days)) return { error: "Choose how long the code lasts." };
  if (!CAPS.includes(cap)) return { error: "Choose how many helper requests a day." };
  return { provider, model, key, level, platform, days, cap };
}

async function handleCreate(q) {
  if (await limited(q.env.PAWS_SETUP_IP, q.ip)) return refuse(false, 429, "busy", "Too many codes are being made from here. Wait a minute, then try again.");
  const fullToday = () => refuse(false, 429, "busy", "No more codes can be made today. Try again tomorrow.");
  const w = readWorkshop(q.body);
  if (w.error) return refuse(false, 400, "invalid", w.error);

  // A live test spends a little of somebody's key, so there are only so many a day: from any
  // one address first, so junk from one place cannot use up the share of every other teacher.
  const today = dayOf(q.now);
  if (await overCount(q.url, "tests-" + today + "-" + (await sha256Hex(q.ip)), KEY_TESTS_EACH, 90000)) {
    return refuse(false, 429, "busy", "No more codes can be made from here today. Try again tomorrow.");
  }
  if (await overCount(q.url, "tests-" + today, KEY_TESTS_A_DAY, 90000)) return fullToday();
  if ((await madeSince(q.db, today + "T00:00:00.000Z")) >= CODES_A_DAY) return fullToday();

  // The key and model must really work before a class is sent to them. A reply that was cut
  // short, or empty, still shows the service accepted both.
  const test = await testConnection({ provider: w.provider, model: w.model, key: w.key }, { ...aiOptions(q), maxTokens: 64 });
  if (!test.ok && test.fail !== "max_tokens" && test.fail !== "empty") {
    log(q.name, "test_" + test.fail);
    return refuse(false, 400, "key_test", test.message);
  }

  const manage = makeManageToken();
  const until = isoOf(q.now + w.days * 24 * 60 * 60 * 1000);
  const row = { level: w.level, platform: w.platform, provider: w.provider, model: w.model,
    manage: await sha256Hex(manage), created: isoOf(q.now), expires: until, cap: w.cap };
  // A code that is already taken is drawn again (with over 2^34 of them, it almost never is).
  for (let tries = 0; tries < 3; tries++) {
    const code = makeCode();
    const id = await codeId(q.keys, code);
    const sealed = await seal(q.keys, code, id, w.provider, w.key);
    if (await insertRow(q.db, { ...row, ...sealed, id })) {
      // Old workshops are tidied whenever a new one is made, as well as by the daily cron.
      if (q.ctx && typeof q.ctx.waitUntil === "function") q.ctx.waitUntil(sweepPaws(q.env, q.now));
      return json({ code, manage, level: w.level, platform: w.platform, until, cap: w.cap });
    }
  }
  log(q.name, "no_free_code");
  return refuse(false, 500, "busy");
}

// ---------- POST workshop/status, workshop/end, workshop/level ----------

// The row a teacher may manage, or the refusal. An unknown code and a wrong token get the
// same answer after the same work, so neither can be used to find out whether a code exists.
async function managed(q) {
  if (await limited(q.env.PAWS_MANAGE_IP, q.ip)) return { no: refuse(false, 429, "busy") };
  const wrong = () => ({ no: refuse(false, 401, "wrong", "That code and manage key do not match a workshop.") });
  const code = normalise(q.body.code), token = q.body.manage;
  if (!CODE_SHAPE.test(code) || typeof token !== "string" || !/^[0-9a-f]{32}$/.test(token)) return wrong();
  const id = await codeId(q.keys, code);
  const row = await readRow(q.db, id);
  const kept = row && typeof row.manage === "string" && row.manage.length === 64 ? row.manage : "0".repeat(64);
  const same = sameHex(await sha256Hex(token), kept);
  if (!row || !same) return wrong();
  return { row, id };
}

async function handleStatus(q) {
  const m = await managed(q);
  if (m.no) return m.no;
  const { row } = m;
  return json({
    level: row.level, platform: row.platform, until: row.expires, ended: row.ended || null,
    uses: row.last_day === dayOf(q.now) ? row.uses : 0, cap: row.cap, provider: row.provider, model: row.model,
  });
}

async function handleEnd(q) {
  const m = await managed(q);
  if (m.no) return m.no;
  await endRow(q.db, m.id, q.now);
  return json({ ended: true });
}

async function handleLevel(q) {
  const m = await managed(q);
  if (m.no) return m.no;
  const level = q.body.level;
  if (!Number.isInteger(level) || level < 1 || level > 3) return refuse(false, 400, "invalid", "Choose the highest level.");
  if (m.row.ended) return refuse(false, 410, "ended", "That workshop has been ended.");
  if (!(await setLevel(q.db, m.id, level, q.now))) return refuse(false, 410, "expired", "That workshop has finished.");
  return json({ level });
}
