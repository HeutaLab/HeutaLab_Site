// Run with: node --test dev/*.test.mjs   (from paws-and-order/)
// workshop.js with no browser: localStorage, the page and the site's API are stand-ins.
// journey.js and gang.js are the real ones.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

// ---------- stand-ins, in place before workshop.js is loaded ----------

const stored = new Map();
const storage = {
  getItem: (k) => (stored.has(k) ? stored.get(k) : null),
  setItem: (k, v) => { stored.set(k, String(v)); },
  removeItem: (k) => { stored.delete(k); },
};
Object.defineProperty(globalThis, "localStorage", { configurable: true, get: () => storage });

// The least of a page that the code box needs: elements with attributes, children, text,
// listeners and focus. `html()` writes a box out the way the contract's section 6.3 shows it.
class El {
  constructor(tag) { this.tag = tag; this.attrs = new Map(); this.kids = []; this.words = ""; this.on = {}; this.value = ""; }
  setAttribute(k, v) { this.attrs.set(k, String(v)); }
  getAttribute(k) { return this.attrs.has(k) ? this.attrs.get(k) : null; }
  removeAttribute(k) { this.attrs.delete(k); }
  hasAttribute(k) { return this.attrs.has(k); }
  get className() { return this.getAttribute("class") || ""; }
  set className(v) { this.setAttribute("class", v); }
  get hidden() { return this.attrs.has("hidden"); }
  set hidden(v) { if (v) this.attrs.set("hidden", ""); else this.attrs.delete("hidden"); }
  get textContent() { return this.words + this.kids.map((k) => k.textContent).join(""); }
  set textContent(v) { this.words = String(v); this.kids = []; }
  appendChild(k) { this.kids.push(k); return k; }
  addEventListener(type, fn) { (this.on[type] ||= []).push(fn); }
  fire(type, event = {}) { for (const fn of this.on[type] || []) fn({ preventDefault() {}, ...event }); }
  focus() { document.activeElement = this; }
  html() {
    const attrs = [...this.attrs].map(([k, v]) => (v === "" ? " " + k : ` ${k}="${v}"`)).join("");
    if (this.tag === "input") return `<input${attrs}>`;
    return `<${this.tag}${attrs}>` + this.words + this.kids.map((k) => "\n" + k.html()).join("") + (this.kids.length ? "\n" : "") + `</${this.tag}>`;
  }
}
const windowListeners = {};
globalThis.document = { createElement: (tag) => new El(tag), activeElement: null };
globalThis.window = { addEventListener: (type, fn) => { (windowListeners[type] ||= []).push(fn); }, localStorage: storage, sessionStorage: storage };

// The site's API. `api.answer(route, body)` returns [status, object] (or a string for a
// reply that is not JSON, or throws for no reply at all).
const api = { calls: [], answer: null };
globalThis.fetch = async (url, init) => {
  const u = String(url);
  if (!u.includes("/paws-and-order/api/")) {            // a teacher's own key: straight to the AI service
    api.calls.push({ route: "AI:" + new URL(u).host, body: JSON.parse(init.body), headers: init.headers });
    const text = JSON.stringify({ anchor: "", prompts: ["An own-key prompt."], why_this_works: "w", platform_notes: "p", watch_for: "f", friendly_note: "" });
    return new Response(JSON.stringify({ content: [{ type: "text", text }], stop_reason: "end_turn" }));
  }
  const route = u.split("/paws-and-order/api/")[1];
  const body = JSON.parse(init.body);
  api.calls.push({ route, body, headers: init.headers, method: init.method });
  const out = await api.answer(route, body);
  if (typeof out === "string") return new Response(out, { status: 404, headers: { "content-type": "text/html" } });
  return new Response(JSON.stringify(out[1]), { status: out[0], headers: { "content-type": "application/json" } });
};

const { default: W, access, makeBrief } = await import("../workshop.js");
const Named = await import("../workshop.js");
const { default: J } = await import("../journey.js");
const AI = await import("../ai.js");
const { default: THEME } = await import("../theme.js");

const soon = () => new Date(Date.now() + 7 * 86400000).toISOString();
const OPEN = (level = 2, platform = null) => [200, { level, name: ["Doodler", "Sketcher", "Storyteller"][level - 1], platform, until: soon() }];
const ATTEMPT = "A round penguin in a blue cap with a red bag, holding up a letter, sunny street, thick outlines.";
const input = (over = {}) => ({ platform: "gemini", tier: "basic", subject: "character", palette: "pop", cast: [{ id: "hero" }], attempt: ATTEMPT, idea: "Nettle finds a clue under a bench", round: 1, ...over });
const GOOD = { type: "brief", fallback: false, attempt: ATTEMPT, brief: { anchor: "", prompts: ["A hedgehog detective under a bench."], why_this_works: "w", platform_notes: "p", watch_for: "f", friendly_note: "" } };
const CMP = { prompt: "A young hedgehog detective under a bench, thick outlines.", description: "A cartoon hedgehog in a blue jacket crouches beside a green park bench in daylight." };
const tick = () => new Promise((r) => setTimeout(r, 0));
const saveCode = (over = {}) => stored.set("paws_workshop_v1", JSON.stringify({ code: "maple otter kite 47", level: 2, name: "Sketcher", platform: null, until: soon(), checkedAt: new Date().toISOString(), ...over }));

beforeEach(async () => {
  await tick();
  stored.clear();
  api.calls = [];
  api.answer = () => { throw new TypeError("Failed to fetch"); };
  document.activeElement = null;
});

// ---------- the shape of the module ----------

