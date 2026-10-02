// Run with: node --test paws-api/*.test.mjs
// The same statements once more, through the sqlite3 command-line tool: workshops.sql as a
// file, then the charge, the end and the sweep exactly as vault.mjs spells them, with their
// numbered parameters. D1 is SQLite, so this is the nearest thing to the live database that
// can be run without touching it. Skipped on a machine with no sqlite3.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { SQL } from "./vault.mjs";

const found = spawnSync("sqlite3", ["-version"], { encoding: "utf8" });
const skip = found.error || found.status !== 0 ? "no sqlite3 command on this machine" : false;

// One run of the tool: workshops.sql, then each step's lines. ".parameter set" binds ?1, ?2...
function run(lines) {
  const script = [".bail on", ".read " + fileURLToPath(new URL("./workshops.sql", import.meta.url)), ".parameter init", ...lines].join("\n") + "\n";
  const out = spawnSync("sqlite3", ["-batch", ":memory:"], { input: script, encoding: "utf8" });
  assert.equal(out.status, 0, out.stderr);
  assert.equal(out.stderr, "");
  return out.stdout.trim().split("\n");
}
const bind = (...values) => values.map((v, i) => `.parameter set ?${i + 1} "${typeof v === "number" ? v : "'" + v + "'"}"`);
const add = (id, expires, cap, extra = "") =>
  `INSERT INTO paws_workshops (id, level, platform, provider, model, salt, iv, ct, manage, created, expires, ended, uses, cap, last_day) VALUES ('${id}', 2, NULL, 'anthropic', 'm', 's', 'i', 'c', 'h', '2026-10-01T00:00:00.000Z', '${expires}', NULL, 0, ${cap}, NULL)${extra};`;
const CHANGES = "SELECT 'changes=' || changes();";

test("workshops.sql makes the table, and can be run twice", { skip }, () => {
  const lines = run([
    ".read " + fileURLToPath(new URL("./workshops.sql", import.meta.url)),
    "SELECT name FROM sqlite_master WHERE type IN ('table', 'index') AND name LIKE 'paws_%' ORDER BY name;",
    "SELECT COUNT(*) FROM pragma_table_info('paws_workshops');",
    SQL.probe + ";",
    "SELECT 'probe ran';",
  ]);
  assert.deepEqual(lines, ["paws_workshops", "paws_workshops_created", "15", "probe ran"]);
});

test("the charge statement in real SQLite: up to the cap, then nothing, then a new day", { skip }, () => {
  const charge = (today, now) => [...bind(today, "w1", now), SQL.charge + ";", CHANGES];
  const lines = run([
    add("w1", "2026-10-08T00:00:00.000Z", 2),
    ...charge("2026-10-05", "2026-10-05T10:00:00.000Z"),
    ...charge("2026-10-05", "2026-10-05T10:00:01.000Z"),
    ...charge("2026-10-05", "2026-10-05T10:00:02.000Z"),
    "SELECT uses || ' on ' || last_day FROM paws_workshops;",
    ...charge("2026-10-06", "2026-10-06T00:00:00.000Z"),
    "SELECT uses || ' on ' || last_day FROM paws_workshops;",
    ...charge("2026-10-08", "2026-10-08T00:00:00.000Z"),   // the moment it expires: too late
    "SELECT uses || ' on ' || last_day FROM paws_workshops;",
  ]);
  assert.deepEqual(lines, ["changes=1", "changes=1", "changes=0", "2 on 2026-10-05", "changes=1", "1 on 2026-10-06", "changes=0", "1 on 2026-10-06"]);
});

test("insert, read, end, level and count in real SQLite", { skip }, () => {
  const lines = run([
    ...bind("w1", 3, "gemini", "google", "gemini-2.5-flash", "c2FsdA==", "aXY=", "Y3Q=", "hash", "2026-10-05T10:00:00.000Z", "2026-10-12T10:00:00.000Z", 600),
    SQL.insert + ";", CHANGES,
    SQL.insert + ";", CHANGES,                                // the same id again: ignored, not an error
    ...bind("w1"), SQL.read + ";",
    ...bind("2026-10-05T00:00:00.000Z"), SQL.madeSince + ";",
    ...bind(1, "w1", "2026-10-06T00:00:00.000Z"), SQL.level + ";", CHANGES,
    ...bind("2026-10-06T09:00:00.000Z", "w1"), SQL.end + ";", CHANGES,
    SQL.end + ";", CHANGES,                                   // ended already: the first time stands
    ...bind(3, "w1", "2026-10-06T10:00:00.000Z"), SQL.level + ";", CHANGES,
    ...bind("2026-10-06", "w1", "2026-10-06T10:00:00.000Z"), SQL.charge + ";", CHANGES,
    "SELECT level, salt IS NULL, iv IS NULL, ct IS NULL, ended, uses FROM paws_workshops;",
  ]);
  assert.deepEqual(lines, [
    "changes=1", "changes=0",
    "w1|3|gemini|google|gemini-2.5-flash|c2FsdA==|aXY=|Y3Q=|hash|2026-10-05T10:00:00.000Z|2026-10-12T10:00:00.000Z||0|600|",
    "1", "changes=1", "changes=1", "changes=0", "changes=0", "changes=0",
    "1|1|1|1|2026-10-06T09:00:00.000Z|0",
  ]);
});

test("the sweep statements in real SQLite", { skip }, () => {
  const lines = run([
    add("open", "2026-12-01T00:00:00.000Z", 300),
    add("expired", "2026-10-04T00:00:00.000Z", 300),
    add("long-gone", "2026-09-01T00:00:00.000Z", 300),
    add("ended", "2026-12-01T00:00:00.000Z", 300),
    "UPDATE paws_workshops SET ended = '2026-10-03T00:00:00.000Z' WHERE id = 'ended';",
    add("ended-long-ago", "2026-12-01T00:00:00.000Z", 300),
    "UPDATE paws_workshops SET ended = '2026-08-01T00:00:00.000Z' WHERE id = 'ended-long-ago';",
    ...bind("2026-10-05T10:00:00.000Z"), SQL.wipe + ";", CHANGES,
    ...bind("2026-09-05T10:00:00.000Z"), SQL.purge + ";", CHANGES,
    "SELECT id || ':' || COALESCE(ct, 'erased') FROM paws_workshops ORDER BY id;",
  ]);
  assert.deepEqual(lines, ["changes=4", "changes=2", "ended:erased", "expired:erased", "open:c"]);
});
