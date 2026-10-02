// Run with: node --test paws-api/*.test.mjs
// worker.js imports the Paws modules, so one of them failing while it loads would take the
// whole Worker down: the static site and The Precinct with it. A Worker has no window and
// no page, and may not draw random numbers, start timers or fetch while it starts up.
// So: load worker.js in a fresh node with every one of those booby-trapped.
// (This cannot see everything a real Worker start-up would refuse: before a deploy, also
// load a dry-run bundle in workerd, as the contract's section 8.3 says.)
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const here = (path) => fileURLToPath(new URL(path, import.meta.url));

const TRAPS = `
const boom = (name) => () => { throw new Error("touched " + name + " while loading"); };
for (const name of ["window", "document", "localStorage", "sessionStorage", "location", "navigator", "caches"]) {
  Object.defineProperty(globalThis, name, { configurable: true, get: boom(name) });
}
globalThis.fetch = boom("fetch");
globalThis.setTimeout = boom("setTimeout");
globalThis.setInterval = boom("setInterval");
crypto.getRandomValues = boom("crypto.getRandomValues");
crypto.randomUUID = boom("crypto.randomUUID");
for (const k of ["digest", "sign", "encrypt", "decrypt", "importKey", "deriveBits", "deriveKey"]) crypto.subtle[k] = boom("crypto.subtle." + k);
Math.random = boom("Math.random");
`;

test("worker.js and every Paws module it imports load with no page, no timers and no randomness", () => {
  const script = TRAPS + `
const worker = (await import(${JSON.stringify(here("../worker.js"))})).default;
const api = await import(${JSON.stringify(here("./api.mjs"))});
if (typeof worker.fetch !== "function" || typeof worker.scheduled !== "function") throw new Error("worker.js lost a handler");
if (typeof api.handlePaws !== "function" || typeof api.sweepPaws !== "function" || api.PAWS_API !== "/paws-and-order/api/") throw new Error("api.mjs exports changed");
process.stdout.write("loaded");
`;
  const out = spawnSync(process.execPath, ["--input-type=module", "-e", script], { encoding: "utf8" });
  assert.equal(out.stdout, "loaded", out.stderr);
  assert.equal(out.status, 0);
});

test("no Worker-side module leans on its own address", () => {
  // import.meta.url is undefined in a Worker: new URL('./x', import.meta.url) throws there.
  for (const file of ["./api.mjs", "./vault.mjs", "./words.mjs", "../paws-and-order/ai.js", "../paws-and-order/copycheck.js"]) {
    assert.ok(!readFileSync(here(file), "utf8").includes("import.meta"), file);
  }
  // theme.js has one use, and it is guarded.
  const uses = readFileSync(here("../paws-and-order/theme.js"), "utf8").split("\n").filter((l) => l.includes("import.meta"));
  assert.equal(uses.length, 1);
  assert.match(uses[0], /typeof import\.meta\.url === 'string' \? new URL\('\.\/img\/', import\.meta\.url\)\.href : '\/paws-and-order\/img\/'/);
});

test("the Worker imports nothing a browser page is built from, except the helper's own rules", () => {
  const imports = (file) => [...readFileSync(here(file), "utf8").matchAll(/^import [^;]*? from ["'](.+)["'];$/gm)].map((m) => m[1]);
  assert.deepEqual(imports("./api.mjs"), ["../paws-and-order/theme.js", "../paws-and-order/ai.js", "./vault.mjs"]);
  assert.deepEqual(imports("./vault.mjs"), ["./words.mjs"]);
  assert.deepEqual(imports("./words.mjs"), []);
  assert.deepEqual(imports("../paws-and-order/ai.js"), ["./theme.js", "./copycheck.js"]);
  assert.deepEqual(imports("../paws-and-order/copycheck.js"), []);
  assert.deepEqual(imports("../paws-and-order/theme.js"), []);
  // The three edits to worker.js, and nothing of Paws anywhere else in it.
  const worker = readFileSync(here("../worker.js"), "utf8");
  assert.equal(worker.match(/paws|Paws|PAWS/g).length, 10);
  assert.ok(worker.includes('import { PAWS_API, handlePaws, sweepPaws } from "./paws-api/api.mjs";'));
  assert.ok(worker.indexOf("if (url.pathname.startsWith(PAWS_API)) return handlePaws(request, env, ctx);") < worker.indexOf("if (url.pathname.startsWith(API)) {"));
  assert.ok(worker.includes("async scheduled(event, env, ctx) { ctx.waitUntil(sweepPaws(env)); },"));
});

test("the deploy leaves paws-api out of the site's files, and sends its routes to the Worker", () => {
  const ignore = readFileSync(here("../.assetsignore"), "utf8").split("\n");
  assert.ok(ignore.includes("paws-api"));
  assert.ok(ignore.includes("paws-and-order/dev"));
  // wrangler.jsonc has comments, so it is read as text.
  const wrangler = readFileSync(here("../wrangler.jsonc"), "utf8");
  assert.match(wrangler, /"run_worker_first": \["\/the-precinct\/api\/\*", "\/paws-and-order\/api\/\*"\]/);
  assert.match(wrangler, /"triggers": \{ "crons": \["17 3 \* \* \*"\] \}/);
  assert.match(wrangler, /"PAWS_SESSION_CAP": "40"/);
  const want = { PAWS_SESSION_LIMIT: [4111, 8], PAWS_IP_LIMIT: [4112, 120], PAWS_CODE_CHECKS: [4113, 12], PAWS_CODE_IP: [4114, 600], PAWS_SETUP_IP: [4115, 5], PAWS_MANAGE_IP: [4116, 60] };
  for (const [name, [ns, limit]] of Object.entries(want)) {
    assert.ok(wrangler.includes(`{ "name": "${name}", "namespace_id": "${ns}", "simple": { "limit": ${limit}, "period": 60 } }`), name);
  }
  // The Precinct's own entries are as they were.
  for (const line of ['{ "name": "PRECINCT_SESSION_LIMIT", "namespace_id": "4101", "simple": { "limit": 8, "period": 60 } }', '"SESSION_CAP": "30"', '"database_name": "precinct-usage"']) assert.ok(wrangler.includes(line), line);
  // It still parses once the comments are taken out.
  const parsed = JSON.parse(wrangler.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n"));
  assert.equal(parsed.ratelimits.length, 11);
  assert.equal(new Set(parsed.ratelimits.map((r) => r.namespace_id)).size, 11, "no two limiters share a counter");
  assert.equal(parsed.main, "worker.js");
});
