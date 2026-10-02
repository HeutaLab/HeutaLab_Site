// Run with: node --test dev/
// journey.js is imported with no page at all (no window, document or localStorage), which is itself the first
// test: the import must not throw. Each test then hands it a stand-in for localStorage.
import { test } from "node:test";
import assert from "node:assert/strict";
import J, * as named from "../journey.js";

const KEY = "paws_journey_v1";
const HOUR = 3600e3;

function fakeStorage(seed) {
  const m = new Map(Object.entries(seed || {}));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
    keys: () => [...m.keys()].sort(),
    json: (k) => JSON.parse(m.get(k)),
  };
}
// A fresh device for each test.
function device(seed) {
  const s = fakeStorage(seed);
  J._setStorage(s);
  return s;
}
const stored = (obj) => JSON.stringify(Object.assign({ v: 1 }, obj));

test("the default export carries every member, and each is also a named export", () => {
  const want = ["STAGES", "BASE", "get", "save", "start", "setStage", "setSub", "markDone", "frontier", "isStarted", "hrefFor", "resumeHref",
    "reset", "confirmReset", "mount", "scrollTo", "focusHeading", "announce", "words", "esc", "copy", "tierRank"];
  for (const k of want) {
    assert.ok(k in J, "J." + k);
    assert.equal(named[k], J[k], "named export " + k);
  }
  assert.equal(J.STAGES.length, 5);
  assert.deepEqual(J.STAGES.map((s) => s.name), ["Look closely", "Choose and describe", "Create with AI", "Check and improve", "Build and share"]);
  assert.ok(J.BASE.endsWith("/paws-and-order/"));
});

test("with nothing stored, get() is a whole journey with every default", () => {
  device();
  const j = J.get();
  assert.equal(j.v, 1);
  assert.equal(j.stage, 1);
  assert.equal(j.sub, "watch");
  assert.equal(j.started, null);
  assert.deepEqual(j.done, { 1: false, 2: false, 3: false, 4: false, 5: false });
  assert.equal(j.look, null);
  assert.equal(j.lookDraft, null);
  assert.deepEqual(j.pick, { subject: null, cast: [], place: null, palette: null, tier: null, platform: null, attempt: "", attemptIsExample: false, idea: "" });
  assert.deepEqual(j.check, { prompt: "", description: "", reference: "", result: null, byEye: [], why: "", change: "", kept: false, keptWhy: "", at: null });
  assert.equal(j.helper, null);
  assert.equal(j.used, null);
  assert.equal(j.made, null);
  assert.equal(j.checkPrev, null);
  assert.equal(j.reflect, "");
  assert.equal(j.finished, null);
});

test("an unknown version, or text that is not JSON, is treated as no journey", () => {
  device({ [KEY]: JSON.stringify({ v: 2, stage: 4, started: "2026-01-01T00:00:00.000Z", pick: { idea: "from the future" } }) });
  assert.equal(J.get().stage, 1);
  assert.equal(J.get().pick.idea, "");
  assert.equal(J.isStarted(), false);

  device({ [KEY]: "{not json" });
  assert.equal(J.get().stage, 1);
  assert.equal(J.isStarted(), false);

  device({ [KEY]: JSON.stringify(["an", "array"]) });
  assert.equal(J.isStarted(), false);
});

test("a stored journey with bad parts is repaired, not thrown away", () => {
  device({ [KEY]: stored({ stage: 9, sub: "nope", done: "yes", pick: "oops", check: null, look: "text" }) });
  const j = J.get();
  assert.equal(j.stage, 1);
  assert.equal(j.sub, "watch");
  assert.deepEqual(j.done, { 1: false, 2: false, 3: false, 4: false, 5: false });
  assert.equal(j.pick.idea, "");
  assert.equal(j.check.kept, false);
  assert.equal(j.look, null);

  device({ [KEY]: stored({ stage: 2, sub: "prompt" }) });   // "prompt" is not a substep of stage 2
  assert.equal(J.get().sub, "who");
});

test("save merges the top level and stamps the time", () => {
  const s = device();
  const before = Date.now();
  const j = J.save({ reflect: "I changed the hat." });
  assert.equal(j.reflect, "I changed the hat.");
  assert.ok(Date.parse(j.at) >= before);
  J.save({ made: "2026-10-02T09:00:00.000Z" });
  const now = J.get();
  assert.equal(now.reflect, "I changed the hat.");
  assert.equal(now.made, "2026-10-02T09:00:00.000Z");
  assert.equal(s.json(KEY).v, 1);
});

