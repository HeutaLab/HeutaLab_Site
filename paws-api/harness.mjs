// What the tests in this folder stand the Worker on: a database, rate limiters, a cache,
// an AI service and a console, all pretend, so handlePaws runs in node exactly as written.
// Not a test file itself (node --test paws-api/*.test.mjs picks up only *.test.mjs).
//
// The database is real SQLite (node's built-in node:sqlite, in memory) behind the few D1
// calls vault.mjs makes (prepare, bind, run, first, all), with the table made from
// workshops.sql. So the SQL strings in vault.mjs are run for real, not modelled. What is
// only modelled is D1's own wrapping: the shape of run()'s result (meta.changes), first()
// answering null for no row, and the error D1 raises when the table is missing.

import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { handlePaws } from "./api.mjs";

export function fakeD1({ table = true } = {}) {
  const sqlite = new DatabaseSync(":memory:");
  if (table) sqlite.exec(readFileSync(new URL("./workshops.sql", import.meta.url), "utf8"));
  const ran = [];   // every statement, in order, for the tests that count them
  const statement = (sql, params) => ({
    bind: (...values) => statement(sql, values),
    async run() {
      ran.push(sql);
      const out = sqlite.prepare(sql).run(...params);
      return { success: true, results: [], meta: { changes: Number(out.changes) } };
    },
    async first(column) {
      ran.push(sql);
      const row = sqlite.prepare(sql).get(...params);
      if (!row) return null;
      return column ? row[column] : { ...row };
    },
    async all() {
      ran.push(sql);
      return { success: true, results: sqlite.prepare(sql).all(...params).map((r) => ({ ...r })), meta: {} };
    },
  });
  return { prepare: (sql) => statement(sql, []), ran, sqlite };
}

// A rate limiter that allows `limit` hits per key and remembers the keys it was asked about.
export function limiter(limit = Infinity) {
  const seen = new Map(), keys = [];
  return {
    keys,
    async limit({ key }) {
      keys.push(key);
      const n = (seen.get(key) || 0) + 1;
      seen.set(key, n);
      return { success: n <= limit };
    },
  };
}

export const VAULT_KEY = Buffer.alloc(32, 7).toString("base64");
// Shaped like a real key, and easy to search every reply and log line for.
export const TEACHER_KEY = "sk-test-SECRETKEY-0123456789abcdefABCDEF";

export function makeEnv(over = {}) {
  return {
    PAWS_VAULT_KEY: VAULT_KEY, USAGE: fakeD1(),
    PAWS_SESSION_LIMIT: limiter(), PAWS_IP_LIMIT: limiter(), PAWS_CODE_CHECKS: limiter(),
    PAWS_CODE_IP: limiter(), PAWS_SETUP_IP: limiter(), PAWS_MANAGE_IP: limiter(),
    ...over,
  };
}

// The data centre's cache (caches.default), which node does not have.
export function fakeCaches() {
  const store = new Map();
  globalThis.caches = { default: {
    async match(req) { const v = store.get(req.url); return v == null ? undefined : new Response(v); },
    async put(req, res) { store.set(req.url, await res.text()); },
  } };
  return store;
}
export const noCaches = () => { delete globalThis.caches; };

// ---------- the pretend AI service ----------

// Every call the Worker makes to an AI service lands here. ai.sent holds what was sent:
// { url, headers, system, user, body }. Tests change ai.status, ai.raw, ai.throws or
// ai.reply to play a service that is down, refusing the key, or saying something odd.
export const ai = { sent: [], status: 200, raw: null, throws: null, reply: null };
export function resetAI() {
  Object.assign(ai, { sent: [], status: 200, raw: null, throws: null, reply: null });
}

const GOOD_BRIEF = {
  anchor: "A friendly round character with thick wobbly outlines in a sunny cartoon town.",
  prompts: ["Picture one: the character waves hello outside the station.", "Picture two: the character runs along the street.", "Picture three: the character sits on the steps."],
  why_this_works: "It names who, where and the drawing style.", platform_notes: "On ChatGPT, paste each prompt on its own.",
  watch_for: "Check the outlines stay thick.", friendly_note: "",
};
function defaultReply(system) {
  if (/connection test/i.test(system)) return "ready";
  if (/Look-Closely Coach/.test(system)) return JSON.stringify({ covered: { see: true, details: true, world: true }, questions: ["a?", "b?"] });
  if (/Prompt Helper/.test(system)) return JSON.stringify(GOOD_BRIEF);
  if (/compare the prompt/i.test(system)) return JSON.stringify({ asked_and_missing: ["a red hat"], appeared_unasked: ["a small dog"], drift_words: ["fluffy"], questions: ["Did the hat get lost?"], looks_copied: false });
  return "{}";
}

