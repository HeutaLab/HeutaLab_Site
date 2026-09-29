// heutalab.com Worker: serves the static site, and handles the API routes
// for The Precinct (AIFE workshop prompt-briefing tool).
//
// Secrets (set with `npx wrangler secret put <NAME>`, run by hand, never
// pasted into chat or a script):
//   ANTHROPIC_API_KEY  - a Claude API key from console.anthropic.com
//   WORKSHOP_CODE      - the original passcode. It still works, and unlocks
//                        every level (the facilitator's master code).
//   LEVEL_CODES        - optional: the codes announced from the stage, as
//                        JSON, e.g. {"RAIN-LAMP-47": 1, "BADGE-SMOKE-82": 2,
//                        "CITY-HALL-19": 3}. A code unlocks its level and all
//                        lower ones. Make codes long (two words and a
//                        number): the guessing limits have to stay loose
//                        enough for a whole room on one venue IP, so a long
//                        code is what stops guessing.
// SESSION_CAP (AI requests per browser per six hours) is a plain var in the
// "vars" block of wrangler.jsonc: change it there, not in the dashboard, since
// each deploy resets vars to what wrangler.jsonc says.
//
// The API is the gatekeeper: the level is checked from the code on every
// request, never taken from the page. No attendee text is stored or logged;
// only counts and error codes.

import THEME from "./the-precinct/theme.js";
import {
  TIER_LEVEL, TIMEOUT_MS, sharedDeskOpen, readBrief, gateRequest, gateOutcome, briefRequest,
  readCompare, compareStepA, compareRequest, cleanCompare, stockBrief,
} from "./the-precinct/desk.js";

const API = "/the-precinct/api/";
const MODEL = "claude-opus-5";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const DEFAULT_SESSION_CAP = 30;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith(API)) {
      const route = url.pathname.slice(API.length);
      const handler = ROUTES.get(route);
      if (!handler) return json({ error: "Not found" }, 404);
      if (request.method !== "POST") return json({ error: "POST only" }, 405);
      // From 7 November 2026 the shared desk is closed: attendees use their own
      // AI key from the page, and Glenn's key is not used even if still set.
      if (!sharedDeskOpen()) {
        return json({ error: "The shared desk closed on 7 November 2026. Add your own AI key on the API key page (heutalab.com/the-precinct/key/) to keep going.", personal: true }, 410);
      }
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Bad request body" }, 400);
      }
      if (!body || typeof body !== "object") return json({ error: "Bad request body" }, 400);
      return handler(body, request, env, url);
    }

    // Everything else: serve the static site as before.
    return env.ASSETS.fetch(request);
  },
};

// A Map, not an object literal: a lookup like obj["constructor"] would find
// Object.prototype's properties and treat them as a match.
const ROUTES = new Map([["brief", handleBrief], ["compare", handleCompare], ["code", handleCode]]);

// Own keys only, for the plain-object tables (TIER_LEVEL, THEME.palettes).
const has = (obj, key) => typeof key === "string" && Object.hasOwn(obj, key);

// ---------- codes, levels and limits ----------

let levelCodesCache = { raw: null, map: new Map() };
function levelCodes(env) {
  const raw = env.LEVEL_CODES || "";
  if (raw !== levelCodesCache.raw) {
    const map = new Map();
    try {
      const parsed = raw ? JSON.parse(raw) : {};
      for (const [k, v] of Object.entries(parsed)) {
        const n = Math.round(Number(v));
        if (k.trim() && n >= 1) map.set(k.trim().toLowerCase(), Math.min(n, 3));
      }
    } catch {
      console.error("LEVEL_CODES is not valid JSON");
    }
    levelCodesCache = { raw, map };
  }
  return levelCodesCache.map;
}

// 0 means no access. Codes are matched without regard to case or spaces around them.
function levelFor(code, env) {
  if (typeof code !== "string" || !code.trim()) return 0;
  const c = code.trim().toLowerCase();
  if (env.WORKSHOP_CODE && c === env.WORKSHOP_CODE.trim().toLowerCase()) return 3;
  return levelCodes(env).get(c) || 0;
}

const ipOf = (request) => request.headers.get("cf-connecting-ip") || "local";

// Rate limits use Workers rate-limiting bindings (wrangler.jsonc). If a binding
// is missing (an old config), that limit is skipped rather than failing.
async function limited(binding, key) {
  if (!binding) return false;
  try {
    const { success } = await binding.limit({ key });
    return !success;
  } catch {
    return false;
  }
}

const sessionOf = (body, request) =>
  typeof body.session === "string" && /^[A-Za-z0-9-]{8,64}$/.test(body.session) ? body.session : "ip-" + ipOf(request);