test("save merges the keys of pick, check and done one level down", () => {
  device();
  J.save({ pick: { subject: "character", cast: ["hero"] } });
  J.save({ pick: { palette: "sea" } });
  J.save({ check: { prompt: "a hedgehog", why: "the tool guessed" } });
  J.save({ check: { change: "say the hat is brown" } });
  J.save({ done: { 1: "2026-10-02T09:00:00.000Z" } });
  J.save({ done: { 2: "2026-10-02T09:10:00.000Z" } });
  const j = J.get();
  assert.equal(j.pick.subject, "character");
  assert.deepEqual(j.pick.cast, ["hero"]);
  assert.equal(j.pick.palette, "sea");
  assert.equal(j.pick.tier, null);
  assert.equal(j.check.prompt, "a hedgehog");
  assert.equal(j.check.why, "the tool guessed");
  assert.equal(j.check.change, "say the hat is brown");
  assert.equal(j.done[1], "2026-10-02T09:00:00.000Z");
  assert.equal(j.done[2], "2026-10-02T09:10:00.000Z");
  assert.equal(j.done[3], false);
});

test("everything else is replaced whole, never merged", () => {
  device();
  J.save({ look: { text: "A round penguin", tier: "basic", subject: "character", cast: ["hero"], ref: "penguin-postie", mode: "create", example: false, at: "x" } });
  J.save({ look: { text: "A boxy robot" } });
  assert.deepEqual(J.get().look, { text: "A boxy robot" });

  J.save({ lookDraft: { tier: "basic", mode: "create", ref: "owl-inventor", answers: { "owl-inventor|basic": { see: "an owl", colours: "brown" } }, desc: "An owl", manual: false } });
  J.save({ lookDraft: { tier: "medium", answers: { "robot-chef|medium": { hair: "none" } } } });
  assert.deepEqual(J.get().lookDraft, { tier: "medium", answers: { "robot-chef|medium": { hair: "none" } } });

  J.save({ helper: { anchor: "a", prompts: ["one", "two"], fallback: false } });
  J.save({ helper: { prompts: ["three"] } });
  assert.deepEqual(J.get().helper, { prompts: ["three"] });

  J.save({ used: { index: 1, text: "two", at: "x" } });
  J.save({ used: { index: 0, text: "one" } });
  assert.deepEqual(J.get().used, { index: 0, text: "one" });

  // arrays, and an object two levels down (check.result), are values too: the patch's copy is the new value
  J.save({ pick: { cast: ["hero", "buddy"] } });
  J.save({ pick: { cast: ["flash"] } });
  assert.deepEqual(J.get().pick.cast, ["flash"]);
  J.save({ check: { byEye: ["ok", "wrong", null], result: { type: "compare", asked_and_missing: ["a hat"], questions: ["why?"] } } });
  J.save({ check: { byEye: ["ok"], result: { type: "fallback" } } });
  assert.deepEqual(J.get().check.byEye, ["ok"]);
  assert.deepEqual(J.get().check.result, { type: "fallback" });

  J.save({ checkPrev: { prompt: "first go", change: "one thing", kept: false } });
  J.save({ checkPrev: { prompt: "second go" } });
  assert.equal(J.get().checkPrev.prompt, "second go");
  assert.equal(J.get().checkPrev.change, "");
});

test("null clears a value", () => {
  device();
  J.save({ look: { text: "words" }, lookDraft: { desc: "draft" }, helper: { prompts: ["p"] }, used: { index: 0, text: "p" }, made: "2026-10-02T09:00:00.000Z",
    checkPrev: { prompt: "p" }, check: { result: { type: "compare" } }, pick: { subject: "setting", place: "harbour" } });
  J.save({ look: null, lookDraft: null, helper: null, used: null, made: null, checkPrev: null, check: { result: null }, pick: { place: null } });
  const j = J.get();
  assert.equal(j.look, null);
  assert.equal(j.lookDraft, null);
  assert.equal(j.helper, null);
  assert.equal(j.used, null);
  assert.equal(j.made, null);
  assert.equal(j.checkPrev, null);
  assert.equal(j.check.result, null);
  assert.equal(j.pick.place, null);
  assert.equal(j.pick.subject, "setting");
});

