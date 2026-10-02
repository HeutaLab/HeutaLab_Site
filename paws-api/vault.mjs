// Paws & Order workshop codes, and the locked store behind them (table paws_workshops, see
// workshops.sql). Worker-only: nothing in this folder is served to a browser.
//
// A teacher makes a code on the Teachers page and hands over an AI key with it. What is kept:
//   - never the code itself, only a fingerprint of it (an HMAC under a key derived from the
//     PAWS_VAULT_KEY secret), which is the row's id;
//   - the AI key, encrypted with AES-256-GCM. The row's encryption key is derived from the
//     vault secret AND the code, so the database alone, or the secret alone, opens nothing.
//     Whoever holds both can open every key: a code is short enough to find by trying them all;
//   - a fingerprint of the manage token that lets the teacher end the workshop.
// Changing PAWS_VAULT_KEY changes every fingerprint, so every code made before stops working
// (they answer "wrong") and the sweep clears the rows away as they expire.

import { WORDS } from "./words.mjs";

// ---------- codes ----------

export const CODE_SHAPE = /^[a-z]+-[a-z]+-[a-z]+-\d{2}$/;

// One spelling for every way a child might type a code: capitals, spaces, dashes, full stops
// or nothing at all between the last word and the number. Anything too long is no code.
export function normalise(code) {
  if (typeof code !== "string" || code.length > 200) return "";
  const out = code.normalize("NFKC").toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/(\p{L})(?=\p{N})/gu, "$1-")
    .replace(/(\p{N})(?=\p{L})/gu, "$1-")
    .replace(/^-+|-+$/g, "");
  return out.length <= 60 ? out : "";
}

// A whole number from 0 to n - 1, every one as likely as the next. A plain remainder would
// make the low numbers slightly likelier, so draws from the uneven top of the range are
// thrown away and drawn again.
export function randomBelow(n) {
  const limit = Math.floor(0x100000000 / n) * n;
  const draw = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(draw);
    if (draw[0] < limit) return draw[0] % n;
  }
}

// word-word-word-NN, NN from 10 to 99 (never a leading zero for a child to drop).
export function makeCode() {
  const word = () => WORDS[randomBelow(WORDS.length)];
  return word() + "-" + word() + "-" + word() + "-" + (10 + randomBelow(90));
}

// ---------- keys and fingerprints ----------

const bytesOf = (text) => new TextEncoder().encode(text);
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
const toBase64 = (bytes) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

// The two working keys, derived once from the secret (HKDF-SHA256, empty salt) and kept for
// as long as the secret stays the same. null if the secret is not 32 bytes of base64.
let derived = { secret: null, keys: null };
export async function vaultKeys(secret) {
  if (typeof secret !== "string" || !secret) return null;
  if (derived.secret === secret) return derived.keys;
  let raw;
  try {
    raw = fromBase64(secret.trim());
  } catch {
    return null;
  }
  if (raw.length !== 32) return null;
  const master = await crypto.subtle.importKey("raw", raw, "HKDF", false, ["deriveBits"]);
  const derive = (info) => crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: new Uint8Array(0), info: bytesOf(info) }, master, 256);
  const keys = {
    id: await crypto.subtle.importKey("raw", await derive("paws-id-v1"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]),
    enc: await crypto.subtle.importKey("raw", await derive("paws-enc-v1"), "HKDF", false, ["deriveKey"]),
  };
  derived = { secret, keys };
  return keys;
}

// The row id for a (normalised) code.
export async function codeId(keys, code) {
  return hex(await crypto.subtle.sign("HMAC", keys.id, bytesOf(code)));
}

export async function sha256Hex(text) {
  return hex(await crypto.subtle.digest("SHA-256", bytesOf(text)));
}

// Compares two fingerprints without stopping at the first difference, so the time taken
// says nothing about how much of a guess was right.
export function sameHex(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// 128 random bits, shown to the teacher once.
export const makeManageToken = () => hex(crypto.getRandomValues(new Uint8Array(16)));

// ---------- locking and unlocking the AI key ----------

const rowKey = (keys, code, salt) => crypto.subtle.deriveKey(
  { name: "HKDF", hash: "SHA-256", salt, info: bytesOf("paws-workshop:" + code) }, keys.enc,
  { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);

// The id and the provider are bound into the lock: move the sealed key to another row, or
// change which service it is sent to, and it will not open.
const boundTo = (id, provider) => bytesOf(id + "|" + provider);

// Done once, when the row is made. A row is never re-encrypted.
export async function seal(keys, code, id, provider, apiKey) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: boundTo(id, provider) }, await rowKey(keys, code, salt), bytesOf(apiKey));
  return { salt: toBase64(salt), iv: toBase64(iv), ct: toBase64(new Uint8Array(ct)) };
}