test("one default object, and every member by name", () => {
  const members = ["access", "maxLevel", "enterCode", "recheck", "forget", "makeBrief", "compare", "starterBrief", "mountCodeBox", "onChange", "teacher"];
  for (const m of members) {
    assert.ok(m in W, m);
    assert.equal(Named[m], W[m], m);
  }
  for (const t of ["create", "status", "end", "setLevel"]) assert.equal(typeof W.teacher[t], "function");
  assert.equal(access, W.access);
  assert.equal(makeBrief, W.makeBrief);
});

// ---------- access ----------

test("no code and no key: nothing is on, and nothing is locked yet", () => {
  assert.deepEqual(W.access(), { mode: "none", level: 0, name: "", platform: null, until: null });
  assert.equal(W.maxLevel(), 3);
});

test("a saved code is the access, until it runs out or goes 12 hours unchecked", async () => {
  const until = soon();
  saveCode({ until, platform: "chatgpt" });
  assert.deepEqual(W.access(), { mode: "code", level: 2, name: "Sketcher", platform: "chatgpt", until });
  assert.equal(W.maxLevel(), 2);

  const heard = [];
  const stop = W.onChange((a, info) => heard.push([a.mode, info.why]));
  saveCode({ until: new Date(Date.now() - 1000).toISOString() });
  assert.equal(W.access().mode, "none");
  assert.equal(stored.has("paws_workshop_v1"), false, "dropped where it was found");
  saveCode({ checkedAt: new Date(Date.now() - 12 * 3600000 - 1000).toISOString() });
  assert.equal(W.access().mode, "none");
  saveCode({ checkedAt: new Date(Date.now() - 11 * 3600000).toISOString() });
  assert.equal(W.access().mode, "code");
  await tick();
  // Told once for each code that ran out, after the read that found it had returned.
  assert.deepEqual(heard.map(([, why]) => why), ["expired", "expired"]);
  stop();

  // Anything in storage that is not a saved code counts as none.
  for (const junk of ["", "null", "not json", "[]", '{"code":""}', '{"code":"a-b-c-12","level":9,"until":"2099-01-01","checkedAt":"2099-01-01"}', '{"code":7,"level":1}', '{"code":"a","level":1,"until":"never","checkedAt":"x"}']) {
    stored.set("paws_workshop_v1", junk);
    assert.equal(W.access().mode, "none", junk);
  }
  // A platform the theme does not know is no platform.
  saveCode({ platform: "constructor" });
  assert.equal(W.access().platform, null);
});

test("a teacher's own key on this device is the access when there is no code", () => {
  stored.set("police_pound_ai_v1", JSON.stringify({ provider: "anthropic", model: "", base: "", remember: true, maxLevel: 2, key: "sk-own-key-0123456789" }));
  assert.deepEqual(W.access(), { mode: "own", level: 2, name: "Sketcher", platform: null, until: null });
  assert.equal(W.maxLevel(), 2);
  saveCode({ level: 1, name: "Doodler" });
  assert.equal(W.access().mode, "code", "a code comes first");
  assert.equal(W.maxLevel(), 1);
});

// ---------- entering a code ----------

test("a code is saved only when the server accepts it", async () => {
  api.answer = () => OPEN(2, "copilot");
  const out = await W.enterCode("  Maple   Otter Kite 47 ");
  assert.deepEqual({ ok: out.ok, level: out.level, name: out.name, platform: out.platform }, { ok: true, level: 2, name: "Sketcher", platform: "copilot" });
  assert.equal(api.calls.length, 1);
  const { route, body, headers, method } = api.calls[0];
  assert.deepEqual([route, method, headers["content-type"]], ["code", "POST", "application/json"]);
  assert.equal(body.code, "Maple Otter Kite 47");
  assert.match(body.session, /^[A-Za-z0-9-]{16,40}$/);
  assert.equal(stored.get("paws_session"), body.session);
  const kept = JSON.parse(stored.get("paws_workshop_v1"));
  assert.deepEqual(Object.keys(kept).sort(), ["checkedAt", "code", "level", "name", "platform", "until"]);
  assert.equal(W.access().mode, "code");
  // The image tool the class uses is set on the learner's brief.
  assert.equal(J.get().pick.platform, "copilot");

  // The same browser id is used again; a reset removes it and a new one is made.
  await W.enterCode("maple otter kite 47");
  assert.equal(api.calls[1].body.session, body.session);
  stored.delete("paws_session");
  await W.enterCode("maple otter kite 47");
  assert.notEqual(api.calls[2].body.session, body.session);
});

