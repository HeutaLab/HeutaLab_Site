// Run with: node --test paws-api/*.test.mjs
// Codes, fingerprints, the lock on the teacher's key, and the table's statements.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fakeD1, VAULT_KEY } from "./harness.mjs";
import {
  CODE_SHAPE, normalise, randomBelow, makeCode, vaultKeys, codeId, sha256Hex, sameHex, makeManageToken, seal, unseal,
  isoOf, dayOf, SQL, tableReady, readRow, insertRow, madeSince, charge, endRow, setLevel, sweep,
} from "./vault.mjs";
import { WORDS } from "./words.mjs";

const OTHER_KEY = Buffer.alloc(32, 9).toString("base64");

test("normalise gives one spelling for every way a code gets typed", () => {
  const same = ["maple-otter-kite-47", "MAPLE-OTTER-KITE-47", "Maple Otter Kite 47", "  maple  otter   kite 47  ", "maple.otter.kite.47", "maple, otter, kite, 47",
    "maple_otter_kite_47", "maple–otter—kite‐47", "maple otter kite47", "maple-otter-kite-４７", "Ｍａｐｌｅ otter kite 47", "--maple--otter--kite--47--", "maple\totter\nkite 47", "maple/otter\\kite#47!"];
  for (const typed of same) assert.equal(normalise(typed), "maple-otter-kite-47", JSON.stringify(typed));
  assert.equal(normalise("47maple"), "47-maple");
  assert.equal(normalise("a1b2"), "a-1-b-2");
  for (const not of [null, undefined, 7, true, {}, [], ["maple-otter-kite-47"], "", "   ", "---", "x".repeat(201)]) assert.equal(normalise(not), "", JSON.stringify(not));
  assert.equal(normalise("a".repeat(61)), "", "longer than 60 once tidied");
  assert.equal(normalise("a".repeat(60)).length, 60);
});

test("only word-word-word-NN is a code", () => {
  for (const ok of ["maple-otter-kite-47", "a-b-c-10", "zip-zap-zing-99"]) assert.ok(CODE_SHAPE.test(ok), ok);
  // Not a code as typed, and still not one once tidied.
  for (const no of ["", "maple-otter-kite", "maple-otter-kite-4", "maple-otter-kite-470", "maple-otter-47", "maple-otter-kite-dog-47", "maple-otter-kite-4x", "m4ple-otter-kite-47",
    "café-otter-kite-47", "maple-otter-kite-٤٧", "constructor", "__proto__", "toString", "47-maple-otter-kite"]) {
    assert.ok(!CODE_SHAPE.test(no), no);
    assert.ok(!CODE_SHAPE.test(normalise(no)), no);
  }
  // Only the tidied spelling is ever tested against the shape.
  for (const untidy of ["maple--otter-kite-47", "-maple-otter-kite-47", "Maple-Otter-Kite-47", "maple-otter-kite-47\n"]) {
    assert.ok(!CODE_SHAPE.test(untidy), untidy);
    assert.ok(CODE_SHAPE.test(normalise(untidy)), untidy);
  }
});

test("codes are drawn evenly, from the list, with a number from 10 to 99", () => {
  const seenWords = new Set(), seenNumbers = new Set();
  for (let i = 0; i < 4000; i++) {
    const code = makeCode();
    assert.match(code, CODE_SHAPE);
    assert.equal(normalise(code), code);
    const parts = code.split("-");
    for (const w of parts.slice(0, 3)) { assert.ok(WORDS.includes(w), w); seenWords.add(w); }
    const n = Number(parts[3]);
    assert.ok(n >= 10 && n <= 99, code);
    seenNumbers.add(n);
  }
  assert.equal(seenNumbers.size, 90, "every number turns up");
  assert.ok(seenWords.size > WORDS.length * 0.95, "nearly every word turns up in 12,000 draws");

  // No remainder bias: a draw from the uneven top of the 32-bit range is thrown away.
  const real = crypto.getRandomValues;
  const feed = [0xffffffff, 0xfffffffe, 5];
  let asked = 0;
  crypto.getRandomValues = (arr) => { arr[0] = feed[asked++]; return arr; };
  try {
    // For n = 3 the even part of the range ends at 4294967295 (0xffffffff itself is the odd one out).
    assert.equal(randomBelow(3), 0xfffffffe % 3);
    assert.equal(asked, 2, "the first draw was rejected");
    asked = 2;
    assert.equal(randomBelow(90), 5);
  } finally {
    crypto.getRandomValues = real;
  }
  for (let i = 0; i < 2000; i++) { const v = randomBelow(7); assert.ok(Number.isInteger(v) && v >= 0 && v < 7); }
});