test("save re-reads storage first, so a change made by another page or tab is kept", () => {
  const s = device();
  const mine = J.save({ pick: { idea: "Nettle finds a clue" } });
  // another tab ticks stage 1 and picks the colours while this page still holds its old copy
  const theirs = s.json(KEY);
  theirs.done[1] = "2026-10-02T09:00:00.000Z";
  theirs.pick.palette = "berry";
  s.setItem(KEY, JSON.stringify(theirs));
  J.save({ pick: { subject: "character" } });
  const j = J.get();
  assert.equal(j.done[1], "2026-10-02T09:00:00.000Z");
  assert.equal(j.pick.palette, "berry");
  assert.equal(j.pick.idea, "Nettle finds a clue");
  assert.equal(j.pick.subject, "character");
  assert.equal(mine.done[1], false);   // the copy this page was handed earlier is just a copy
});

test("save cannot change the version, and returns a copy that is not tied to the patch", () => {
  const s = device();
  const cast = ["hero"];
  const j = J.save({ v: 7, pick: { cast } });
  assert.equal(j.v, 1);
  assert.equal(s.json(KEY).v, 1);
  cast.push("buddy");
  assert.deepEqual(J.get().pick.cast, ["hero"]);
  assert.deepEqual(j.pick.cast, ["hero"]);
});

test("text limits are applied on save, silently", () => {
  device();
  const long = (n) => "x".repeat(n + 500);
  const j = J.save({
    look: { text: long(1500) },
    lookDraft: { desc: long(1500) },
    pick: { attempt: long(1500), idea: long(800) },
    check: { prompt: long(3000), description: long(3000), reference: long(3000), why: long(300), change: long(300), keptWhy: long(300) },
    checkPrev: { prompt: long(3000), change: long(300) },
    reflect: long(600),
    used: { index: 0, text: long(4000) },
  });
  assert.equal(j.look.text.length, 1500);
  assert.equal(j.lookDraft.desc.length, 1500);
  assert.equal(j.pick.attempt.length, 1500);
  assert.equal(j.pick.idea.length, 800);
  assert.equal(j.check.prompt.length, 3000);
  assert.equal(j.check.description.length, 3000);
  assert.equal(j.check.reference.length, 3000);
  assert.equal(j.check.why.length, 300);
  assert.equal(j.check.change.length, 300);
  assert.equal(j.check.keptWhy.length, 300);
  assert.equal(j.checkPrev.prompt.length, 3000);
  assert.equal(j.checkPrev.change.length, 300);
  assert.equal(j.reflect.length, 600);
  assert.equal(j.used.text.length, 4000);
  // and what was stored is what was returned
  assert.equal(J.get().pick.attempt.length, 1500);
  // text inside the limit is untouched
  assert.equal(J.save({ pick: { idea: "short" } }).pick.idea, "short");
});

test("frontier is the first stage still to do, and stages past it are locked", () => {
  device();
  assert.equal(J.frontier(), 1);
  J.markDone(1);
  assert.equal(J.frontier(), 2);
  J.markDone(2);
  assert.equal(J.frontier(), 3);
  // a later stage done out of order does not move it: 1..N must ALL be done
  J.markDone(4);
  assert.equal(J.frontier(), 3);
  J.markDone(3);
  assert.equal(J.frontier(), 5);
  J.markDone(5);
  assert.equal(J.frontier(), 5);   // never past the last stage

  // it reads a journey it is handed, without touching storage
  assert.equal(J.frontier({ done: { 1: "x", 2: false, 3: "x", 4: false, 5: false } }), 2);
  assert.equal(J.frontier({ done: { 1: false, 2: "x", 3: "x", 4: "x", 5: "x" } }), 1);
  const locked = (j) => J.STAGES.map((s) => s.n > J.frontier(j));
  assert.deepEqual(locked({ done: { 1: "x", 2: false, 3: false, 4: false, 5: false } }), [false, false, true, true, true]);
});

test("markDone stamps a time once, and a stage is never un-done", () => {
  device();
  const first = J.markDone(2).done[2];
  assert.ok(typeof first === "string" && !Number.isNaN(Date.parse(first)));
  assert.equal(J.markDone(2).done[2], first);                                  // a second press keeps the first time
  assert.equal(J.save({ done: { 2: false } }).done[2], first);                 // false cannot undo it
  assert.equal(J.save({ done: { 2: null } }).done[2], first);
  assert.equal(J.save({ done: { 2: "2030-01-01T00:00:00.000Z" } }).done[2], first);
  assert.equal(J.save({ done: null }).done[2], first);
  assert.equal(J.save({ done: {} }).done[2], first);
  // stage numbers that do not exist are ignored
  J.markDone(0); J.markDone(6); J.markDone("two");
  assert.deepEqual(Object.keys(J.get().done), ["1", "2", "3", "4", "5"]);
  assert.equal(J.get().done[1], false);
});