test("every way a code can fail has its own words, and none of them saves anything", async () => {
  const cases = [
    [[401, { reason: "wrong", message: "x" }], "wrong", "That code did not work. Check the spelling with your teacher."],
    [[410, { reason: "expired", message: "x" }], "expired", "That code has finished. Ask your teacher for today’s code."],
    [[410, { reason: "ended", message: "x" }], "ended", "Your teacher has closed that code. Ask for a new one."],
    [[429, { reason: "used_up", message: "x" }], "used_up", "That code has been used as much as it can be today. Tell your teacher."],
    [[429, { reason: "busy", message: "x" }], "busy", "Lots of people are checking codes. Wait a minute, then try again."],
    [[503, { reason: "not_open", message: "x" }], "not_open", "Workshop codes are not switched on yet. Tell your teacher."],
    [[500, { reason: "busy", message: "x" }], "offline", "Could not reach Paws & Order. Check the internet, then try again."],
    [[403, { reason: "wrong_origin", message: "x" }], "offline"],
    ["<!doctype html><title>404</title>", "offline"],                 // the local preview server has no API
    [[200, { level: 9, until: soon() }], "offline"], [[200, { level: 1, until: "yesterday" }], "offline"], [[200, { level: 1, until: "2020-01-01T00:00:00Z" }], "offline"],
    [[503, {}], "offline"],
  ];
  for (const [answer, reason, message] of cases) {
    api.answer = () => answer;
    const out = await W.enterCode("maple otter kite 47");
    assert.deepEqual([out.ok, out.reason], [false, reason], JSON.stringify(answer));
    if (message) assert.equal(out.message, message);
    assert.ok(out.message.length > 20);
    assert.equal(stored.has("paws_workshop_v1"), false);
  }
  api.answer = () => { throw new TypeError("Failed to fetch"); };
  assert.equal((await W.enterCode("maple otter kite 47")).reason, "offline");
  // Nothing typed, or not text at all: no request is made.
  const before = api.calls.length;
  for (const nothing of ["", "   ", null, undefined, 7, {}]) assert.equal((await W.enterCode(nothing)).reason, "wrong");
  assert.equal(api.calls.length, before);
});

test("a code above the learner's plan lowers the plan, keeps their work, and says so", async () => {
  J.save({ pick: { subject: "character", tier: "advanced", cast: ["hero", "buddy"], idea: "a chase", attempt: ATTEMPT, palette: "sea" }, done: { 1: "2026-10-02T09:00:00.000Z", 2: "2026-10-02T09:10:00.000Z" } });
  const heard = [];
  const stop = W.onChange((a, info) => heard.push({ level: a.level, why: info.why, lowered: info.lowered }));
  api.answer = () => OPEN(1);
  const out = await W.enterCode("maple otter kite 47");
  assert.deepEqual(out.lowered, { from: "advanced", to: "basic", fromName: "Storyteller", toName: "Doodler" });
  const j = J.get();
  assert.deepEqual([j.pick.tier, j.pick.cast, j.pick.idea, j.pick.palette, j.pick.attempt], ["basic", ["hero"], "a chase", "sea", ATTEMPT]);
  assert.ok(j.done[2], "stage 2 stays done");
  assert.deepEqual(heard, [{ level: 1, why: "accepted", lowered: out.lowered }]);

  // A level that already fits is left alone, and so is a learner who has not picked one.
  J.save({ pick: { tier: "basic", cast: ["hero"] } });
  assert.equal((await W.enterCode("maple otter kite 47")).lowered, undefined);
  J.save({ pick: { tier: null } });
  assert.equal((await W.enterCode("maple otter kite 47")).lowered, undefined);
  assert.equal(J.get().pick.tier, null);
  stop();
});

test("forget drops the code; recheck takes up a changed level and drops a closed code", async () => {
  saveCode({ level: 3, name: "Storyteller" });
  J.save({ pick: { tier: "advanced", cast: ["hero", "buddy"] } });
  const heard = [];
  const stop = W.onChange((a, info) => heard.push(a.mode + ":" + info.why));
  api.answer = () => OPEN(2);
  const again = await W.recheck();
  assert.deepEqual([again.ok, again.level, again.lowered.to], [true, 2, "medium"]);
  assert.equal(W.maxLevel(), 2);
  assert.equal(api.calls[0].body.code, "maple otter kite 47");

  // The server cannot be reached: the saved code stays as it was.
  api.answer = () => [429, { reason: "busy" }];
  assert.equal((await W.recheck()).reason, "busy");
  api.answer = () => "<html>";
  assert.equal((await W.recheck()).reason, "offline");
  assert.equal(W.access().mode, "code");

  // The teacher ended it.
  api.answer = () => [410, { reason: "ended" }];
  assert.equal((await W.recheck()).reason, "ended");
  assert.equal(W.access().mode, "none");
  assert.equal((await W.recheck()).ok, false, "nothing saved, nothing to ask about");

  saveCode();
  W.forget();
  assert.equal(stored.has("paws_workshop_v1"), false);
  W.forget();
  assert.deepEqual(heard, ["code:checked", "none:dropped", "none:forgotten"]);
  stop();

  // A re-check that comes back after the learner chose "Use a different code" does not bring the old one back.
  saveCode();
  let release;
  api.answer = () => new Promise((r) => { release = () => r(OPEN(2)); });
  const slow = W.recheck();
  await tick();
  W.forget();
  release();
  assert.equal((await slow).ok, false);
  assert.equal(W.access().mode, "none");
});

// ---------- the prompt helper ----------

test("with no code the helper still checks the words first, then asks for a code and offers a starter", async () => {
  assert.equal((await W.makeBrief(input({ attempt: "too short" }))).need, "attempt");
  assert.equal((await W.makeBrief(input({ idea: "a hedgehog with a gun" }))).message, AI.FRIENDLY_NUDGE);
  assert.equal((await W.makeBrief(input({ tier: "expert" }))).message, "Pick a level first.");
  assert.deepEqual(await W.makeBrief(input()), { type: "error", message: "The prompt helper needs a workshop code. Ask your teacher for it.", need: "code", canStarter: true });
  assert.equal((await W.compare({ prompt: "x", description: "y" })).message, "Paste the prompt you used first.");
  assert.equal((await W.compare({ ...CMP, description: CMP.prompt })).type, "copied");
  assert.deepEqual(await W.compare(CMP), { type: "error", message: "The prompt helper needs a workshop code. Ask your teacher for it.", need: "code" });
  assert.equal(api.calls.length, 0, "none of that needed the network");
});

