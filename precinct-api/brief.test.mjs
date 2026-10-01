// Run with: node --test precinct-api/*.test.mjs
// What the desk does with a brief the AI wrote badly: a live run on 1 Oct 2026
// came back with a stray note in the prompt list and "[ANCHOR]" on each prompt.
import { test } from "node:test";
import assert from "node:assert/strict";
import worker from "../worker.js";
import { cleanBrief, TIMEOUT_MS } from "../the-precinct/desk.js";

const SHOT1 = "Shot one: she sits in a booth beside the tall windows, glancing back at the door.";
const SHOT2 = "Shot two: same booth, a few minutes later, she is writing in the notebook.";

test("a stray note is dropped and [ANCHOR] is taken off", () => {
  const b = cleanBrief({ anchor: "  the anchor  ", prompts: ["[ANCHOR] " + SHOT1, "prompts_note_ignore", "[Anchor]: " + SHOT2], why_this_works: "w" }, "medium");
  assert.deepEqual(b.prompts, [SHOT1, SHOT2]);
  assert.equal(b.anchor, "the anchor");
  assert.equal(b.why_this_works, "w");
});

test("basic keeps one prompt, medium two, advanced all of them", () => {
  const four = [SHOT1, SHOT2, SHOT1 + " Again.", SHOT2 + " Again."];
  assert.equal(cleanBrief({ prompts: four }, "basic").prompts.length, 1);
  assert.equal(cleanBrief({ prompts: four }, "medium").prompts.length, 2);
  assert.equal(cleanBrief({ prompts: four }, "advanced").prompts.length, 4);
});

test("a reply that is not a brief gives no prompts, and never throws", () => {
  for (const bad of [null, undefined, "text", {}, { prompts: "one" }, { prompts: [1, null, {}, ""] }]) {
    assert.deepEqual(cleanBrief(bad, "basic").prompts, []);
  }
});

test("the Worker sends the tidied brief, or a stock one when nothing usable came back", async () => {
  let prompts;
  globalThis.fetch = async () => new Response(JSON.stringify({ stop_reason: "end_turn",
    content: [{ type: "text", text: JSON.stringify({ anchor: "A", prompts, why_this_works: "w", platform_notes: "n", watch_for: "f" }) }] }));
  const ask = async () => {
    const res = await worker.fetch(new Request("https://x/the-precinct/api/brief", { method: "POST", body: JSON.stringify({
      code: "harness-code-77", session: "harness-0002", platform: "gemini", tier: "medium", subject: "character", palette: "yellow", cast: ["reporter"],
      place: "ziggurat", idea: "Hattie keeping watch", round: 2,
      attempt: "A woman in a wide black hat and a pale trench coat glances back, a notebook in her gloved hand, night, hard light.",
    }) }), { WORKSHOP_CODE: "harness-code-77", ANTHROPIC_API_KEY: "k" }, { waitUntil() {} });
    return res.json();
  };
  prompts = ["[ANCHOR] " + SHOT1, "prompts_note_ignore", "[ANCHOR] " + SHOT2];
  let d = await ask();
  assert.deepEqual(d.prompts, [SHOT1, SHOT2]);
  assert.ok(!d.fallback);
  prompts = ["prompts_note_ignore"];
  d = await ask();
  assert.ok(d.fallback);
  assert.equal(d.prompts.length, 2);
});

test("the brief has room to finish after the gate", () => {
  assert.ok(TIMEOUT_MS.brief - TIMEOUT_MS.gate >= 25000);
});
