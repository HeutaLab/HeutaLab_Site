// A live smoke test of the briefing desk with a place chosen. Run it yourself:
//   node precinct-api/live-brief.mjs
// It asks for the workshop code (what you type is hidden, and is never saved or
// printed), checks it, then asks the real desk for three briefs: one per level,
// each with a character and a place. The briefs are printed and saved to
// .claude/mockups/precinct-live/ (not in git, not on the site).
//   node precinct-api/live-brief.mjs --local   runs the same steps against
// worker.js in this folder with a stand-in AI and a made-up code, to test the script.
import readline from "node:readline";
import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import THEME from "../the-precinct/theme.js";

const LOCAL = process.argv.includes("--local");
const BASE = "https://heutalab.com/the-precinct/api/";
const OUT = new URL("../.claude/mockups/precinct-live/", import.meta.url);

const RUNS = [
  { tier: "basic", cast: ["rookie"], place: "docks", idea: "Tommy Doyle waiting by the crates for someone who is late",
    attempt: "A young patrolman in a peaked cap and a dark uniform stands at night, one hand on a rail, glancing aside. Wet ground, one lamp, black and white ink." },
  { tier: "medium", cast: ["reporter"], place: "ziggurat", idea: "Hattie Cole keeping watch on the door from a booth",
    attempt: "A woman in a wide black hat and a pale trench coat glances back over her shoulder, a notebook in her gloved hand. Night, one hard light, black and white ink." },
  { tier: "advanced", cast: ["commissioner", "disillusioned"], place: "commissioners-office", idea: "Vance gives Rourke an order he does not like",
    attempt: "A heavy man in a fedora and a belted trench coat sits behind a wide desk with his fingers steepled. A desk lamp, blinds, a night skyline, black and white ink." },
];

function askHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => { if (!rl.muted) rl.output.write(s); };
    rl.question(question, (answer) => { rl.close(); process.stdout.write("\n"); resolve(answer.trim()); });
    rl.muted = true;
  });
}

// The desk to call: the live one, or worker.js here with a stand-in AI.
async function desk() {
  if (!LOCAL) {
    return (route, body) => fetch(BASE + route, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  }
  const { default: worker } = await import("../worker.js");
  globalThis.fetch = async (url, init) => {
    const sent = JSON.parse(init.body);
    const out = sent.system.startsWith("You are the desk sergeant")
      ? { covered: { see: true, details: true, world: true }, questions: ["a?", "b?"] }
      : { anchor: "stand-in anchor", prompts: ["A stand-in prompt, long enough to count as a real one."], why_this_works: "w", platform_notes: "n", watch_for: "f" };
    return new Response(JSON.stringify({ stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify(out) }] }));
  };
  const env = { WORKSHOP_CODE: "local-test-code-1", ANTHROPIC_API_KEY: "k" };
  return (route, body) => worker.fetch(new Request("https://x/the-precinct/api/" + route, { method: "POST", body: JSON.stringify(body) }), env, { waitUntil() {} });
}

// How much of a fixed look made it into the brief, phrase by phrase.
function lookCheck(text, look) {
  const t = text.toLowerCase(), parts = look.split(", ");
  return { found: parts.filter((p) => t.includes(p.toLowerCase())).length, of: parts.length };
}

const call = await desk();
const code = LOCAL ? "local-test-code-1" : await askHidden("Workshop code (hidden): ");
if (!code) { console.log("No code typed. Nothing sent."); process.exit(1); }
const session = "smoke-" + randomUUID().slice(0, 12);

const check = await call("code", { code, session });
const checked = await check.json().catch(() => ({}));
if (!check.ok) { console.log("The desk said: " + (checked.error || check.status) + " Nothing else was sent."); process.exit(1); }
console.log("Code accepted: level " + checked.level + " (" + checked.name + ").\n");

const results = [];
for (const run of RUNS) {
  const started = Date.now();
  const res = await call("brief", { code, session, platform: "gemini", subject: "character", palette: "yellow", round: 2, ...run });
  const data = await res.json().catch(() => ({}));
  const place = THEME.places.find((p) => p.id === run.place);
  const who = run.cast.map((id) => THEME.cast.find((c) => c.id === id));
  const row = { ...run, status: res.status, seconds: Math.round((Date.now() - started) / 100) / 10, brief: data };
  console.log("== " + run.tier.toUpperCase() + ": " + who.map((c) => c.name).join(" and ") + " at " + place.name + " (" + res.status + ", " + row.seconds + " s)");
  if (!res.ok || !Array.isArray(data.prompts)) {
    console.log("   " + (data.error || "No brief came back.") + "\n");
  } else {
    const text = [data.anchor, ...data.prompts].join("\n");
    row.checks = {
      fromTheFiles: !!data.fallback,
      prompts: data.prompts.length,
      place: lookCheck(text, place.look),
      cast: who.map((c) => ({ id: c.id, ...lookCheck(text, c.look) })),
      namesInPrompt: [place.name, ...who.map((c) => c.name), ...who.map((c) => c.short)].filter((n) => text.includes(n)),
    };
    const c = row.checks;
    console.log("   " + (c.fromTheFiles ? "STOCK BRIEF (the AI did not answer)" : "Written by the AI") + ", " + c.prompts + " prompt(s)");
    console.log("   Place look: " + c.place.found + " of " + c.place.of + " phrases word for word");
    c.cast.forEach((k) => console.log("   " + k.id + " look: " + k.found + " of " + k.of + " phrases word for word"));
    console.log("   Names in the prompt (should be none): " + (c.namesInPrompt.join(", ") || "none"));
    if (data.anchor) console.log("\n   ANCHOR: " + data.anchor);
    data.prompts.forEach((p, i) => console.log("\n   PROMPT " + (i + 1) + ": " + p));
    console.log("\n   WHY: " + data.why_this_works + "\n");
  }
  results.push(row);
}

if (!LOCAL) {
  mkdirSync(OUT, { recursive: true });
  const file = new URL("brief-" + new Date().toISOString().replace(/[:.]/g, "-") + ".json", OUT);
  writeFileSync(file, JSON.stringify(results, null, 1));
  console.log("Saved to " + decodeURIComponent(file.pathname));
}