test("hrefFor gives each stage its page, and resumeHref goes where the learner last worked", () => {
  device();
  assert.equal(J.hrefFor(1), J.BASE + "references/");
  assert.equal(J.hrefFor(2), J.BASE + "picture/#choose");
  assert.equal(J.hrefFor(3), J.BASE + "picture/#create");
  assert.equal(J.hrefFor(4), J.BASE + "picture/#check");
  assert.equal(J.hrefFor(5), J.BASE + "builder/");
  assert.equal(J.hrefFor(2, "colours"), J.BASE + "picture/#choose");

  // nothing saved: the frontier stage
  assert.equal(J.resumeHref(), J.BASE + "references/");

  // the saved stage wins, even when it is behind the frontier (they went back to change something)
  J.markDone(1); J.markDone(2); J.markDone(3);
  J.setStage(2, "colours");
  assert.equal(J.frontier(), 4);
  assert.equal(J.resumeHref(), J.BASE + "picture/#choose");
  J.setStage(5, "page");
  assert.equal(J.resumeHref(), J.BASE + "builder/");

  // with a journey handed in
  assert.equal(J.resumeHref({ started: "x", stage: 3, done: {}, pick: {} }), J.BASE + "picture/#create");
});

test("isStarted: started, any stage done, or any work saved", () => {
  device();
  assert.equal(J.isStarted(), false);
  const fresh = () => { device(); return J; };
  fresh().start();                               assert.equal(J.isStarted(), true);
  fresh().markDone(1);                           assert.equal(J.isStarted(), true);
  fresh().save({ look: { text: "words" } });     assert.equal(J.isStarted(), true);
  fresh().save({ pick: { attempt: "words" } });  assert.equal(J.isStarted(), true);
  fresh().save({ pick: { idea: "an idea" } });   assert.equal(J.isStarted(), true);
  fresh().save({ pick: { subject: "setting" } });assert.equal(J.isStarted(), true);
  fresh().save({ helper: { prompts: ["p"] } });  assert.equal(J.isStarted(), true);
  // choices that are not work on their own do not count
  fresh().save({ pick: { palette: "sea", tier: "basic", platform: "any" } });
  assert.equal(J.isStarted(), false);
  fresh().save({ lookDraft: { desc: "half a thought" } });
  assert.equal(J.isStarted(), false);
});

test("start sets started once and puts the learner at stage 1", () => {
  device();
  const a = J.start();
  assert.ok(a.started);
  assert.equal(a.stage, 1);
  J.setStage(3, "tool");
  const b = J.start();
  assert.equal(b.started, a.started);
  assert.equal(b.stage, 1);
  assert.equal(b.sub, "watch");
  assert.equal(b.done[1], false);   // starting is not doing
});

test("setStage and setSub save where the learner is", () => {
  device();
  assert.equal(J.setStage(2, "colours").sub, "colours");
  assert.equal(J.get().stage, 2);
  assert.equal(J.setStage(4).sub, "aim");                // no substep given: the stage's first
  assert.equal(J.setStage(4, "nonsense").sub, "aim");
  J.setSub("compare");
  assert.deepEqual([J.get().stage, J.get().sub], [4, "compare"]);
  J.setSub("who");                                       // not a substep of stage 4: ignored
  assert.deepEqual([J.get().stage, J.get().sub], [4, "compare"]);
  J.setStage(9, "x");                                    // not a stage: ignored
  assert.equal(J.get().stage, 4);
});

const EVERYTHING = () => ({
  paws_journey_v1: stored({ started: "x", pick: { idea: "an idea" } }),
  paws_session: "abcdefghijklmnop",
  police_pound_handoff: JSON.stringify({ idea: "old", ts: 1 }),
  police_pound_example: "an example",
  police_pound_lastbrief: "{}",
  paws_workshop_v1: "{}",
  police_pound_cast_v1: "[]",
  paws_teacher_v1: "{}",
  "police-pound-builder-seen": "[]",
  police_pound_ai_v1: JSON.stringify({ provider: "anthropic", maxLevel: 2 }),
  something_else: "kept",
});
const ALWAYS = ["paws_journey_v1", "paws_session", "police_pound_handoff", "police_pound_example", "police_pound_lastbrief"];
// What each option removes on top of the five that always go.
const EXTRA = { code: ["paws_workshop_v1"], characters: ["police_pound_cast_v1"], teacher: ["paws_teacher_v1"], comics: ["police-pound-builder-seen"] };