test("on a code, a brief goes to the site's API with the code, the browser id and only what may travel", async () => {
  saveCode();
  stored.set("police_pound_cast_v1", JSON.stringify([{ id: "mine-a1", name: "Zog", look: "a small green robot with one wheel", img: "data:image/jpeg;base64,PICTURE" }]));
  api.answer = () => [200, GOOD];
  const out = await W.makeBrief(input({ tier: "advanced", cast: ["hero", "mine-a1"], place: "harbour", extra: "not sent", key: "not sent" }));
  assert.deepEqual(out, GOOD);
  const { route, body } = api.calls[0];
  assert.equal(route, "brief");
  assert.deepEqual(Object.keys(body).sort(), ["attempt", "cast", "code", "example", "idea", "palette", "place", "platform", "round", "session", "subject", "tier"]);
  assert.equal(body.code, "maple otter kite 47");
  assert.deepEqual(body.cast, [{ id: "hero" }, { id: "mine-a1", name: "Zog", look: "a small green robot with one wheel" }]);
  assert.ok(!JSON.stringify(body).includes("PICTURE"), "a picture never travels");
  assert.equal(body.place, "harbour");

  // The cast as gang.forPrompt gives it, or with extra fields a page left on: the same thing is sent.
  await W.makeBrief(input({ tier: "advanced", cast: [{ id: "hero", img: "data:PICTURE", look: "changed", story: "s" }, { id: "mine-a1", name: "Zog", look: "a robot", img: "data:PICTURE" }] }));
  assert.deepEqual(api.calls[1].body.cast, [{ id: "hero" }, { id: "mine-a1", name: "Zog", look: "a robot" }]);
  // "My own place", or anything that is not one of the places, is sent as no place at all.
  for (const place of ["own", null, "atlantis", 7]) {
    await W.makeBrief(input({ place }));
    assert.ok(!("place" in api.calls.at(-1).body), String(place));
  }
  // A gate answer comes through as it is.
  api.answer = () => [200, { type: "gate", questions: ["What is it wearing?", "Where is it?", "extra"], attempt: ATTEMPT }];
  assert.deepEqual(await W.makeBrief(input()), { type: "gate", questions: ["What is it wearing?", "Where is it?"], attempt: ATTEMPT });
});

test("every refusal becomes words a child can read, with a way on", async () => {
  const cases = [
    [[429, { type: "error", reason: "busy", message: "x" }], { reason: "busy", message: "Lots of people are asking at once. Wait a minute, then try again." }],
    [[429, { type: "error", reason: "used_up", message: "x" }], { reason: "used_up", message: "Your class has used up the helper for today. Tell your teacher. You can still carry on." }],
    [[429, { type: "error", reason: "device_cap", message: "x" }], { reason: "device_cap", message: "This device has asked the helper a lot today. You can still carry on." }],
    [[413, { type: "error", reason: "too_long", message: "x" }], { reason: "too_long", message: "That is too much text. Make it shorter, then try again." }],
    [[502, { type: "error", reason: "setup", setup: true, message: "x" }], { setup: true, message: "The helper’s key was refused. Tell your teacher." }],
    [[503, { type: "error", reason: "not_open", message: "x" }], { reason: "not_open", message: "Workshop codes are not switched on yet. Tell your teacher." }],
    [[500, { type: "error", reason: "busy", message: "x" }], { reason: "offline", message: "Could not reach Paws & Order. Check the internet, then try again." }],
    [[403, { type: "error", reason: "wrong_origin" }], { reason: "offline" }],
    ["<!doctype html>", { reason: "offline" }],
    [[200, { type: "brief", brief: { prompts: [] } }], { reason: "offline" }], [[200, { hello: "world" }], { reason: "offline" }], [[200, { type: "brief", brief: "text" }], { reason: "offline" }],
  ];
  for (const [answer, want] of cases) {
    saveCode();
    api.answer = (route) => (route === "code" ? OPEN(2) : answer);
    const out = await W.makeBrief(input());
    assert.equal(out.type, "error", JSON.stringify(answer));
    assert.equal(out.canStarter, true, JSON.stringify(answer));
    for (const k of Object.keys(want)) assert.equal(out[k], want[k], JSON.stringify(answer) + " " + k);
    assert.ok(typeof out.message === "string" && out.message.length > 20);
    assert.equal(W.access().mode, "code", "the code is kept");
    const c = await W.compare(CMP);
    assert.equal(c.type, "error");
    assert.equal(c.canStarter, undefined, "the starter is for the prompt helper only");
    if (want.reason) assert.equal(c.reason, want.reason);
  }
  saveCode();
  api.answer = () => { throw new TypeError("Failed to fetch"); };
  assert.deepEqual(await W.makeBrief(input()), { type: "error", message: "Could not reach Paws & Order. Check the internet, then try again.", reason: "offline", canStarter: true });

  // The server's own check of the words (or the AI declining them) is shown as the server said it.
  api.answer = () => [400, { type: "error", message: "The AI would rather not answer that one. Try changing your idea to something friendlier." }];
  const declined = await W.makeBrief(input());
  assert.deepEqual(declined, { type: "error", message: "The AI would rather not answer that one. Try changing your idea to something friendlier." });
  api.answer = () => [400, { reason: "bad_request", message: "That request could not be read." }];
  assert.equal((await W.makeBrief(input())).reason, "offline");
});

