// Run with: node --test precinct-api/*.test.mjs
// The picked place (The Ziggurat): what the Worker accepts, what it tells the
// AI, and what the stock briefs say when the AI is down. The AI is a stub.
import { test } from "node:test";
import assert from "node:assert/strict";
import worker from "../worker.js";
import { stockBrief } from "../the-precinct/desk.js";

const env = { WORKSHOP_CODE: "harness-code-77", ANTHROPIC_API_KEY: "k" };
let sent = [], aiDown = false;
globalThis.fetch = async (url, init) => {
  const body = JSON.parse(init.body);
  sent.push(body);
  if (aiDown) return new Response(JSON.stringify({ error: { type: "overloaded_error" } }), { status: 529 });
  const out = body.system.startsWith("You are the desk sergeant")
    ? { covered: { see: true, details: true, world: true }, questions: ["a?", "b?"] }
    : { anchor: "A", prompts: ["p1", "p2"], why_this_works: "w", platform_notes: "n", watch_for: "f" };
  return new Response(JSON.stringify({ stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify(out) }] }));
};

async function brief(extra, down = false) {
  sent = [];
  aiDown = down;
  const res = await worker.fetch(new Request("https://x/the-precinct/api/brief", {
    method: "POST",
    body: JSON.stringify({
      code: "harness-code-77", session: "harness-0001", platform: "gemini", tier: "medium", subject: "character", palette: "yellow",
      cast: ["reporter"], idea: "Hattie waiting for someone", round: 2,
      attempt: "A woman in a wide black hat and a pale trench coat glances back, a notebook in her gloved hand, night, hard light.",
      ...extra,
    }),
  }), env, { waitUntil() {} });
  return { status: res.status, data: await res.json(), user: sent.length ? sent.at(-1).messages[0].content : "" };
}

test("a picked place goes to the AI with its fixed look", async () => {
  const r = await brief({ place: "ziggurat" });
  assert.equal(r.status, 200);
  assert.match(r.user, /Place in this picture: The Ziggurat, the café\. Fixed look: a long narrow Art Deco café/);
  assert.ok(sent.at(-1).system.includes("A picked place is where the picture happens"));
});

test("no place is fine: an older page sends none", async () => {
  for (const extra of [{}, { place: null }, { place: "" }]) {
    const r = await brief(extra);
    assert.equal(r.status, 200);
    assert.ok(r.user.includes("Place: none picked"));
  }
});

test("anything that is not a listed place is refused before the AI is called", async () => {
  for (const place of ["constructor", "__proto__", "toString", "bar", 7, {}, ["ziggurat"]]) {
    const r = await brief({ place });
    assert.equal(r.status, 400, JSON.stringify(place));
    assert.equal(r.data.error, "Unknown place");
    assert.equal(sent.length, 0);
  }
});

test("a setting case ignores the place", async () => {
  const r = await brief({ place: "ziggurat", subject: "setting", cast: [] });
  assert.equal(r.status, 200);
  assert.ok(r.user.includes("Place: none picked"));
});

test("with the AI down, the stock brief is set in the place", async () => {
  const medium = (await brief({ place: "ziggurat" }, true)).data;
  assert.ok(medium.fallback && medium.anchor.includes("The setting: a long narrow Art Deco café"));
  assert.equal(medium.prompts.length, 2);

  const basic = (await brief({ place: "ziggurat", tier: "basic" }, true)).data;
  assert.equal(basic.prompts.length, 1);
  assert.equal(basic.anchor, "");
  assert.ok(basic.prompts[0].includes("The setting: a long narrow Art Deco café"));
  assert.doesNotMatch(basic.prompts[0], /reference sheet|Plain pale background/);

  const advanced = (await brief({ place: "ziggurat", tier: "advanced" }, true)).data;
  assert.equal(advanced.prompts.length, 3);

  const none = (await brief({}, true)).data;
  assert.ok(none.prompts[0].includes("wide wooden desk") && !none.anchor.includes("The setting"));
});

test("no stock brief leaves a {token} unfilled", () => {
  for (const tier of ["basic", "medium", "advanced"]) for (const subject of ["character", "setting"]) {
    const b = stockBrief(subject, tier, "yellow", [], subject === "character" ? "ziggurat" : null);
    assert.doesNotMatch(JSON.stringify(b), /\{\w+\}/, subject + " " + tier);
    assert.ok(!("placed" in b));
  }
});