test("reset removes exactly the keys listed for each option, and nothing else", async () => {
  const all = Object.keys(EVERYTHING()).sort();
  const cases = [{}, { code: true }, { characters: true }, { teacher: true }, { comics: true }, { code: true, characters: true },
    { comics: true, characters: true, code: true, teacher: true }];
  for (const opts of cases) {
    const s = device(EVERYTHING());
    const before = Date.now();
    await J.reset(opts);
    const gone = ALWAYS.concat(...Object.keys(opts).map((k) => EXTRA[k]));
    const want = all.filter((k) => !gone.includes(k)).concat("paws_reset_at").sort();
    assert.deepEqual(s.keys(), want, "reset(" + JSON.stringify(opts) + ")");
    assert.ok(Date.parse(s.getItem("paws_reset_at")) >= before, "paws_reset_at is the time of the reset");
    assert.equal(s.getItem("police_pound_ai_v1"), JSON.stringify({ provider: "anthropic", maxLevel: 2 }), "the own-key setup is never touched");
    assert.equal(J.isStarted(), false);
  }
});

test("reset with no argument is the plain learner reset", async () => {
  const s = device(EVERYTHING());
  await J.reset();
  assert.equal(s.getItem("paws_journey_v1"), null);
  assert.equal(s.getItem("paws_workshop_v1"), "{}");
  assert.equal(s.getItem("police_pound_cast_v1"), "[]");
  assert.equal(s.getItem("paws_teacher_v1"), "{}");
  assert.equal(s.getItem("police-pound-builder-seen"), "[]");
});

const SOLO = "A round brown owl with big goggles and a tool belt, holding a glowing light bulb.";

test("a fresh police_pound_handoff is moved into the journey, then deleted", () => {
  const ts = Date.now() - HOUR;
  const s = device({ police_pound_handoff: JSON.stringify({ idea: SOLO, tier: "medium", subject: "character", cast: ["hero"], mode: "create", ts }) });
  const j = J.get();
  assert.equal(s.getItem("police_pound_handoff"), null);
  assert.equal(j.look.text, SOLO);
  assert.equal(j.look.tier, "medium");
  assert.equal(j.look.subject, "character");
  assert.deepEqual(j.look.cast, ["hero"]);
  assert.equal(j.look.mode, "create");
  assert.equal(j.look.example, false);
  assert.equal(j.look.at, new Date(ts).toISOString());
  assert.equal(j.pick.attempt, SOLO);
  assert.equal(j.pick.attemptIsExample, false);
  assert.equal(j.pick.subject, "character");
  assert.equal(j.pick.tier, "medium");
  assert.deepEqual(j.pick.cast, ["hero"]);
  assert.ok(j.done[1], "ten words of their own had already finished stage 1");
  assert.equal(J.isStarted(), true);
  // it is written, not only held: a second page sees the same
  assert.equal(s.json(KEY).pick.attempt, SOLO);
});

test("a hand-over from Watch or Together arrives marked as an example", () => {
  device({ police_pound_handoff: JSON.stringify({ idea: "A square robot.", tier: "basic", subject: "character", cast: [], mode: "guide", ts: Date.now() - 1000 }) });
  const j = J.get();
  assert.equal(j.look.example, true);
  assert.equal(j.pick.attemptIsExample, true);
  assert.ok(j.done[1]);
});

test("a fresh hand-over with too few words is kept but does not finish stage 1", () => {
  device({ police_pound_handoff: JSON.stringify({ idea: "An owl.", tier: "nonsense", subject: "nonsense", cast: ["nobody"], mode: "create", ts: Date.now() - 1000 }) });
  const j = J.get();
  assert.equal(j.pick.attempt, "An owl.");
  assert.equal(j.done[1], false);
  // values that are not the theme's own are dropped, not trusted
  assert.equal(j.look.tier, null);
  assert.equal(j.look.subject, null);
  assert.deepEqual(j.look.cast, []);
  assert.equal(j.pick.tier, null);
  assert.equal(j.pick.subject, null);
});