// The level a code unlocks, or an error response.
function checkCode(body, env) {
  if (!env.WORKSHOP_CODE && !env.LEVEL_CODES) return { error: json({ error: "The desk isn\u2019t set up yet (no workshop code). Tell your facilitator." }, 500) };
  const level = levelFor(body.code, env);
  if (!Number.isInteger(level) || level < 1 || level > 3) return { error: json({ error: "Wrong workshop code." }, 401) };
  return { level };
}

// Code checks are counted BEFORE the code is looked at, so once a limit is hit
// a right code and a wrong one get the same answer. Per browser the limit is
// tight; per IP it is loose, because a whole room may share one venue IP and
// type a new code at the same moment. Long codes do the rest.
async function guardCodeCheck(body, request, env) {
  if (await limited(env.PRECINCT_CODE_CHECKS, sessionOf(body, request)) || await limited(env.PRECINCT_CODE_IP, ipOf(request))) {
    return json({ error: "Too many code checks. Wait a minute, then try again." }, 429);
  }
  return null;
}

// Brief and compare requests: a flood guard per IP, then the same code-check
// limits as /api/code, counted before the code is looked at (so once they're
// used up a right code and a wrong one get the same 429 here too), then the
// code and its level. An attendee sends far fewer than 12 requests a minute.
async function admit(body, request, env) {
  if (await limited(env.PRECINCT_IP_LIMIT, ipOf(request))) {
    return { error: json({ error: "The desk is swamped right now. Give it a minute and try again." }, 429) };
  }
  const over = await guardCodeCheck(body, request, env);
  if (over) return { error: over };
  return checkCode(body, env);
}

// Charged only when a request is about to call the AI, so a locked tier or a
// pasted-back prompt costs nobody their share.
async function charge(body, request, env, url) {
  const session = sessionOf(body, request);
  if (await limited(env.PRECINCT_SESSION_LIMIT, session)) {
    return json({ error: "Easy, detective. That\u2019s a lot of requests in a minute. Look at what you have, then try again shortly." }, 429);
  }
  if (await overCap(env, url, session)) {
    return json({ error: "You\u2019ve used this browser\u2019s share of the desk for this session. Work with what you have, or ask your facilitator." }, 429);
  }
  return null;
}

// A per-person running total, kept in the data centre's cache for six hours.
// It is a courtesy cap, not a lock: the session id comes from the page.
async function overCap(env, url, session) {
  const cap = Number(env.SESSION_CAP) || DEFAULT_SESSION_CAP;
  if (typeof caches === "undefined") return false;
  try {
    const hash = await sha256(session);
    const key = new Request(url.origin + API + "_cap/" + hash);
    const hit = await caches.default.match(key);
    const used = hit ? Number(await hit.text()) || 0 : 0;
    if (used >= cap) return true;
    await caches.default.put(key, new Response(String(used + 1), { headers: { "cache-control": "max-age=21600" } }));
  } catch {
    // If the cache is unavailable the cap is skipped; the rate limits still apply.
  }
  return false;
}

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------- the AI call ----------