// The AI key, or null if the row will not open (tampered with, or damaged).
export async function unseal(keys, code, row) {
  try {
    const salt = fromBase64(row.salt), iv = fromBase64(row.iv);
    if (salt.length !== 16 || iv.length !== 12) return null;
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv, additionalData: boundTo(row.id, row.provider) }, await rowKey(keys, code, salt), fromBase64(row.ct));
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}

// ---------- the table ----------

export const isoOf = (ms) => new Date(ms).toISOString();
// Allowances run by the UTC day, the same everywhere.
export const dayOf = (ms) => isoOf(ms).slice(0, 10);
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

// Every statement Paws & Order runs, in one place. Times are ISO strings in UTC, so they
// compare as text. D1 numbers its parameters ?1, ?2, ...
export const SQL = {
  probe: "SELECT 1 AS ok FROM paws_workshops LIMIT 1",
  read: "SELECT id, level, platform, provider, model, salt, iv, ct, manage, created, expires, ended, uses, cap, last_day FROM paws_workshops WHERE id = ?1",
  insert: "INSERT INTO paws_workshops (id, level, platform, provider, model, salt, iv, ct, manage, created, expires, ended, uses, cap, last_day) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, NULL, 0, ?12, NULL) ON CONFLICT(id) DO NOTHING",
  madeSince: "SELECT COUNT(*) AS n FROM paws_workshops WHERE created >= ?1",
  // One statement, so two requests arriving together cannot both take the last unit of the
  // day. ?1 is today, ?2 the id, ?3 now. The count starts again at 1 on a new day.
  charge: "UPDATE paws_workshops SET uses = CASE WHEN last_day = ?1 THEN uses + 1 ELSE 1 END, last_day = ?1 WHERE id = ?2 AND ended IS NULL AND expires > ?3 AND ct IS NOT NULL AND (last_day IS NULL OR last_day <> ?1 OR uses < cap)",
  end: "UPDATE paws_workshops SET ended = ?1, salt = NULL, iv = NULL, ct = NULL WHERE id = ?2 AND ended IS NULL",
  level: "UPDATE paws_workshops SET level = ?1 WHERE id = ?2 AND ended IS NULL AND expires > ?3",
  wipe: "UPDATE paws_workshops SET salt = NULL, iv = NULL, ct = NULL WHERE ct IS NOT NULL AND (expires <= ?1 OR ended IS NOT NULL)",
  purge: "DELETE FROM paws_workshops WHERE expires <= ?1 OR ended <= ?1",
};

const changed = (result) => Number(result && result.meta && result.meta.changes) || 0;

// Throws if the table is not there (Glenn has not run workshops.sql yet).
export const tableReady = (db) => db.prepare(SQL.probe).first();

export const readRow = (db, id) => db.prepare(SQL.read).bind(id).first();

// false if a row with that id is already there (the caller draws another code).
export async function insertRow(db, r) {
  return changed(await db.prepare(SQL.insert)
    .bind(r.id, r.level, r.platform, r.provider, r.model, r.salt, r.iv, r.ct, r.manage, r.created, r.expires, r.cap).run()) === 1;
}

export async function madeSince(db, iso) {
  const row = await db.prepare(SQL.madeSince).bind(iso).first();
  return Number(row && row.n) || 0;
}

// Takes one unit of today's allowance. false means there was none left to take (or the
// workshop ended or ran out in the moment since it was read).
export async function charge(db, id, now) {
  return changed(await db.prepare(SQL.charge).bind(dayOf(now), id, isoOf(now)).run()) === 1;
}

// The encrypted key goes in the same statement that marks the workshop ended.
export const endRow = (db, id, now) => db.prepare(SQL.end).bind(isoOf(now), id).run();

export async function setLevel(db, id, level, now) {
  return changed(await db.prepare(SQL.level).bind(level, id, isoOf(now)).run()) === 1;
}

// Erases the encrypted key of every workshop that has finished, and removes rows that
// finished more than 30 days ago. Until then the empty row is what lets a learner be told
// "that code has finished" instead of "that code did not work".
export async function sweep(db, now) {
  const wiped = changed(await db.prepare(SQL.wipe).bind(isoOf(now)).run());
  const removed = changed(await db.prepare(SQL.purge).bind(isoOf(now - THIRTY_DAYS)).run());
  return { wiped, removed };
}