test("a code the server no longer takes is dropped, and the learner is asked for a new one", async () => {
  for (const [answer, message] of [[[401, { type: "error", reason: "wrong" }], "That code did not work. Check the spelling with your teacher."],
    [[410, { type: "error", reason: "expired" }], "That code has finished. Ask your teacher for today’s code."],
    [[410, { type: "error", reason: "ended" }], "Your teacher has closed that code. Ask for a new one."]]) {
    saveCode();
    api.answer = () => answer;
    assert.deepEqual(await W.makeBrief(input()), { type: "error", message, need: "code", canStarter: true });
    assert.equal(W.access().mode, "none");
    saveCode();
    assert.deepEqual(await W.compare(CMP), { type: "error", message, need: "code" });
    assert.equal(stored.has("paws_workshop_v1"), false);
  }
});

test("a locked level re-checks the code, lowers the plan and says what changed", async () => {
  saveCode({ level: 3, name: "Storyteller" });
  J.save({ pick: { tier: "advanced", cast: ["hero", "buddy"], idea: "a chase" } });
  api.answer = (route) => (route === "code" ? OPEN(1) : [403, { type: "error", reason: "locked", locked: true, message: "That level is not open yet. Your teacher opens it." }]);
  const out = await W.makeBrief(input({ tier: "advanced", cast: ["hero", "buddy"] }));
  assert.deepEqual(out, { type: "error", message: "Your class is working at Doodler. We changed your level to Doodler. Everything else is kept.", locked: true,
    lowered: { from: "advanced", to: "basic", fromName: "Storyteller", toName: "Doodler" }, canStarter: true });
  assert.deepEqual(api.calls.map((c) => c.route), ["brief", "code"]);
  assert.equal(W.maxLevel(), 1);
  assert.deepEqual([J.get().pick.tier, J.get().pick.cast, J.get().pick.idea], ["basic", ["hero"], "a chase"]);

  // If the re-check cannot get through, it is still a plain "not open yet", never a bare failure.
  saveCode({ level: 3, name: "Storyteller" });
  api.answer = (route) => (route === "code" ? "<html>" : [403, { type: "error", locked: true }]);
  const plain = await W.makeBrief(input({ tier: "advanced" }));
  assert.deepEqual([plain.locked, plain.message, plain.canStarter], [true, "That level is not open yet. Your teacher opens it.", true]);
});

test("after the helper is asked, a code checked over a minute ago is quietly checked again", async () => {
  saveCode({ level: 1, name: "Doodler", checkedAt: new Date(Date.now() - 5 * 60000).toISOString() });
  api.answer = (route) => (route === "code" ? OPEN(3) : [200, GOOD]);
  await W.makeBrief(input());
  await tick(); await tick();
  assert.deepEqual(api.calls.map((c) => c.route), ["brief", "code"]);
  assert.equal(W.maxLevel(), 3, "a level the teacher raised is picked up");
  api.calls = [];
  await W.makeBrief(input());
  await W.compare(CMP);
  await tick();
  assert.deepEqual(api.calls.map((c) => c.route), ["brief", "compare"], "not again within the minute");
});

test("on a teacher's own key the request goes straight to the AI service, and the level set there is the lock", async () => {
  stored.set("police_pound_ai_v1", JSON.stringify({ provider: "anthropic", model: "", base: "", remember: true, maxLevel: 1, key: "sk-own-key-0123456789" }));
  const out = await W.makeBrief(input({ round: 2 }));
  assert.equal(out.type, "brief");
  assert.deepEqual(api.calls.map((c) => c.route), ["AI:api.anthropic.com"]);
  assert.equal(api.calls[0].headers["x-api-key"], "sk-own-key-0123456789");

  J.save({ pick: { tier: "medium", cast: ["hero"] } });
  const locked = await W.makeBrief(input({ round: 2, tier: "medium" }));
  assert.deepEqual([locked.type, locked.locked, locked.canStarter, locked.lowered.to], ["error", true, true, "basic"]);
  assert.equal(J.get().pick.tier, "basic");
  assert.equal(api.calls.length, 1, "no AI call for a locked level");
});

test("compare on a code: the prompt, the descriptions and the helper's prompts go; the answer is checked", async () => {
  saveCode();
  api.answer = () => [200, { type: "compare", asked_and_missing: ["a red hat", 7], appeared_unasked: [], drift_words: ["shiny"], questions: ["Which word?"], looks_copied: false, extra: "dropped" }];
  const out = await W.compare({ ...CMP, reference: "A penguin.", brief: { anchor: "Shared.", prompts: ["One.", 2], why_this_works: "not sent" }, junk: 1 });
  assert.deepEqual(out, { type: "compare", asked_and_missing: ["a red hat"], appeared_unasked: [], drift_words: ["shiny"], questions: ["Which word?"], looks_copied: false });
  const { route, body } = api.calls[0];
  assert.equal(route, "compare");
  assert.deepEqual(Object.keys(body).sort(), ["brief", "code", "description", "prompt", "reference", "session"]);
  assert.deepEqual(body.brief, { anchor: "Shared.", prompts: ["One."] });
  api.answer = () => [200, { type: "fallback", checklist: THEME.compareChecklist }];
  assert.deepEqual(await W.compare(CMP), { type: "fallback", checklist: THEME.compareChecklist });
  api.answer = () => [200, { type: "copied", message: "This matches your prompt." }];
  assert.equal((await W.compare(CMP)).type, "copied");
});