test("a stale police_pound_handoff is deleted and not used", () => {
  const s = device({ police_pound_handoff: JSON.stringify({ idea: SOLO, tier: "basic", subject: "character", cast: [], mode: "create", ts: Date.now() - 7 * HOUR }) });
  const j = J.get();
  assert.equal(s.getItem("police_pound_handoff"), null);
  assert.equal(j.look, null);
  assert.equal(j.pick.attempt, "");
  assert.equal(J.isStarted(), false);
  assert.equal(s.getItem(KEY), null);   // nothing was written for it
});

test("a hand-over that cannot be read is deleted, and one never replaces newer work", () => {
  const s = device({ police_pound_handoff: "{broken" });
  assert.equal(J.get().look, null);
  assert.equal(s.getItem("police_pound_handoff"), null);

  const t = device({
    police_pound_handoff: JSON.stringify({ idea: SOLO, tier: "basic", subject: "character", cast: [], mode: "create", ts: Date.now() - 1000 }),
    [KEY]: stored({ pick: { attempt: "My own newer words about the picture." } }),
  });
  assert.equal(J.get().pick.attempt, "My own newer words about the picture.");
  assert.equal(t.getItem("police_pound_handoff"), null);
});

test("the migration also runs when the first call is save()", () => {
  const s = device({ police_pound_handoff: JSON.stringify({ idea: SOLO, tier: "basic", subject: "character", cast: [], mode: "create", ts: Date.now() - 1000 }) });
  const j = J.save({ pick: { idea: "Nettle on the moon" } });
  assert.equal(j.pick.attempt, SOLO);
  assert.equal(j.pick.idea, "Nettle on the moon");
  assert.equal(s.getItem("police_pound_handoff"), null);
});

test("storage that throws never breaks a page: the journey is remembered while the page is open", () => {
  J._setStorage({
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("full"); },
    removeItem() { throw new Error("blocked"); },
  });
  assert.equal(J.get().stage, 1);
  assert.equal(J.save({ pick: { idea: "still works" } }).pick.idea, "still works");
  assert.equal(J.get().pick.idea, "still works");
  J._setStorage(null);
});

// The trail's rules, without a page. journey(...) is a journey with the given stages done.
const journey = (...done) => ({ done: Object.fromEntries([1, 2, 3, 4, 5].map((n) => [n, done.includes(n) ? "x" : false])) });
const classes = (v) => v.stages.map((s) => s.cls);
const said = (v) => v.stages.map((s) => s.said);

test("the trail: done, current and locked are each a class and words", () => {
  const v = J._trail(journey(1), 2, "colours");
  assert.deepEqual(v.now, { n: 2, name: "Choose and describe", next: false });
  assert.deepEqual(classes(v), ["is-done", "is-current", "is-locked", "is-locked", "is-locked"]);
  assert.deepEqual(said(v), [" (done)", " (you are here)", " (locked: finish step 2 first)", " (locked: finish step 2 first)", " (locked: finish step 2 first)"]);
  assert.deepEqual(v.stages.map((s) => s.locked), [false, false, true, true, true]);
  assert.deepEqual(v.stages.map((s) => s.here), [false, true, false, false, false]);
  assert.equal(v.stages[1].href, J.BASE + "picture/#choose");
  assert.equal(v.ahead, null);
});

test("the trail: going back to a finished stage keeps the way forward open", () => {
  const v = J._trail(journey(1, 2, 3), 2, "who");
  assert.deepEqual(classes(v), ["is-done", "is-done is-current", "is-done", "", "is-locked"]);
  assert.deepEqual(said(v), [" (done)", " (done, you are here)", " (done)", " (your next step)", " (locked: finish step 4 first)"]);
});

test("the trail: a learner who jumped ahead is shown where they are and what comes next", () => {
  const v = J._trail(journey(1), 5, "page");   // the Comic Maker, opened from the menu
  assert.deepEqual(classes(v), ["is-done", "", "is-locked", "is-locked", "is-current is-ahead"]);
  assert.deepEqual(said(v), [" (done)", " (your next step)", " (locked: finish step 2 first)", " (locked: finish step 2 first)", " (you are here, you jumped ahead)"]);
  assert.equal(v.stages[4].locked, false);     // the page they are on is never drawn as locked
  assert.deepEqual(v.ahead, { words: "Your next step is 2: Choose and describe.", href: J.BASE + "picture/#choose" });
  assert.deepEqual(v.now, { n: 5, name: "Build and share", next: false });
});