// One Messages API call with structured output. Returns { data } or { fail }
// where fail is a short code (timeout, http_529, refusal, ...). Never logs text.
async function callClaude(env, { system, user, schema, effort, maxTokens, timeoutMs }) {
  if (!env.ANTHROPIC_API_KEY) return { fail: "no_key" };
  let res;
  try {
    res = await fetch(env.ANTHROPIC_API_URL || ANTHROPIC_URL, {
      method: "POST",
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        // Lets a request the model declines be re-run on a fallback model
        // server-side, instead of coming back as a refusal.
        "anthropic-beta": "server-side-fallback-2026-07-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        output_config: { effort, format: { type: "json_schema", schema } },
        fallbacks: "default",
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
  } catch (e) {
    return { fail: e && (e.name === "TimeoutError" || e.name === "AbortError") ? "timeout" : "network_" + ((e && e.name) || "Error") };
  }
  if (!res.ok) {
    let type = "";
    try { type = (await res.json())?.error?.type || ""; } catch {}
    return { fail: "http_" + res.status + (type ? "_" + type : "") };
  }
  let data;
  try {
    data = await res.json();
  } catch {
    return { fail: "bad_body" };
  }
  if (data.stop_reason === "refusal") return { fail: "refusal" };
  if (data.stop_reason === "max_tokens") return { fail: "max_tokens" };
  // With thinking on, content[0] can be a thinking block; the answer is the text block.
  const text = (data.content || []).find((b) => b.type === "text")?.text || "";
  try {
    return { data: JSON.parse(text) };
  } catch {
    return { fail: "unparseable" };
  }
}

function logFail(route, fail) {
  console.error(JSON.stringify({ route, fail }));
}

// Setup faults that must be fixed before a session (no key, a refused key, a
// model that doesn't exist) are shown as errors: a stock answer would hide
// them. Everything else, including the API turning requests down mid-workshop
// (credit or spend limit used up), still gets the stock answer so the room
// keeps working; needsFacilitator() adds a note so someone notices.
const isHardSetup = (fail) => fail === "no_key" || /^http_(401|403|404)/.test(fail);
const needsFacilitator = (fail) => /^http_4/.test(fail) && !/^http_(408|409|429)/.test(fail);

function setupError(fail) {
  console.error(JSON.stringify({ setup: fail }));
  if (fail === "no_key") return json({ error: "The desk isn\u2019t set up yet (no AI key). Tell your facilitator." }, 500);
  if (/^http_(401|403)/.test(fail)) return json({ error: "The desk\u2019s AI key was refused. Tell your facilitator." }, 502);
  return json({ error: "The AI service turned the request down. Tell your facilitator." }, 502);
}

// ---------- POST /the-precinct/api/code ----------

async function handleCode(body, request, env) {
  const limitedResponse = await guardCodeCheck(body, request, env);
  if (limitedResponse) return limitedResponse;
  const { level, error } = checkCode(body, env);
  if (error) return error;
  return json({ level, name: THEME.game.find((g) => g.level === level).name });
}

// ---------- POST /the-precinct/api/brief ----------

async function handleBrief(body, request, env, url) {
  const b = readBrief(body);
  if (b.error) return json(b, 400);

  const admitted = await admit(body, request, env);
  if (admitted.error) return admitted.error;
  if (TIER_LEVEL[b.tier] > admitted.level) {
    const g = THEME.game.find((x) => x.tier === b.tier);
    return json({ error: g.name + " is still locked. Your facilitator will give out the next code when the room is ready.", level: admitted.level }, 403);
  }
  const charged = await charge(body, request, env, url);
  if (charged) return charged;

  const started = Date.now();

  // Round 1: the gate reads the description first. It runs before the brief,
  // not alongside it, so a description that gets questions costs no brief.
  // A worked example from References skips it: it's a demo, not their looking.
  if (b.round === 1 && !b.example) {
    const gate = await callClaude(env, gateRequest(b));
    if (gate.fail) {
      // The gate is a nudge: if it can't answer, the brief goes through (and
      // a setup problem shows up there as an error).
      logFail("gate", gate.fail);
    } else {
      const asks = gateOutcome(gate.data);
      if (asks) return json({ gate: true, questions: asks.questions, attempt: b.attempt });
    }
  }

  // The gate and the brief share one budget, so a slow API costs the attendee
  // TIMEOUT_MS.brief at most before the stock brief, not both added up.
  const brief = await callClaude(env, briefRequest(b, Math.max(5000, TIMEOUT_MS.brief - (Date.now() - started))));
  if (brief.fail) {
    logFail("brief", brief.fail);
    if (brief.fail === "refusal") return json({ error: "The AI declined that one. Try rewording your idea." }, 422);
    if (isHardSetup(brief.fail)) return setupError(brief.fail);
    return json({ ...stockBrief(b.subject, b.tier, b.palette, b.castUsed), fallback: true, setup: needsFacilitator(brief.fail), attempt: b.attempt });
  }
  return json({ ...brief.data, attempt: b.attempt });
}

// ---------- POST /the-precinct/api/compare ----------

async function handleCompare(body, request, env, url) {
  // Checked once with level 3 so an oversized reference box is still refused
  // before the code is looked at; the real level is applied after admit().
  const pre = readCompare(body, 3);
  if (pre.error) return json(pre, 400);

  const admitted = await admit(body, request, env);
  if (admitted.error) return admitted.error;
  const c = readCompare(body, admitted.level);

  const a = compareStepA(c);
  if (a.copied) return json(a);

  const charged = await charge(body, request, env, url);
  if (charged) return charged;

  const out = await callClaude(env, compareRequest(c, a));
  if (out.fail) {
    logFail("compare", out.fail);
    if (out.fail === "refusal") return json({ error: "The AI declined that one. Try pasting the description again, or check it by eye with the six steps above." }, 422);
    if (isHardSetup(out.fail)) return setupError(out.fail);
    return json({ fallback: true, setup: needsFacilitator(out.fail), checklist: THEME.compareChecklist });
  }
  return json(cleanCompare(out.data));
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