test("nothing a page passes in can make the helper throw", async () => {
  saveCode();
  const circular = {}; circular.self = circular;
  for (const junk of [undefined, null, 7, "text", [], circular, { cast: circular }, { cast: [circular] }, { brief: circular }, { get tier() { throw new Error("boom"); } }]) {
    for (const fn of [W.makeBrief, W.compare]) {
      const out = await fn(junk);
      assert.equal(out.type, "error");
      assert.ok(typeof out.message === "string" && out.message.length > 5);
    }
    const s = W.starterBrief(junk);
    assert.ok(s.type === "brief" || s.type === "error");
  }
  for (const junk of [undefined, null, 7, {}, circular]) {
    assert.equal((await W.enterCode(junk)).ok, false);
    for (const t of ["create", "status", "end", "setLevel"]) assert.equal((await W.teacher[t](junk)).ok, false);
    assert.equal(W.mountCodeBox(junk === circular ? null : junk), null);
    W.onChange(junk)();
  }
});

// ---------- the starter prompt ----------

test("the starter prompt is the learner's own brief, joined up, with no AI", () => {
  const nettle = THEME.cast.find((c) => c.id === "hero"), harbour = THEME.places.find((p) => p.id === "harbour");
  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const out = W.starterBrief(input({ tier: "advanced", palette: "sea", place: "harbour", idea: "  Nettle finds a clue under a bench!  ", cast: ["hero", "buddy"] }));
  assert.deepEqual(out, { type: "brief", fallback: true, starter: true, attempt: ATTEMPT, brief: {
    anchor: "",
    prompts: [cap(nettle.look) + ". Nettle finds a clue under a bench. " + cap(harbour.look) + ". " + cap(THEME.houseStyle) + ". Colours: " + THEME.palettes.sea.phrase + ". No words, no captions, no speech bubbles."],
    why_this_works: "This prompt is your own brief, joined up: the look, your idea, the style and the colours.",
    platform_notes: "", watch_for: "Check the colours and the look first.", friendly_note: "" } });
  assert.equal(api.calls.length, 0);

  // A place picture: the place's look comes first, and nobody is in it.
  const place = W.starterBrief(input({ subject: "setting", place: "library", cast: ["hero"], idea: "a quiet morning" })).brief.prompts[0];
  assert.ok(place.startsWith("A cosy library with tall bookshelves"));
  assert.ok(place.endsWith("No words, no captions, no speech bubbles. No characters."));
  assert.ok(!place.includes("hedgehog"));
  // "My own place": the idea carries it.
  assert.ok(W.starterBrief(input({ subject: "setting", place: "own", idea: "a castle made of jelly" })).brief.prompts[0].startsWith("A castle made of jelly. Hand-drawn"));
  // A learner's own character.
  assert.ok(W.starterBrief(input({ cast: [{ id: "mine-a1", name: "Zog", look: "a small green robot" }] })).brief.prompts[0].startsWith("A small green robot. Nettle finds"));
  // Words we do not use: the friendly nudge, not a prompt.
  assert.deepEqual(W.starterBrief(input({ idea: "a hedgehog with a gun" })), { type: "error", message: AI.FRIENDLY_NUDGE });
  assert.equal(W.starterBrief(input({ cast: [{ id: "mine-a1", name: "Zog", look: "a robot with a rifle" }] })).type, "error");
  // No idea yet: the starter from the files, still one prompt.
  const empty = W.starterBrief(input({ idea: "   ", tier: "advanced", place: "harbour" }));
  assert.deepEqual([empty.starter, empty.fallback, empty.brief.prompts.length], [true, true, 1]);
  assert.ok(empty.brief.prompts[0].includes(harbour.look));
  // One prompt whatever the level, and never an em-dash or a {token}.
  for (const tier of ["basic", "medium", "advanced"]) {
    const b = W.starterBrief(input({ tier })).brief;
    assert.equal(b.prompts.length, 1);
    assert.doesNotMatch(JSON.stringify(b), /—|\{\w+\}|\.\./);
  }
});

// ---------- the teacher's side ----------

