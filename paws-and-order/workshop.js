// workshop.js: the only way a Paws & Order page reaches the prompt helper. It knows which of
// three ways in this device has, and hides the difference from the pages:
//
//   code  a workshop code from the teacher. Requests go to this site's own API
//         (/paws-and-order/api/, the Worker in paws-api/), which holds the teacher's AI key.
//   own   a teacher's own AI key saved on this device (Teachers, "Advanced"). Requests go
//         straight from this browser to that AI service, through ai.js, as they always did.
//   none  neither. Looking, choosing and writing all still work; the helper says it needs
//         a code, and a starter prompt can be made from the learner's own brief with no AI.
//
// Every function here answers; none throws or rejects. A failure comes back as words a child
// can read, in `message`.
//
// What is kept on this device: the code, with the level and image tool it opens
// (paws_workshop_v1, only once the server has accepted it, and for 12 hours at most), and a
// random id used to count requests fairly (paws_session; it is not a person). Never a key.
//
// The tests import this file with no page at all, so window, document and localStorage are
// only ever touched inside functions.

import * as AI from './ai.js';
import THEME from './theme.js';
import J from './journey.js';
import { gang } from './gang.js';

const KEY = 'paws_workshop_v1';
const SESSION = 'paws_session';
const TWELVE_HOURS = 12 * 60 * 60 * 1000;
const TIERS = ['basic', 'medium', 'advanced'];

// The code box's words (contract 6.3). The server says which; the page says it like this.
const CODE_SAYS = {
  wrong: 'That code did not work. Check the spelling with your teacher.',
  expired: 'That code has finished. Ask your teacher for today’s code.',
  ended: 'Your teacher has closed that code. Ask for a new one.',
  used_up: 'That code has been used as much as it can be today. Tell your teacher.',
  busy: 'Lots of people are checking codes. Wait a minute, then try again.',
  offline: 'Could not reach Paws & Order. Check the internet, then try again.',
  not_open: 'Workshop codes are not switched on yet. Tell your teacher.',
};
// What the helper says when it cannot answer.
const HELPER_SAYS = {
  need_code: 'The prompt helper needs a workshop code. Ask your teacher for it.',
  locked: 'That level is not open yet. Your teacher opens it.',
  busy: 'Lots of people are asking at once. Wait a minute, then try again.',
  used_up: 'Your class has used up the helper for today. Tell your teacher. You can still carry on.',
  device_cap: 'This device has asked the helper a lot today. You can still carry on.',
  too_long: 'That is too much text. Make it shorter, then try again.',
  offline: CODE_SAYS.offline,
  not_open: CODE_SAYS.not_open,
};

// ---------- storage: missing or blocked storage never throws; the page then remembers while it is open ----------

const memory = new Map();
const store = {
  get(k) {
    try { const v = localStorage.getItem(k); if (v !== null) return v; } catch (e) {}
    return memory.has(k) ? memory.get(k) : null;
  },
  set(k, v) {
    try { localStorage.setItem(k, v); memory.delete(k); return; } catch (e) {}
    memory.set(k, v);
  },
  del(k) {
    memory.delete(k);
    try { localStorage.removeItem(k); } catch (e) {}
  },
};

const levelName = n => { const g = THEME.game.find(x => x.level === n); return g ? g.name : ''; };
const platformOf = id => (THEME.platforms.some(p => p.id === id) ? id : null);
const later = fn => Promise.resolve().then(fn).catch(() => {});

// The saved code, or null. A code past its end, or not checked with the server for 12 hours,
// is dropped here, wherever it is next looked at.
function saved() {
  let w = null;
  try { w = JSON.parse(store.get(KEY) || 'null'); } catch (e) {}
  if (!w || typeof w !== 'object' || typeof w.code !== 'string' || !w.code) return null;
  const level = Math.floor(Number(w.level));
  if (!(level >= 1 && level <= 3)) return null;
  const now = Date.now();
  if (!(Date.parse(w.until) > now) || !(Date.parse(w.checkedAt) + TWELVE_HOURS > now)) {
    store.del(KEY);
    // Told after this call has returned, so a page reading access() mid-render is not re-entered.
    later(() => changed({ why: 'expired', reason: 'expired', message: CODE_SAYS.expired }));
    return null;
  }
  return { code: w.code, level, name: levelName(level), platform: platformOf(w.platform), until: w.until, checkedAt: w.checkedAt };
}