test("the trail: with everything done nothing is locked", () => {
  const v = J._trail(journey(1, 2, 3, 4, 5), 5, "share");
  assert.deepEqual(classes(v), ["is-done", "is-done", "is-done", "is-done", "is-done is-current"]);
  assert.equal(v.ahead, null);
});

test("the trail: on a page with no stage it points at the next step and marks nothing as current", () => {
  const v = J._trail(journey(1, 2), undefined, undefined);
  assert.deepEqual(v.now, { n: 3, name: "Create with AI", next: true });
  assert.deepEqual(classes(v), ["is-done", "is-done", "", "is-locked", "is-locked"]);
  assert.deepEqual(v.subs, []);
});

test("the trail's small steps: earlier ones are done, with no substep none is marked, and stage 1 marks only the current one", () => {
  const two = J._trail(journey(1), 2, "level").subs;
  assert.deepEqual(two.map((s) => s.id), ["who", "colours", "level", "words", "brief"]);
  assert.deepEqual(two.map((s) => s.cls), ["is-done", "is-done", "is-current", "", ""]);
  assert.deepEqual(two.map((s) => s.said), [" (done)", " (done)", "", "", ""]);
  assert.deepEqual(two.map((s) => s.here), [false, false, true, false, false]);

  assert.deepEqual(J._trail(journey(1), 2, undefined).subs.map((s) => s.cls), ["", "", "", "", ""]);
  assert.deepEqual(J._trail(journey(1), 2, "nonsense").subs.map((s) => s.cls), ["", "", "", "", ""]);

  const one = J._trail(journey(), 1, "solo").subs;
  assert.deepEqual(one.map((s) => s.label), ["Watch", "Together", "Your turn", "Send it on"]);
  assert.deepEqual(one.map((s) => s.cls), ["", "", "is-current", ""]);
  assert.deepEqual(one.map((s) => s.said), ["", "", "", ""]);
});

test("small helpers: tierRank, words, esc", () => {
  assert.deepEqual(["basic", "medium", "advanced", "expert", undefined].map(J.tierRank), [1, 2, 3, 0, 0]);
  assert.equal(J.words("One, two; three!  four"), 4);
  assert.equal(J.words(""), 0);
  assert.equal(J.words("  "), 0);
  assert.equal(J.esc(`<a href="x" title='y'>Paws & Order</a>`), "&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;Paws &amp; Order&lt;/a&gt;");
  assert.equal(J.esc(null), "");
});

test("the page-only functions do nothing, and do not throw, when there is no page", async () => {
  device();
  assert.doesNotThrow(() => J.mount({ page: "home" }));
  assert.doesNotThrow(() => J.announce("hello"));
  assert.doesNotThrow(() => J.scrollTo(null));
  assert.doesNotThrow(() => J.focusHeading(null));
  assert.equal(await J.confirmReset({ who: "learner" }), false);
  assert.equal(await J.copy("words"), false);
});

test("the picture page's extra keys are capped, and are not in a blank journey", () => {
  device();
  assert.equal("redo" in J.get(), false);
  assert.equal("notes" in J.get().check, false);
  J.save({ redo: { text: "x".repeat(5000), index: 1, at: "2026-10-02T09:00:00.000Z" }, check: { notes: "n".repeat(400) },
    helper: { anchor: "", prompts: ["One."], sig: "abc" } });
  const j = J.get();
  assert.equal(j.redo.text.length, 4000);
  assert.equal(j.redo.index, 1);
  assert.equal(j.check.notes.length, 300);
  assert.equal(j.helper.sig, "abc");
  // anything that is not a record counts as no second go; null clears it
  assert.equal(J.save({ redo: "again" }).redo, null);
  assert.equal(J.save({ redo: null }).redo, null);
  // a new check starts with no notes
  assert.equal("notes" in J.save({ check: null }).check, false);
});

test("scrollTo passes a jump on as a jump, and glides or not otherwise", () => {
  const seen = [];
  const el = { scrollIntoView: (o) => seen.push(o.behavior) };
  J.scrollTo(el, { behavior: "instant" });
  J.scrollTo(el, { behavior: "auto" });
  J.scrollTo(el);
  assert.deepEqual(seen, ["instant", "auto", "smooth"]);
});