globalThis.fetch = async (url, init) => {
  const body = JSON.parse(init.body);
  let system, user, wrap;
  if (String(url).includes("anthropic.com")) {
    system = body.system; user = body.messages[0].content;
    wrap = (text) => ({ content: [{ type: "text", text }], stop_reason: "end_turn" });
  } else if (String(url).includes("googleapis.com")) {
    system = body.systemInstruction.parts[0].text; user = body.contents[0].parts[0].text;
    wrap = (text) => ({ candidates: [{ content: { parts: [{ text }] }, finishReason: "STOP" }] });
  } else {
    system = body.messages[0].content; user = body.messages[1].content;
    wrap = (text) => ({ choices: [{ message: { role: "assistant", content: text }, finish_reason: "stop" }] });
  }
  ai.sent.push({ url: String(url), headers: init.headers, system, user, body, redirect: init.redirect });
  if (ai.throws) throw ai.throws;
  if (ai.raw !== null) return new Response(ai.raw, { status: ai.status });
  if (ai.status !== 200) return new Response(JSON.stringify({ error: { type: "some_error" } }), { status: ai.status });
  return new Response(JSON.stringify(wrap(ai.reply ? ai.reply(system, user) : defaultReply(system))));
};

// ---------- the console ----------

// Everything the Worker writes to the log, as text, so a test can search it. Kept quiet.
export const logged = [];
for (const level of ["log", "info", "warn", "error", "debug"]) {
  console[level] = (...args) => { logged.push(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ")); };
}

// ---------- the clock ----------

const realNow = Date.now;
export const setNow = (iso) => { Date.now = () => Date.parse(iso); };
export const realTime = () => { Date.now = realNow; };

// ---------- requests ----------

export const waiting = [];   // what the Worker handed to ctx.waitUntil
export const ctx = { waitUntil(p) { waiting.push(p); } };
export const settle = () => Promise.all(waiting.splice(0));

// Everything the Worker has answered, as text, for the "the key is never in a reply" tests.
export const replies = [];

// POSTs a JSON body to a route and reads the answer. opts: method, headers (merged over the
// defaults), raw (send this exact body instead), ip.
export async function call(env, route, body, opts = {}) {
  const headers = { "content-type": "application/json", "cf-connecting-ip": opts.ip || "203.0.113.9", ...opts.headers };
  for (const k of Object.keys(headers)) if (headers[k] == null) delete headers[k];
  const init = { method: opts.method || "POST", headers };
  if (init.method !== "GET" && init.method !== "HEAD") {
    init.body = opts.raw !== undefined ? opts.raw : JSON.stringify(body);
    if (typeof init.body !== "string") init.duplex = "half";
  }
  const res = await handlePaws(new Request("https://paws.test/paws-and-order/api/" + route, init), env, ctx);
  const text = await res.text();
  replies.push(text);
  let data = null;
  try { data = JSON.parse(text); } catch {}
  return { status: res.status, data, text, res };
}

export const SESSION = "harness-session-0001";
export const ATTEMPT = "A round penguin in a blue cap with a red bag, holding up a letter, sunny street, thick outlines.";

// A valid workshop, as the Teachers page would make it. Returns what the API answered.
export async function makeWorkshop(env, over = {}) {
  const r = await call(env, "workshop/create", { provider: "anthropic", key: TEACHER_KEY, model: "claude-haiku-4-5-20251001", level: 3, platform: null, days: 7, cap: 300, ...over });
  if (r.status !== 200) throw new Error("makeWorkshop: " + r.status + " " + r.text);
  return r.data;
}

export const briefBody = (code, over = {}) => ({
  code, session: SESSION, platform: "gemini", tier: "basic", subject: "character", palette: "pop",
  cast: [{ id: "hero" }], attempt: ATTEMPT, idea: "Nettle finds a clue under a bench", round: 2, ...over,
});

export const compareBody = (code, over = {}) => ({
  code, session: SESSION,
  prompt: "A young hedgehog detective under a bench, thick outlines, flat bright colours.",
  description: "A cartoon hedgehog in a blue jacket crouches beside a green park bench holding a magnifying glass in bright daylight.",
  ...over,
});