test("three words and a number give at least 2^34 codes", () => {
  assert.ok(WORDS.length >= 600);
  assert.ok(WORDS.length ** 3 * 90 >= 2 ** 34);
});

test("the vault secret must be exactly 32 bytes of base64", async () => {
  for (const bad of [undefined, null, "", 7, {}, "short", "!!!not base64!!!", Buffer.alloc(31).toString("base64"), Buffer.alloc(33).toString("base64"), Buffer.alloc(64).toString("base64"), Buffer.alloc(32).toString("hex")]) {
    assert.equal(await vaultKeys(bad), null, String(bad));
  }
  const keys = await vaultKeys(VAULT_KEY);
  assert.ok(keys && keys.id && keys.enc);
  assert.equal(await vaultKeys(VAULT_KEY), keys, "derived once for the same secret");
  assert.ok(await vaultKeys(VAULT_KEY + "\n"), "a trailing newline from a piped secret is fine");
  // The working keys cannot be read back out.
  assert.equal(keys.id.extractable, false);
  assert.equal(keys.enc.extractable, false);
});

test("a code's id is a keyed fingerprint: steady, and useless without the secret", async () => {
  const keys = await vaultKeys(VAULT_KEY), other = await vaultKeys(OTHER_KEY);
  const id = await codeId(keys, "maple-otter-kite-47");
  assert.match(id, /^[0-9a-f]{64}$/);
  assert.equal(await codeId(await vaultKeys(VAULT_KEY), "maple-otter-kite-47"), id);
  assert.notEqual(await codeId(keys, "maple-otter-kite-48"), id);
  assert.notEqual(await codeId(other, "maple-otter-kite-47"), id);
  assert.notEqual(await sha256Hex("maple-otter-kite-47"), id, "not a plain hash anyone could recompute");
  assert.equal(await sha256Hex("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});

test("the teacher's key locks and unlocks, and opens for nothing else", async () => {
  const keys = await vaultKeys(VAULT_KEY);
  const code = "maple-otter-kite-47", id = await codeId(keys, code), apiKey = "sk-live-" + "k".repeat(60);
  const a = await seal(keys, code, id, "openai", apiKey);
  const b = await seal(keys, code, id, "openai", apiKey);
  assert.equal(Buffer.from(a.salt, "base64").length, 16);
  assert.equal(Buffer.from(a.iv, "base64").length, 12);
  assert.ok(a.salt !== b.salt && a.iv !== b.iv && a.ct !== b.ct, "fresh salt and iv every time");
  assert.ok(!JSON.stringify(a).includes(apiKey) && !Buffer.from(a.ct, "base64").toString("latin1").includes("sk-live"));

  const row = { id, provider: "openai", ...a };
  assert.equal(await unseal(keys, code, row), apiKey);
  for (const k of ["x".repeat(20), "é".repeat(20), "~!@#$%^&*()_+{}|:<>?".repeat(15)]) {
    assert.equal(await unseal(keys, code, { id, provider: "google", ...(await seal(keys, code, id, "google", k)) }), k);
  }

  // Bound to its provider and its row: change either and it will not open.
  assert.equal(await unseal(keys, code, { ...row, provider: "anthropic" }), null, "provider changed");
  assert.equal(await unseal(keys, code, { ...row, provider: "custom" }), null);
  assert.equal(await unseal(keys, code, { ...row, id: await codeId(keys, "maple-otter-kite-48") }), null, "moved to another row");
  // Needs the code itself, and the same vault secret.
  assert.equal(await unseal(keys, "maple-otter-kite-48", row), null, "another code");
  assert.equal(await unseal(await vaultKeys(OTHER_KEY), code, row), null, "another vault secret");
  // Any damage is noticed.
  const flip = (b64) => { const raw = Buffer.from(b64, "base64"); raw[0] ^= 1; return raw.toString("base64"); };
  assert.equal(await unseal(keys, code, { ...row, ct: flip(row.ct) }), null);
  assert.equal(await unseal(keys, code, { ...row, iv: flip(row.iv) }), null);
  assert.equal(await unseal(keys, code, { ...row, salt: flip(row.salt) }), null);
  assert.equal(await unseal(keys, code, { ...row, ct: b.ct }), null, "another row's ciphertext");
  for (const broken of [{ ...row, ct: null }, { ...row, salt: null }, { ...row, iv: "AAAA" }, { ...row, ct: "!!!" }, { ...row, ct: "" }, {}]) {
    assert.equal(await unseal(keys, code, broken), null);
  }
});

test("fingerprints are compared whole, and manage tokens are 128 random bits", () => {
  assert.equal(sameHex("abcd", "abcd"), true);
  for (const [a, b] of [["abcd", "abce"], ["abcd", "abc"], ["", "a"], [null, null], [undefined, "a"], [7, 7], ["abcd", ["abcd"]]]) assert.equal(sameHex(a, b), false);
  assert.equal(sameHex("", ""), true);
  const tokens = new Set(Array.from({ length: 500 }, makeManageToken));
  assert.equal(tokens.size, 500);
  for (const t of tokens) assert.match(t, /^[0-9a-f]{32}$/);
});

// ---------- the table (real SQLite, the statements from vault.mjs) ----------

const NOW = Date.parse("2026-10-05T10:00:00Z");
const rowOf = (over = {}) => ({ id: "id-1", level: 2, platform: null, provider: "anthropic", model: "m", salt: "s", iv: "i", ct: "c", manage: "h",
  created: isoOf(NOW), expires: isoOf(NOW + 7 * 86400000), cap: 3, ...over });

test("a missing table is noticed; rows go in once and read back whole", async () => {
  await assert.rejects(() => tableReady(fakeD1({ table: false })));
  const db = fakeD1();
  assert.equal(await tableReady(db), null, "an empty table is still a table");
  assert.equal(await readRow(db, "id-1"), null);
  assert.equal(await insertRow(db, rowOf()), true);
  assert.equal(await insertRow(db, rowOf({ level: 3 })), false, "the same id again changes nothing");
  assert.deepEqual({ ...(await readRow(db, "id-1")) }, { id: "id-1", level: 2, platform: null, provider: "anthropic", model: "m", salt: "s", iv: "i", ct: "c", manage: "h",
    created: "2026-10-05T10:00:00.000Z", expires: "2026-10-12T10:00:00.000Z", ended: null, uses: 0, cap: 3, last_day: null });
  assert.ok((await tableReady(db)).ok === 1);
  // A row with something missing is an error, not a silent skip.
  await assert.rejects(() => insertRow(db, rowOf({ id: "id-2", provider: null })));

  assert.equal(await madeSince(db, "2026-10-05T00:00:00.000Z"), 1);
  assert.equal(await madeSince(db, "2026-10-05T10:00:00.001Z"), 0);
  assert.equal(dayOf(NOW), "2026-10-05");
  assert.equal(dayOf(Date.parse("2026-10-05T23:59:59.999Z")), "2026-10-05");
  assert.equal(dayOf(Date.parse("2026-10-06T00:00:00.000Z")), "2026-10-06");
});

test("the charge: one unit at a time, never past the cap, afresh each UTC day", async () => {
  const db = fakeD1();
  await insertRow(db, rowOf());
  const state = async () => { const r = await readRow(db, "id-1"); return [r.uses, r.last_day]; };

  assert.equal(await charge(db, "id-1", NOW), true);        // the first ever: last_day was NULL
  assert.deepEqual(await state(), [1, "2026-10-05"]);
  assert.equal(await charge(db, "id-1", NOW + 1000), true);
  assert.equal(await charge(db, "id-1", NOW + 2000), true);
  assert.equal(await charge(db, "id-1", NOW + 3000), false, "the cap of 3 is reached");
  assert.equal(await charge(db, "id-1", Date.parse("2026-10-05T23:59:59Z")), false);
  assert.deepEqual(await state(), [3, "2026-10-05"]);
  assert.equal(await charge(db, "id-1", Date.parse("2026-10-06T00:00:00Z")), true, "midnight UTC");
  assert.deepEqual(await state(), [1, "2026-10-06"]);

  assert.equal(await charge(db, "no-such-id", NOW), false);
  // Thirty requests landing together on a cap of 3: exactly three get through.
  await insertRow(db, rowOf({ id: "id-2" }));
  const results = await Promise.all(Array.from({ length: 30 }, () => charge(db, "id-2", NOW)));
  assert.equal(results.filter(Boolean).length, 3);

  // Expired, ended, or with its key already erased: nothing is taken.
  await insertRow(db, rowOf({ id: "id-3", expires: isoOf(NOW) }));
  assert.equal(await charge(db, "id-3", NOW), false, "expires at this very moment");
  assert.equal(await charge(db, "id-3", NOW - 1), true);
  await insertRow(db, rowOf({ id: "id-4" }));
  await endRow(db, "id-4", NOW);
  assert.equal(await charge(db, "id-4", NOW), false);
  await insertRow(db, rowOf({ id: "id-5", ct: null }));
  assert.equal(await charge(db, "id-5", NOW), false);
});

test("ending erases the key at once; the level can change only while a workshop is open", async () => {
  const db = fakeD1();
  await insertRow(db, rowOf());
  assert.equal(await setLevel(db, "id-1", 3, NOW), true);
  assert.equal((await readRow(db, "id-1")).level, 3);
  assert.equal(await setLevel(db, "id-1", 1, NOW + 8 * 86400000), false, "after it ran out");
  await endRow(db, "id-1", NOW + 5000);
  const r = await readRow(db, "id-1");
  assert.deepEqual([r.salt, r.iv, r.ct, r.ended], [null, null, null, "2026-10-05T10:00:05.000Z"]);
  await endRow(db, "id-1", NOW + 9000);
  assert.equal((await readRow(db, "id-1")).ended, "2026-10-05T10:00:05.000Z", "the first ending stands");
  assert.equal(await setLevel(db, "id-1", 2, NOW + 6000), false);
  assert.equal((await readRow(db, "id-1")).level, 3);
});

test("the sweep statements: erase the keys of the finished, remove rows 30 days later", async () => {
  const db = fakeD1();
  await insertRow(db, rowOf({ id: "open" }));
  await insertRow(db, rowOf({ id: "expired", expires: isoOf(NOW - 1000) }));
  await insertRow(db, rowOf({ id: "just-expired", expires: isoOf(NOW) }));
  await insertRow(db, rowOf({ id: "long-gone", expires: isoOf(NOW - 30 * 86400000) }));
  await insertRow(db, rowOf({ id: "nearly-gone", expires: isoOf(NOW - 30 * 86400000 + 1) }));
  await insertRow(db, rowOf({ id: "ended" }));
  await endRow(db, "ended", NOW - 5000);
  await insertRow(db, rowOf({ id: "ended-long-ago", expires: isoOf(NOW + 86400000) }));
  await endRow(db, "ended-long-ago", NOW - 31 * 86400000);

  assert.deepEqual(await sweep(db, NOW), { wiped: 4, removed: 2 });
  const left = db.sqlite.prepare("SELECT id, ct FROM paws_workshops ORDER BY id").all().map((r) => [r.id, r.ct]);
  assert.deepEqual(left, [["ended", null], ["expired", null], ["just-expired", null], ["nearly-gone", null], ["open", "c"]]);
  assert.deepEqual(await sweep(db, NOW), { wiped: 0, removed: 0 }, "a second sweep finds nothing to do");
  assert.deepEqual(await sweep(db, NOW + 1), { wiped: 0, removed: 1 });
  // Every statement names the Paws table and no other.
  for (const sql of Object.values(SQL)) assert.match(sql, /\bpaws_workshops\b/);
});