test("the teacher's calls: what is sent, what comes back, and nothing is kept", async () => {
  api.answer = () => [200, { code: "maple-otter-kite-47", manage: "0123456789abcdef0123456789abcdef", level: 2, platform: "gemini", until: soon(), cap: 600 }];
  const made = await W.teacher.create({ provider: "anthropic", key: "  sk-teacher-key-0123456789abcdef  ", model: "claude-haiku-4-5-20251001", level: "2", platform: "gemini", days: "7", cap: "600", extra: 1 });
  assert.deepEqual([made.ok, made.code, made.manage.length, made.level, made.platform, made.cap], [true, "maple-otter-kite-47", 32, 2, "gemini", 600]);
  assert.deepEqual(api.calls[0].body, { provider: "anthropic", key: "sk-teacher-key-0123456789abcdef", model: "claude-haiku-4-5-20251001", level: 2, platform: "gemini", days: 7, cap: 600 });
  assert.equal(api.calls[0].route, "workshop/create");
  for (const [k, v] of stored) assert.ok(!v.includes("sk-teacher-key") && !v.includes(made.manage), k);
  assert.equal(stored.has("paws_workshop_v1"), false, "making a code does not enter it");
  await W.teacher.create({ provider: "openai", key: "k", model: "m", level: 1, platform: "Let learners choose", days: 1, cap: 300 });
  assert.equal(api.calls[1].body.platform, null);

  api.answer = () => [200, { level: 2, platform: null, until: soon(), ended: null, uses: 12, cap: 600, provider: "anthropic", model: "claude-haiku-4-5-20251001" }];
  const status = await W.teacher.status({ code: "maple-otter-kite-47", manage: made.manage });
  assert.deepEqual([status.ok, status.uses, status.cap, status.ended, status.provider], [true, 12, 600, null, "anthropic"]);
  assert.deepEqual(api.calls[2], { route: "workshop/status", body: { code: "maple-otter-kite-47", manage: made.manage }, headers: { "content-type": "application/json" }, method: "POST" });
  api.answer = () => [200, { ended: true }];
  assert.deepEqual(await W.teacher.end({ code: "c", manage: "m" }), { ok: true });
  api.answer = () => [200, { level: 3 }];
  assert.deepEqual(await W.teacher.setLevel({ code: "c", manage: "m", level: "3" }), { ok: true, level: 3 });
  assert.deepEqual(api.calls.at(-1).body, { code: "c", manage: "m", level: 3 });
  assert.equal(api.calls.at(-1).route, "workshop/level");

  const fails = [
    [[400, { reason: "key_test", message: "The AI service refused that key." }], "key_test", "The AI service refused that key."],
    [[400, { reason: "invalid", message: "Choose a model from the list, or type its name: letters, numbers, dots and dashes only." }], "invalid", "Choose a model from the list, or type its name: letters, numbers, dots and dashes only."],
    [[401, { reason: "wrong", message: "That code and manage key do not match a workshop." }], "wrong"],
    [[410, { reason: "ended", message: "That workshop has been ended." }], "ended"],
    [[429, { reason: "busy", message: "Too many codes are being made right now. Try again in a few minutes." }], "busy"],
    [[503, { reason: "not_open", message: "x" }], "not_open", "Workshop codes are not switched on for this site yet."],
    [[500, { reason: "busy" }], "offline"], ["<html>", "offline"],
  ];
  for (const [answer, reason, message] of fails) {
    api.answer = () => answer;
    for (const t of ["create", "status", "end", "setLevel"]) {
      const out = await W.teacher[t]({ code: "c", manage: "m" });
      assert.deepEqual([out.ok, out.reason], [false, reason], t);
      assert.ok(out.message.length > 10);
      if (message) assert.equal(out.message, message);
    }
  }
});

// ---------- the code box ----------

const BOX = (n, extra = "") => `<div class="codebox${extra}" data-nopencil>
<label for="wcode-${n}">Workshop code</label>
<p class="hint2" id="wcode-${n}-hint">Your teacher has it: three words and a number. You can type spaces between them. Capital letters do not matter.</p>
<div class="codebox-row">
<input id="wcode-${n}" type="text" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="go" maxlength="60" aria-describedby="wcode-${n}-hint wcode-${n}-status">
<button type="button" class="btn">Use this code</button>
</div>
<p class="codebox-status" id="wcode-${n}-status" role="status"></p>
<button type="button" class="linkbtn" hidden>Use a different code</button>
</div>`;
const parts = (root) => { const [label, hint, row, status, other] = root.kids; return { label, hint, row, input: row.kids[0], go: row.kids[1], status, other }; };

test("the code box is the contract's markup, to the letter", () => {
  const host = new El("div");
  host.appendChild(new El("p"));
  const root = W.mountCodeBox(host);
  assert.equal(host.kids.length, 1, "whatever was in the element is replaced");
  const n = root.kids[0].getAttribute("for").split("-")[1];
  assert.equal(root.html(), BOX(n));
  const second = W.mountCodeBox(new El("div"), { compact: true });
  assert.equal(second.html(), BOX(Number(n) + 1, " compact"), "each box has its own ids");
  // Every label has its field, and everything aria-describedby names is there.
  const p = parts(root);
  assert.equal(p.label.getAttribute("for"), p.input.getAttribute("id"));
  assert.deepEqual(p.input.getAttribute("aria-describedby").split(" "), [p.hint.getAttribute("id"), p.status.getAttribute("id")]);
});

test("the code box: checking, accepted, a different code", async () => {
  const root = W.mountCodeBox(new El("div"));
  const p = parts(root);
  const status = p.status;
  let release;
  api.answer = () => new Promise((r) => { release = () => r(OPEN(2)); });

  p.input.value = "maple otter kite 47";
  p.input.focus();
  p.input.fire("keydown", { key: "a" });
  assert.equal(api.calls.length, 0, "typing checks nothing");
  p.go.focus();
  p.go.fire("click");
  await tick();
  // While it checks: the button keeps the focus, says so, and is marked rather than disabled.
  assert.deepEqual([p.go.textContent, p.go.getAttribute("aria-disabled"), p.go.className, p.go.hasAttribute("disabled")], ["Checking…", "true", "btn is-off", false]);
  assert.equal(document.activeElement, p.go);
  assert.deepEqual([status.textContent, status.className], ["Checking the code…", "codebox-status is-wait"]);
  p.go.fire("click");
  p.input.fire("keydown", { key: "Enter" });
  await tick();
  assert.equal(api.calls.length, 1, "a second press while checking does nothing");

  release();
  await tick(); await tick();
  assert.deepEqual([p.row.hidden, p.hint.hidden, p.other.hidden, p.label.hidden], [true, true, false, false]);
  assert.deepEqual([status.textContent, status.className], ["Code accepted. The prompt helper is on, up to Sketcher.", "codebox-status is-ok"]);
  assert.equal(document.activeElement, p.other, "focus moves to Use a different code");
  assert.deepEqual([p.go.textContent, p.go.hasAttribute("aria-disabled"), p.go.className, p.input.value], ["Use this code", false, "btn", ""]);
  assert.equal(root.kids[3], status, "the status node is made once and never replaced");
  assert.equal(root.kids.length, 5);

  p.other.fire("click");
  assert.deepEqual([p.row.hidden, p.hint.hidden, p.other.hidden, status.textContent, status.className], [false, false, true, "", "codebox-status"]);
  assert.equal(document.activeElement, p.input);
  assert.equal(W.access().mode, "none");
});