// The random id the server counts requests by. Made on first use; every reset removes it.
function session() {
  const have = store.get(SESSION);
  if (typeof have === 'string' && /^[A-Za-z0-9-]{16,40}$/.test(have)) return have;
  let id = '';
  try { id = crypto.randomUUID(); } catch (e) {}
  if (!id) {
    try { for (const b of crypto.getRandomValues(new Uint8Array(16))) id += b.toString(16).padStart(2, '0'); } catch (e) { id = ''; }
  }
  while (id.length < 32) id += Math.floor(Math.random() * 16).toString(16);
  store.set(SESSION, id);
  return id;
}

// ---------- who is listening ----------

const listeners = [];
let wired = false;

function changed(info) {
  const a = access();
  for (const fn of listeners.slice()) { try { fn(a, info || {}); } catch (e) {} }
}

// Another tab accepting or forgetting a code, a reset, or this page coming back from the
// browser's back-forward cache: each can change the access without this page doing anything.
function wire() {
  if (wired || typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
  wired = true;
  window.addEventListener('storage', e => { if (e.key === KEY || e.key === null) changed({ why: 'storage' }); });
  window.addEventListener('pageshow', e => { if (e.persisted) changed({ why: 'storage' }); });
  window.addEventListener('paws:reset', e => { if (e.detail && e.detail.code) setTimeout(() => changed({ why: 'forgotten' }), 0); });
}

// fn(access, info) whenever the access changes: a code accepted, forgotten, finished, or the
// level lowered. info.why says which; info.lowered is { from, to } when the level was lowered.
// Returns a function that stops the calls.
export function onChange(fn) {
  if (typeof fn !== 'function') return () => {};
  wire();
  listeners.push(fn);
  return () => { const i = listeners.indexOf(fn); if (i !== -1) listeners.splice(i, 1); };
}

// ---------- access ----------

export function access() {
  const w = saved();
  if (w) return { mode: 'code', level: w.level, name: w.name, platform: w.platform, until: w.until };
  let own = null;
  try { const s = AI.loadSettings(); if (AI.isReady(s)) own = s; } catch (e) {}
  if (own) return { mode: 'own', level: own.maxLevel, name: levelName(own.maxLevel), platform: null, until: null };
  return { mode: 'none', level: 0, name: '', platform: null, until: null };
}

// The workshop code this device is using, as it was typed, or '' when there is none. The Teachers page shows
// it big for the class; nothing else needs it.
export function code() {
  const w = saved();
  return w ? w.code : '';
}

// A page that changes the access by a road this file cannot see (the Teachers page saving or forgetting the
// device's own key) says so here, and every listener, the code boxes included, is brought up to date.
export function refresh() { changed({ why: 'storage' }); }

// The highest level open on this device. With no code and no key nothing is locked yet:
// a learner may plan at any level, and the code decides when it arrives.
export function maxLevel() {
  const a = access();
  return a.mode === 'none' ? 3 : a.level;
}

// The one sentence for a lowered level, for the code box and for any page that shows it elsewhere.
export const lowerLine = l => 'Your class is working at ' + l.toName + '. We changed your level to ' + l.toName + '. Everything else is kept.';

// The level-lowering rule: a learner who planned above what is open is moved to the highest
// open level, with one character, and told so. Stage 2 stays done. A code that names the
// class's image tool sets that too. Returns { from, to, fromName, toName } or null.
function fitJourney(level, platform) {
  let lowered = null;
  try {
    const pick = J.get().pick, patch = {};
    const rank = J.tierRank(pick.tier);
    if (level >= 1 && rank > level) {
      patch.tier = TIERS[level - 1];
      patch.cast = (Array.isArray(pick.cast) ? pick.cast : []).slice(0, 1);
      lowered = { from: pick.tier, to: patch.tier, fromName: levelName(rank), toName: levelName(level) };
    }
    if (platform && pick.platform !== platform) patch.platform = platform;
    if (Object.keys(patch).length) J.save({ pick: patch });
  } catch (e) {}
  return lowered;
}

// Applies the lowering rule now, against whatever is open on this device (a page calls it
// when it finds the learner's level above maxLevel()). Returns what fitJourney returns.
export function lower() {
  const a = access();
  const lowered = a.mode === 'none' ? null : fitJourney(a.level, a.platform);
  if (lowered) changed({ why: 'lowered', lowered, message: lowerLine(lowered) });
  return lowered;
}

// ---------- talking to the site's API ----------

// { status, data }: status 0 when nothing came back at all, data null unless the reply was a
// JSON object. The local preview server has no API and answers a POST with an HTML page: that
// is data null, which everything below reads as "could not reach".
async function post(route, body, timeoutMs) {
  let res;
  try {
    const init = { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') init.signal = AbortSignal.timeout(timeoutMs);
    res = await fetch(new URL('api/' + route, import.meta.url).href, init);
  } catch (e) {
    return { status: 0, data: null };
  }
  let data = null;
  try { data = await res.json(); } catch (e) {}
  return { status: res.status, data: data && typeof data === 'object' && !Array.isArray(data) ? data : null };
}

const codeFail = reason => ({ ok: false, reason, message: CODE_SAYS[reason] });

// Why a code was not accepted, from the server's answer; null if it was.
function codeReason(r) {
  if (!r.data) return 'offline';
  if (r.status === 200) return null;
  if (r.status === 401) return 'wrong';
  if (r.status === 410) return r.data.reason === 'ended' ? 'ended' : 'expired';
  if (r.status === 429) return r.data.reason === 'used_up' ? 'used_up' : 'busy';
  if (r.status === 503 && r.data.reason === 'not_open') return 'not_open';
  return 'offline';
}

const isSaved = code => { const w = saved(); return !!w && w.code === code; };

// A code the server no longer takes is not kept.
function drop(code, reason) {
  if (!isSaved(code)) return;
  store.del(KEY);
  changed({ why: 'dropped', reason, message: CODE_SAYS[reason] });
}

// Asks the server about a code, and saves it only if the server accepts it.
// fresh: the learner just typed it (a re-check of a saved code must not bring a forgotten one back).
async function check(code, fresh) {
  const r = await post('code', { code, session: session() }, 20000);
  const reason = codeReason(r);
  if (reason) {
    if (reason === 'wrong' || reason === 'expired' || reason === 'ended') drop(code, reason);
    return codeFail(reason);
  }
  const level = Math.floor(Number(r.data.level));
  if (!(level >= 1 && level <= 3) || !(Date.parse(r.data.until) > Date.now())) return codeFail('offline');
  if (!fresh && !isSaved(code)) return codeFail('wrong');
  const w = { code, level, name: levelName(level), platform: platformOf(r.data.platform), until: String(r.data.until), checkedAt: new Date().toISOString() };
  store.set(KEY, JSON.stringify(w));
  const lowered = fitJourney(level, w.platform);
  const out = { ok: true, level, name: w.name, platform: w.platform, until: w.until };
  if (lowered) out.lowered = lowered;
  changed({ why: fresh ? 'accepted' : 'checked', lowered: lowered || undefined, message: lowered ? lowerLine(lowered) : undefined });
  return out;
}

// { ok: true, level, name, platform, until, lowered? } or { ok: false, reason, message }.
export async function enterCode(text) {
  try {
    const code = typeof text === 'string' ? text.trim().replace(/\s+/g, ' ').slice(0, 60) : '';
    if (!code) return codeFail('wrong');
    return await check(code, true);
  } catch (e) {
    return codeFail('offline');
  }
}

// Asks the server about the saved code again, and takes up a level the teacher has changed.
let rechecking = null;
export function recheck() {
  if (rechecking) return rechecking;
  const w = saved();
  if (!w) return Promise.resolve({ ok: false, reason: 'wrong', message: HELPER_SAYS.need_code });
  rechecking = check(w.code, false).catch(() => codeFail('offline')).finally(() => { rechecking = null; });
  return rechecking;
}

export function forget() {
  const had = !!saved();
  store.del(KEY);
  if (had) changed({ why: 'forgotten' });
}

// After the helper has been asked on a code: a quiet re-check, so a level the teacher has
// raised is picked up "the next time they ask the helper". At most once a minute.
function refreshSoon(code) {
  const w = saved();
  if (w && w.code === code && Date.now() - Date.parse(w.checkedAt) > 60000) recheck();
}

// ---------- what a page hands over, made safe to send ----------

const text = v => (typeof v === 'string' ? v : '');
const strings = (a, n) => (Array.isArray(a) ? a.filter(x => typeof x === 'string' && x.trim()).slice(0, n) : []);
const placeOf = id => (typeof id === 'string' && THEME.places.find(p => p.id === id)) || null;

// The cast as it travels: only an id for one of the gang, and id, name and look for a
// character the learner made. Never a picture, whatever the page passed in.
function wireCast(cast) {
  if (!Array.isArray(cast)) return [];
  // A page may pass plain ids (from pick.cast), what gang.forPrompt made of them, or a mix.
  const list = cast.flatMap(c => (typeof c === 'string' ? gang.forPrompt([c]) : [c]));
  return list.filter(c => c && typeof c === 'object' && typeof c.id === 'string').slice(0, 2)
    .map(c => (c.id.startsWith('mine-') ? { id: c.id, name: text(c.name), look: text(c.look) } : { id: c.id }));
}

function briefInput(input) {
  const src = input && typeof input === 'object' ? input : {};
  const place = placeOf(src.place);
  const out = { platform: src.platform, tier: src.tier, subject: src.subject, palette: src.palette, cast: wireCast(src.cast),
    attempt: text(src.attempt), idea: text(src.idea), round: src.round === 2 ? 2 : 1, example: src.example === true };
  if (place) out.place = place.id;   // "My own place" travels as nothing: the idea describes it
  return out;
}

function compareInput(input) {
  const src = input && typeof input === 'object' ? input : {};
  const out = { prompt: text(src.prompt), description: text(src.description), reference: text(src.reference) };
  if (src.brief && typeof src.brief === 'object') out.brief = { anchor: text(src.brief.anchor), prompts: strings(src.brief.prompts, 6) };
  return out;
}

// ---------- the helper's answers ----------

const error = (message, extra) => Object.assign({ type: 'error', message }, extra);
const unreachable = extra => error(HELPER_SAYS.offline, Object.assign({ reason: 'offline' }, extra));

// A 200 from the server, checked before a page is given it. null if it is not an answer.
function goodBrief(d) {
  if (d.type === 'gate' && strings(d.questions, 2).length) return { type: 'gate', questions: strings(d.questions, 2), attempt: text(d.attempt) };
  if (d.type !== 'brief' || !d.brief || typeof d.brief !== 'object' || !strings(d.brief.prompts, 6).length) return null;
  const b = d.brief;
  return { type: 'brief', fallback: d.fallback === true, attempt: text(d.attempt), brief: {
    anchor: text(b.anchor), prompts: strings(b.prompts, 6), why_this_works: text(b.why_this_works),
    platform_notes: text(b.platform_notes), watch_for: text(b.watch_for), friendly_note: text(b.friendly_note) } };
}
function goodCompare(d) {
  if (d.type === 'copied' && typeof d.message === 'string') return { type: 'copied', message: d.message };
  if (d.type === 'fallback' && strings(d.checklist, 12).length) return { type: 'fallback', checklist: strings(d.checklist, 12) };
  if (d.type !== 'compare') return null;
  return { type: 'compare', asked_and_missing: strings(d.asked_and_missing, 5), appeared_unasked: strings(d.appeared_unasked, 5),
    drift_words: strings(d.drift_words, 5), questions: strings(d.questions, 4), looks_copied: d.looks_copied === true };
}

// What a refusal from the server means for the learner. `more` is { canStarter: true } for
// the prompt helper (there is always a way on) and nothing for the compare check.
async function refused(r, code, more) {
  const d = r.data;
  if (!d) return unreachable(more);
  if (r.status === 401 || r.status === 410) {
    const reason = r.status === 401 ? 'wrong' : d.reason === 'ended' ? 'ended' : 'expired';
    drop(code, reason);
    return error(CODE_SAYS[reason], Object.assign({ need: 'code' }, more));
  }
  if (r.status === 403 && d.locked === true) {
    // The teacher has lowered the level since this device last checked: take the new one up.
    const again = await recheck();
    const lowered = (again && again.lowered) || lower();
    return error(lowered ? lowerLine(lowered) : HELPER_SAYS.locked, Object.assign({ locked: true }, lowered ? { lowered } : null, more));
  }
  if (r.status === 429) {
    const reason = d.reason === 'used_up' || d.reason === 'device_cap' ? d.reason : 'busy';
    return error(HELPER_SAYS[reason], Object.assign({ reason }, more));
  }
  if (r.status === 413) return error(HELPER_SAYS.too_long, Object.assign({ reason: 'too_long' }, more));
  if (r.status === 502 && d.setup === true) return error(AI.explain('http_401'), Object.assign({ setup: true }, more));
  if (r.status === 503 && d.reason === 'not_open') return error(HELPER_SAYS.not_open, Object.assign({ reason: 'not_open' }, more));
  // The server's own check of the words, or the AI declining them: its sentence is the one to show.
  if (r.status === 400 && d.type === 'error' && typeof d.message === 'string' && d.message) {
    return error(d.message.slice(0, 300), d.need === 'attempt' ? { need: 'attempt' } : null);
  }
  return unreachable(more);
}

// On a teacher's own key the level set on the Teachers page is the lock.
function ownLock(tier, more) {
  const s = AI.loadSettings();
  if (J.tierRank(tier) <= s.maxLevel) return null;
  const lowered = lower();
  return error(lowered ? lowerLine(lowered) : HELPER_SAYS.locked, Object.assign({ locked: true }, lowered ? { lowered } : null, more));
}

// Promise of one of ai.js's results: { type: 'gate', questions, attempt }, { type: 'brief',
// brief, fallback, attempt }, or { type: 'error', message, need?, locked?, setup?, canStarter?, reason? }.
export async function makeBrief(input) {
  const starter = { canStarter: true };
  try {
    const sent = briefInput(input);
    // ai.js's own checks first, so "write 10 words" comes before "you need a code".
    const read = AI.readBrief(sent);
    if (read.error) return read.error;
    const a = access();
    if (a.mode === 'none') return error(HELPER_SAYS.need_code, { need: 'code', canStarter: true });
    if (a.mode === 'own') {
      const locked = ownLock(sent.tier, starter);
      if (locked) return locked;
      const out = await AI.makeBrief(AI.loadSettings(), sent);
      return out.type === 'error' && out.setup ? Object.assign(out, starter) : out;
    }
    const code = saved().code;
    const r = await post('brief', Object.assign({ code, session: session() }, sent), 100000);
    if (r.status === 200 && r.data) {
      refreshSoon(code);
      return goodBrief(r.data) || unreachable(starter);
    }
    const out = await refused(r, code, starter);
    refreshSoon(code);
    return out;
  } catch (e) {
    return unreachable(starter);
  }
}

// Promise of { type: 'copied', message }, { type: 'fallback', checklist }, { type: 'compare', ...lists },
// or an error as above.
export async function compare(input) {
  try {
    const sent = compareInput(input);
    // The word counts and the pasted-back-prompt check need no code and no AI.
    const read = AI.readCompare(sent);
    if (read.error) return read.error;
    if (read.copied) return read.copied;
    const a = access();
    if (a.mode === 'none') return error(HELPER_SAYS.need_code, { need: 'code' });
    if (a.mode === 'own') {
      // The reference description is a Storyteller step, on a code and on a key alike.
      if (a.level < 3) sent.reference = '';
      return await AI.compare(AI.loadSettings(), sent);
    }
    const code = saved().code;
    const r = await post('compare', Object.assign({ code, session: session() }, sent), 60000);
    if (r.status === 200 && r.data) {
      refreshSoon(code);
      return goodCompare(r.data) || unreachable();
    }
    const out = await refused(r, code, null);
    refreshSoon(code);
    return out;
  } catch (e) {
    return unreachable();
  }
}

// ---------- the starter prompt: the learner's own brief, joined up. No AI. ----------

const sentence = t => { const s = text(t).replace(/\s+/g, ' ').trim().replace(/[.!?…\s]+$/, ''); return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; };

// One prompt, whatever the level: the look, the idea, the place, the style and the colours.
// { type: 'brief', fallback: true, starter: true, brief } or { type: 'error', message }.
export function starterBrief(input) {
  try {
    const src = input && typeof input === 'object' ? input : {};
    const setting = src.subject === 'setting';
    const idea = text(src.idea).trim().slice(0, 800);
    const cast = setting ? [] : wireCast(src.cast);
    const place = placeOf(src.place);
    const attempt = text(src.attempt);
    // Nothing to join up yet: the starter from the files stands in.
    if (!idea) return { type: 'brief', fallback: true, starter: true, attempt, brief: AI.stockBrief(setting ? 'setting' : 'character', 'basic', src.palette, cast, place && place.id) };

    const first = cast[0];
    const known = first && THEME.cast.find(c => c.id === first.id);
    const look = known ? known.look : first ? text(first.look).slice(0, 400) : '';
    if (AI.unfriendly(idea) || AI.unfriendly(look)) return error(AI.FRIENDLY_NUDGE);
    const palette = typeof src.palette === 'string' && Object.hasOwn(THEME.palettes, src.palette) ? src.palette : THEME.defaultPalette;
    const parts = setting
      ? [place ? place.look : '', idea, THEME.houseStyle, 'Colours: ' + THEME.palettes[palette].phrase, 'No words, no captions, no speech bubbles', 'No characters']
      : [look, idea, place ? place.look : '', THEME.houseStyle, 'Colours: ' + THEME.palettes[palette].phrase, 'No words, no captions, no speech bubbles'];
    return { type: 'brief', fallback: true, starter: true, attempt, brief: {
      anchor: '', prompts: [parts.map(sentence).filter(Boolean).join('. ') + '.'],
      why_this_works: 'This prompt is your own brief, joined up: the look, your idea, the style and the colours.',
      platform_notes: '', watch_for: 'Check the colours and the look first.', friendly_note: '' } };
  } catch (e) {
    return error('Something went wrong. Try again.');
  }
}

// ---------- the teacher's side ----------

// Each resolves { ok: true, ... } or { ok: false, reason, message }: the server's own sentence
// when it sent one (they are written for a teacher), else one from here.
async function teacherCall(route, body, timeoutMs, shape) {
  try {
    const r = await post(route, body, timeoutMs);
    if (r.status === 200 && r.data) return Object.assign({ ok: true }, shape(r.data));
    const d = r.data;
    if (!d) return codeFail('offline');
    const said = typeof d.message === 'string' && d.message ? d.message.slice(0, 300) : '';
    if (r.status === 503 && d.reason === 'not_open') return { ok: false, reason: 'not_open', message: 'Workshop codes are not switched on for this site yet.' };
    if (r.status === 401) return { ok: false, reason: 'wrong', message: said || 'That code and manage key do not match a workshop.' };
    if (r.status === 410) return { ok: false, reason: d.reason === 'ended' ? 'ended' : 'expired', message: said || 'That workshop has finished.' };
    if (r.status === 429) return { ok: false, reason: 'busy', message: said || 'Too many requests. Wait a minute, then try again.' };
    if (r.status === 413) return { ok: false, reason: 'too_long', message: HELPER_SAYS.too_long };
    if (r.status === 400 && said) return { ok: false, reason: d.reason === 'key_test' ? 'key_test' : 'invalid', message: said };
    return codeFail('offline');
  } catch (e) {
    return codeFail('offline');
  }
}
const whole = v => (typeof v === 'number' ? v : Number(v));

export const teacher = {
  // The key goes to the server once, here, and is not kept by this file or by the page.
  create(o) {
    const s = o && typeof o === 'object' ? o : {};
    return teacherCall('workshop/create', { provider: s.provider, key: text(s.key).trim(), model: s.model, level: whole(s.level),
      platform: platformOf(s.platform), days: whole(s.days), cap: whole(s.cap) }, 45000,
    d => ({ code: text(d.code), manage: text(d.manage), level: d.level, platform: platformOf(d.platform), until: text(d.until), cap: d.cap }));
  },
  status(o) {
    const s = o && typeof o === 'object' ? o : {};
    return teacherCall('workshop/status', { code: s.code, manage: s.manage }, 20000,
      d => ({ level: d.level, platform: platformOf(d.platform), until: text(d.until), ended: d.ended || null, uses: d.uses, cap: d.cap, provider: text(d.provider), model: text(d.model) }));
  },
  end(o) {
    const s = o && typeof o === 'object' ? o : {};
    return teacherCall('workshop/end', { code: s.code, manage: s.manage }, 20000, () => ({}));
  },
  setLevel(o) {
    const s = o && typeof o === 'object' ? o : {};
    return teacherCall('workshop/level', { code: s.code, manage: s.manage, level: whole(s.level) }, 20000, d => ({ level: d.level }));
  },
};

// ---------- the code box ----------

let boxes = 0;   // a page may show the box twice; each gets its own ids (wcode-1, wcode-2, ...)

// Writes the workshop code box into el (emptying it first) and keeps it in step with the access:
// another box on the page, another tab, a code that finishes. opts.compact: the plain version.
// The code is checked on the button or Enter, never while typing: half-typed codes would count
// as wrong ones against a limit the whole class shares.
export function mountCodeBox(el, opts) {
  try {
    if (!el || typeof document === 'undefined') return null;
    const id = 'wcode-' + (++boxes);
    const make = (tag, attrs, words) => {
      const node = document.createElement(tag);
      for (const k of Object.keys(attrs)) node.setAttribute(k, attrs[k]);
      if (words) node.textContent = words;
      return node;
    };
    const root = make('div', { class: 'codebox' + (opts && opts.compact ? ' compact' : ''), 'data-nopencil': '' });
    const label = make('label', { for: id }, 'Workshop code');
    const hint = make('p', { class: 'hint2', id: id + '-hint' }, 'Your teacher has it: three words and a number. You can type spaces between them. Capital letters do not matter.');
    const row = make('div', { class: 'codebox-row' });
    // type="text": children must see what they type.
    const input = make('input', { id, type: 'text', autocomplete: 'off', autocapitalize: 'none', autocorrect: 'off', spellcheck: 'false',
      enterkeyhint: 'go', maxlength: '60', 'aria-describedby': id + '-hint ' + id + '-status' });
    const go = make('button', { type: 'button', class: 'btn' }, 'Use this code');
    // Made once and never replaced, so a screen reader hears each change of its words.
    const status = make('p', { class: 'codebox-status', id: id + '-status', role: 'status' });
    const other = make('button', { type: 'button', class: 'linkbtn' }, 'Use a different code');
    other.hidden = true;
    row.appendChild(input); row.appendChild(go);
    for (const node of [label, hint, row, status, other]) root.appendChild(node);
    el.textContent = '';
    el.appendChild(root);

    let busy = false, problem = '', note = '';
    const say = (words, kind) => { status.textContent = words; status.className = 'codebox-status' + (kind ? ' ' + kind : ''); };
    const show = () => {
      const a = access();
      const open = a.mode === 'none';
      label.hidden = a.mode === 'own';
      hint.hidden = !open;
      row.hidden = !open;
      other.hidden = a.mode !== 'code';
      if (a.mode === 'own') say('This device is set up by your teacher. No code needed.', 'is-ok');
      else if (a.mode === 'code') say('Code accepted. The prompt helper is on, up to ' + a.name + '.' + (note ? ' ' + note : ''), 'is-ok');
      else if (busy) say('Checking the code…', 'is-wait');
      else say(problem, problem ? 'is-bad' : '');
    };

    const submit = async () => {
      if (busy) return;
      busy = true;
      problem = '';
      // The button keeps the focus while it waits, so it is marked, not disabled.
      go.textContent = 'Checking…';
      go.setAttribute('aria-disabled', 'true');
      go.className = 'btn is-off';
      show();
      const out = await enterCode(input.value);
      busy = false;
      go.textContent = 'Use this code';
      go.removeAttribute('aria-disabled');
      go.className = 'btn';
      if (out.ok) {
        input.value = '';
        input.removeAttribute('aria-invalid');
        show();
        other.focus();
      } else {
        problem = out.message;
        input.setAttribute('aria-invalid', 'true');
        show();
        input.focus();
      }
    };
    go.addEventListener('click', submit);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } });
    input.addEventListener('input', () => input.removeAttribute('aria-invalid'));
    other.addEventListener('click', () => {
      problem = '';
      note = '';
      forget();
      show();
      input.focus();
    });

    onChange((a, info) => {
      if (info.lowered) note = lowerLine(info.lowered);
      else if (info.why !== 'checked' && info.why !== 'storage') note = '';
      // A code that was dropped (finished, ended, or the server no longer knows it) says why.
      if (a.mode === 'none' && info.message && (info.why === 'expired' || info.why === 'dropped')) problem = info.message;
      if (a.mode !== 'none') problem = '';
      show();
    });
    show();
    // A code accepted a while ago is asked about again, quietly, so a level the teacher has
    // changed (or a workshop they have ended) shows without the learner doing anything.
    const w = saved();
    if (w && Date.now() - Date.parse(w.checkedAt) > 10 * 60 * 1000) recheck();
    return root;
  } catch (e) {
    return null;
  }
}

const W = { access, maxLevel, code, refresh, enterCode, recheck, forget, makeBrief, compare, starterBrief, mountCodeBox, onChange, lower, lowerLine, teacher };
export default W;