test("the code box: a failure keeps the focus in the field and marks it until it is edited", async () => {
  const p = parts(W.mountCodeBox(new El("div")));
  api.answer = () => [401, { reason: "wrong", message: "x" }];
  p.input.value = "mapel otter kite 47";
  p.input.fire("keydown", { key: "Enter" });
  await tick(); await tick();
  assert.deepEqual([p.status.textContent, p.status.className], ["That code did not work. Check the spelling with your teacher.", "codebox-status is-bad"]);
  assert.equal(p.input.getAttribute("aria-invalid"), "true");
  assert.equal(document.activeElement, p.input);
  assert.deepEqual([p.row.hidden, p.other.hidden, p.input.value], [false, true, "mapel otter kite 47"]);
  p.input.fire("input");
  assert.equal(p.input.hasAttribute("aria-invalid"), false);

  for (const [answer, words] of [[[410, { reason: "expired" }], "That code has finished. Ask your teacher for today’s code."], [[410, { reason: "ended" }], "Your teacher has closed that code. Ask for a new one."],
    [[429, { reason: "used_up" }], "That code has been used as much as it can be today. Tell your teacher."], [[429, { reason: "busy" }], "Lots of people are checking codes. Wait a minute, then try again."],
    ["<html>", "Could not reach Paws & Order. Check the internet, then try again."], [[503, { reason: "not_open" }], "Workshop codes are not switched on yet. Tell your teacher."]]) {
    api.answer = () => answer;
    p.go.fire("click");
    await tick(); await tick();
    assert.equal(p.status.textContent, words);
    assert.equal(p.status.className, "codebox-status is-bad");
  }
});

test("the code box says when the level was lowered, and every box on the page stays in step", async () => {
  J.save({ pick: { tier: "advanced", cast: ["hero", "buddy"] } });
  const a = parts(W.mountCodeBox(new El("div")));
  const b = parts(W.mountCodeBox(new El("div"), { compact: true }));
  api.answer = () => OPEN(1);
  a.input.value = "maple otter kite 47";
  a.go.fire("click");
  await tick(); await tick();
  const words = "Code accepted. The prompt helper is on, up to Doodler. Your class is working at Doodler. We changed your level to Doodler. Everything else is kept.";
  assert.equal(a.status.textContent, words);
  assert.equal(b.status.textContent, words);
  assert.deepEqual([b.row.hidden, b.other.hidden], [true, false]);
  assert.equal(document.activeElement, a.other, "only the box that was used moves the focus");

  // A workshop the teacher ends: the next request drops the code, and both boxes say why.
  api.answer = () => [410, { type: "error", reason: "ended" }];
  await W.makeBrief(input());
  for (const box of [a, b]) {
    assert.deepEqual([box.status.textContent, box.status.className, box.row.hidden, box.other.hidden], ["Your teacher has closed that code. Ask for a new one.", "codebox-status is-bad", false, true]);
  }
  // A code that runs out while the page is open.
  saveCode({ until: new Date(Date.now() - 1000).toISOString() });
  W.access();
  await tick();
  assert.equal(a.status.textContent, "That code has finished. Ask your teacher for today’s code.");
  // Another tab accepts a code: this page's boxes pick it up from storage.
  saveCode({ level: 3, name: "Storyteller" });
  for (const fn of windowListeners.storage) fn({ key: "paws_workshop_v1" });
  assert.equal(b.status.textContent, "Code accepted. The prompt helper is on, up to Storyteller.");
});

test("the code box on a teacher's own key shows no field", () => {
  stored.set("police_pound_ai_v1", JSON.stringify({ provider: "anthropic", model: "", base: "", remember: true, maxLevel: 3, key: "sk-own-key-0123456789" }));
  const p = parts(W.mountCodeBox(new El("div")));
  assert.deepEqual([p.status.textContent, p.status.className], ["This device is set up by your teacher. No code needed.", "codebox-status is-ok"]);
  assert.deepEqual([p.label.hidden, p.hint.hidden, p.row.hidden, p.other.hidden], [true, true, true, true]);
});

test("a box mounted over a code checked long ago asks about it again, quietly", async () => {
  saveCode({ level: 1, name: "Doodler", checkedAt: new Date(Date.now() - 30 * 60000).toISOString() });
  api.answer = () => OPEN(2);
  const p = parts(W.mountCodeBox(new El("div")));
  assert.equal(p.status.textContent, "Code accepted. The prompt helper is on, up to Doodler.");
  await tick(); await tick();
  assert.deepEqual(api.calls.map((c) => c.route), ["code"]);
  assert.equal(p.status.textContent, "Code accepted. The prompt helper is on, up to Sketcher.");
  api.calls = [];
  W.mountCodeBox(new El("div"));
  await tick();
  assert.equal(api.calls.length, 0, "a code checked a moment ago is not asked about");
});

test("W.code() is the saved code or nothing, and W.refresh() tells every listener", () => {
  assert.equal(W.code(), "");
  saveCode({ level: 2, name: "Sketcher" });
  assert.equal(typeof W.code(), "string");
  assert.ok(W.code().length > 0);
  const told = [];
  const stop = W.onChange((a, info) => told.push([a.mode, info.why]));
  W.refresh();
  stop();
  assert.deepEqual(told, [["code", "storage"]]);
  assert.equal(W.lowerLine({ toName: "Doodler" }), "Your class is working at Doodler. We changed your level to Doodler. Everything else is kept.");
});
