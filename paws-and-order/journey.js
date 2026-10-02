// Paws & Order journey: the one record of where a learner is in the five stages, and the chrome
// every page shares because of it (the Start / Carry on link, the menu button, the progress trail,
// the Start again dialog). Every page imports this file; nothing here is sent anywhere.
//
// The record lives in this browser, in localStorage['paws_journey_v1']. Several pages and tabs write
// it, so nothing ever holds a copy and saves it back whole: save() re-reads what is stored, merges
// the change in, and writes. That is what stops one page undoing another's ticks.
//
// The file also loads with no page at all (the tests import it in node), so window, document,
// location and localStorage are only ever touched inside functions.

import THEME from './theme.js';
import { words as wordList } from './copycheck.js';

const KEY = 'paws_journey_v1';
const RESET_AT = 'paws_reset_at';
const OLD_HANDOFF = 'police_pound_handoff';
// What every Start again removes. The last three are the old site's keys: nothing writes them now.
const ALWAYS = [KEY, 'paws_session', OLD_HANDOFF, 'police_pound_example', 'police_pound_lastbrief'];
const TIERS = ['basic', 'medium', 'advanced'];
const SUBJECTS = ['character', 'setting'];
const MODES = ['demo', 'guide', 'create', 'explore'];
const UNSAFE = k => k === '__proto__' || k === 'constructor' || k === 'prototype';

export const STAGES = THEME.stages;
// The site's own folder, worked out from this file's address, so it is right on any host and port.
export const BASE = new URL('./', import.meta.url).pathname;

// ---------- storage: missing, blocked or full storage never throws; the page then remembers for as long as it is open ----------
let injected = null;
const memory = new Map();
function box() {
  if (injected) return injected;
  try { if (typeof localStorage !== 'undefined' && localStorage) return localStorage; } catch (e) {}
  return null;
}
const store = {
  get(k) {
    if (memory.has(k)) return memory.get(k);
    const b = box();
    if (b) { try { return b.getItem(k); } catch (e) {} }
    return null;
  },
  set(k, v) {
    const b = box();
    if (b) { try { b.setItem(k, v); memory.delete(k); return true; } catch (e) {} }
    memory.set(k, String(v));
    return false;
  },
  del(k) {
    memory.delete(k);
    const b = box();
    if (b) { try { b.removeItem(k); } catch (e) {} }
  },
};
// For the tests: a stand-in for localStorage (getItem, setItem, removeItem). Pass nothing to go back to the real one.
export function _setStorage(obj) { injected = obj || null; memory.clear(); migrated = false; }

// ---------- the record's shape ----------
const iso = () => new Date().toISOString();
const isObj = v => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v, max) => (typeof v === 'string' ? v : v == null ? '' : String(v)).slice(0, max);
const when = v => (typeof v === 'string' && v ? v : null);
const stageOf = n => STAGES.find(s => s.n === n);
const hasSub = (st, sub) => !!st && st.subs.some(([id]) => id === sub);
// Copies a stored object's own keys onto fresh defaults (never a key that would swap the prototype).
function fill(base, src) {
  if (isObj(src)) Object.keys(src).forEach(k => { if (!UNSAFE(k)) base[k] = src[k]; });
  return base;
}
const blankPick = () => ({ subject: null, cast: [], place: null, palette: null, tier: null, platform: null, attempt: '', attemptIsExample: false, idea: '' });
const blankCheck = () => ({ prompt: '', description: '', reference: '', result: null, byEye: [], why: '', change: '', kept: false, keptWhy: '', at: null });
const blank = () => ({
  v: 1, at: null, started: null, stage: 1, sub: STAGES[0].subs[0][0],
  done: { 1: false, 2: false, 3: false, 4: false, 5: false },
  look: null, lookDraft: null, pick: blankPick(), helper: null, used: null, made: null,
  check: blankCheck(), checkPrev: null, reflect: '', finished: null,
});
// The text limits are applied here, so they hold on every read and every write.
function tidyCheck(c) {
  const out = fill(blankCheck(), c);
  out.prompt = text(out.prompt, 3000); out.description = text(out.description, 3000); out.reference = text(out.reference, 3000);
  out.why = text(out.why, 300); out.change = text(out.change, 300); out.keptWhy = text(out.keptWhy, 300);
  out.byEye = Array.isArray(out.byEye) ? out.byEye : [];
  out.kept = !!out.kept;
  // The by-eye notes box (the picture page's). It is not in a blank check: it is only there once something is typed.
  if (out.notes != null) out.notes = text(out.notes, 300);
  return out;
}
// The saved helper answer is kept as it was stored (the picture page adds `sig`, a fingerprint of the brief
// the prompt was made from). Any stored value in, a whole journey out. An unknown version or anything that is not a record counts as no journey.
function normalise(raw) {
  const j = blank();
  if (!isObj(raw) || raw.v !== 1) return j;
  Object.keys(raw).forEach(k => { if (!(k in j) && !UNSAFE(k)) j[k] = raw[k]; });
  j.at = when(raw.at);
  j.started = when(raw.started);
  j.stage = stageOf(raw.stage) ? raw.stage : 1;
  j.sub = hasSub(stageOf(j.stage), raw.sub) ? raw.sub : stageOf(j.stage).subs[0][0];
  STAGES.forEach(s => { const d = isObj(raw.done) ? raw.done[s.n] : false; j.done[s.n] = typeof d === 'string' && d ? d : !!d; });
  j.look = isObj(raw.look) ? fill({}, raw.look) : null;
  if (j.look) j.look.text = text(j.look.text, 1500);
  j.lookDraft = isObj(raw.lookDraft) ? fill({}, raw.lookDraft) : null;
  if (j.lookDraft && j.lookDraft.desc != null) j.lookDraft.desc = text(j.lookDraft.desc, 1500);
  j.pick = fill(blankPick(), raw.pick);
  j.pick.cast = Array.isArray(j.pick.cast) ? j.pick.cast.filter(id => typeof id === 'string') : [];
  j.pick.attempt = text(j.pick.attempt, 1500);
  j.pick.idea = text(j.pick.idea, 800);
  j.pick.attemptIsExample = !!j.pick.attemptIsExample;
  j.helper = isObj(raw.helper) ? raw.helper : null;
  j.used = isObj(raw.used) ? fill({}, raw.used) : null;
  if (j.used) j.used.text = text(j.used.text, 4000);
  j.made = when(raw.made);
  j.check = tidyCheck(raw.check);
  j.checkPrev = isObj(raw.checkPrev) ? tidyCheck(raw.checkPrev) : null;
  j.reflect = text(raw.reflect, 600);
  j.finished = when(raw.finished);
  // The picture page's second go: the prompt from last time, being changed by hand. Not in a blank journey;
  // while it is there it is { text, index, at }, and anything else stored under the name counts as none.
  if ('redo' in j) {
    j.redo = isObj(raw.redo) ? fill({}, raw.redo) : null;
    if (j.redo) j.redo.text = text(j.redo.text, 4000);
  }
  return j;
}
function read() {
  let raw = null;
  try { raw = JSON.parse(store.get(KEY) || 'null'); } catch (e) {}
  return normalise(raw);
}

// ---------- the old site's hand-over ----------
// Look Closely used to leave its description under police_pound_handoff for the home page to pick up.
// Someone who pressed Send on the old page just before the new site arrived still gets their words:
// the first read moves a hand-over under six hours old into the journey. Old or new, the key is then deleted.
let migrated = false;
function migrate() {
  if (migrated) return;
  migrated = true;
  const raw = store.get(OLD_HANDOFF);
  if (raw == null) return;
  store.del(OLD_HANDOFF);
  let h = null;
  try { h = JSON.parse(raw); } catch (e) {}
  if (!isObj(h) || typeof h.idea !== 'string' || !h.idea.trim()) return;
  const ts = Number(h.ts) || 0;
  if (Date.now() - ts >= 6 * 3600e3) return;
  const j = read();
  if (j.look || j.pick.attempt) return;   // newer work is already here: leave it alone
  const words = h.idea.trim().slice(0, 1500);
  const mode = MODES.includes(h.mode) ? h.mode : 'create';
  const example = mode === 'demo' || mode === 'guide';
  const tier = TIERS.includes(h.tier) ? h.tier : null;
  const subject = SUBJECTS.includes(h.subject) ? h.subject : null;
  const cast = (Array.isArray(h.cast) ? h.cast : []).filter(id => THEME.cast.some(c => c.id === id)).slice(0, 1);
  const at = new Date(ts).toISOString();
  const patch = { look: { text: words, tier, subject, cast, ref: null, mode, example, at }, pick: { attempt: words, attemptIsExample: example } };
  if (subject && !j.pick.subject) patch.pick.subject = subject;
  if (tier && !j.pick.tier) patch.pick.tier = tier;
  if (cast.length && subject === 'character' && !j.pick.cast.length) patch.pick.cast = cast;
  if (!j.started) patch.started = at;
  // Pressing Send was the act that finishes stage 1, by the same rule as today: an example, or ten words of your own.
  if (example || wordList(words).length >= 10) patch.done = { 1: at };
  save(patch);
}

// ---------- reading and writing ----------
// The journey, fresh from storage, with every default filled in. Never null.
export function get() { migrate(); return read(); }

// Merge-on-save. Two levels and no deeper: the top level, and the keys of done, pick and check.
// Everything else the patch carries (look, lookDraft, helper, used, checkPrev, check.result, any array)
// replaces what was there, whole; null clears it. Returns the new journey.
export function save(patch) {
  migrate();
  const j = read();
  if (isObj(patch)) {
    Object.keys(patch).forEach(k => {
      if (k === 'v' || k === 'at' || UNSAFE(k)) return;
      const val = patch[k];
      if (val === undefined) return;
      if (k === 'done') {
        // a stage, once done, is never un-done: only a truthy value is taken, and the first one stands
        if (isObj(val)) STAGES.forEach(s => { if (val[s.n] && !j.done[s.n]) j.done[s.n] = val[s.n]; });
      } else if (k === 'pick' || k === 'check') {
        if (val === null) j[k] = k === 'pick' ? blankPick() : blankCheck();
        else fill(j[k], val);
      } else j[k] = val;
    });
  }
  const out = normalise(j);
  out.at = iso();
  const json = JSON.stringify(out);
  store.set(KEY, json);
  refresh();
  return normalise(JSON.parse(json));
}

// Start my comic: the learner has begun, and is at stage 1.
export function start() {
  const j = get(), patch = { stage: 1 };
  if (!j.started) patch.started = iso();
  if (j.stage !== 1) patch.sub = STAGES[0].subs[0][0];
  return save(patch);
}

// The page is now showing stage n (and substep sub): remember it and move the trail.
export function setStage(n, sub) {
  n = Number(n);
  const st = stageOf(n);
  if (!st) return get();
  const known = hasSub(st, sub), patch = { stage: n };
  if (known) patch.sub = sub;
  else if (get().stage !== n) patch.sub = st.subs[0][0];
  if (mounted) { mounted.stage = n; mounted.sub = known ? sub : undefined; }
  return save(patch);
}

// The substep inside the page's stage. A substep only means something with its stage, so both are saved.
export function setSub(sub) {
  const n = mounted && mounted.stage ? mounted.stage : get().stage;
  if (!hasSub(stageOf(n), sub)) return get();
  if (mounted) mounted.sub = sub;
  return save({ stage: n, sub });
}

// A stage is done because the learner did something, never because they visited. It is never un-done.
export function markDone(n) {
  n = Number(n);
  if (!stageOf(n)) return get();
  const j = get();
  if (j.done[n]) { refresh(); return j; }
  return save({ done: { [n]: iso() } });
}

// 1 + the highest N such that stages 1 to N are all done (at most 5): the first stage still to do.
export function frontier(j) {
  j = j || get();
  let n = 0;
  while (n < STAGES.length && j.done[n + 1]) n++;
  return Math.min(n + 1, STAGES.length);
}

export function isStarted(j) {
  j = j || get();
  return !!(j.started || STAGES.some(s => j.done[s.n]) || j.look || j.pick.attempt || j.pick.idea || j.pick.subject || j.helper);
}

// The address of stage n. The substep is not in the address: the page reads it from the journey.
export function hrefFor(n, sub) {
  const st = stageOf(Number(n));
  return BASE + (st ? st.page : '');
}

// Where Carry on goes: the stage the learner last worked in, or the first stage still to do when nothing is saved.
export function resumeHref(j) {
  j = j || get();
  return hrefFor(isStarted(j) ? j.stage : frontier(j));
}

export function tierRank(tier) { return TIERS.indexOf(tier) + 1; }

// The one word count behind every "at least 10 words" rule (the same counter ai.js uses).
export function words(t) { return wordList(t).length; }

export function esc(t) {
  return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ---------- reset ----------
// Removes the learner's work from this device. The order matters: pages are told first (the Comic Maker
// stops its pending save, or it would write the page straight back), then the keys go, then the comics,
// and last the time is written, which is what makes this site's other open tabs reload.
// It never touches the teacher's own-key setup: the Teachers page has its own button for that.
export async function reset(opts) {
  const o = { comics: !!(opts && opts.comics), characters: !!(opts && opts.characters), code: !!(opts && opts.code), teacher: !!(opts && opts.teacher) };
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
    try { window.dispatchEvent(new CustomEvent('paws:reset', { detail: Object.assign({}, o) })); } catch (e) {}
  }
  ALWAYS.forEach(k => store.del(k));
  if (o.code) store.del('paws_workshop_v1');
  if (o.characters) store.del('police_pound_cast_v1');
  if (o.teacher) store.del('paws_teacher_v1');
  if (o.comics) {
    // shelf.js is fetched only here, so the two files never import each other
    try { const m = await import('./shelf.js'); await m.default.clearAll(); } catch (e) {}
    store.del('police-pound-builder-seen');
  }
  const at = iso();
  store.set(RESET_AT, at);
  resetSeen = at;
}

// The Start again dialog. Resolves true once the reset is done (it then leaves the page by itself, so the
// caller does nothing more), or false if the learner backed out. Cancel has the focus when it opens,
// and backing out puts the focus back where it was: on opts.opener when the caller hands the button in
// (a press does not focus a button in every browser), else on whatever had the focus.
let dialogOpen = false;
export function confirmReset(opts) {
  const who = opts && opts.who === 'teacher' ? 'teacher' : 'learner';
  const all = !!(opts && opts.all);
  if (typeof document === 'undefined' || !document.body || dialogOpen) return Promise.resolve(false);
  const boxes = [
    ['comics', 'Also remove my saved comics from this device'],
    ['characters', 'Also remove the characters I made'],
    ['code', 'Also forget the workshop code'],
  ];
  if (who === 'teacher') boxes.push(['teacher', 'Also forget the workshop I made on this device']);
  const d = document.createElement('dialog');
  if (typeof d.showModal !== 'function') {
    // a browser too old for <dialog>: one plain question, with the boxes as they would have opened
    if (!window.confirm('Start again? Your progress, your description, your idea, your prompts and your check will be removed from this device.')) return Promise.resolve(false);
    const o = {};
    boxes.forEach(([k]) => { o[k] = all; });
    return reset(o).then(() => { leave(who); return true; });
  }
  const opener = opts && opts.opener && typeof opts.opener.focus === 'function' ? opts.opener : document.activeElement;
  d.className = 'dialog';
  d.setAttribute('aria-labelledby', 'rs-h');
  d.setAttribute('aria-describedby', 'rs-list');
  d.setAttribute('data-nopencil', '');
  d.innerHTML = '<h2 id="rs-h">Start again?</h2>'
    + '<ul id="rs-list"><li><b>Removed.</b> Your progress, your description, your idea, your prompts and your check.</li>'
    + '<li><b>Kept.</b> Your saved comics and the page on your desk stay unless you tick the box.</li></ul>'
    + boxes.map(([k, words]) => '<label><input type="checkbox" data-opt="' + k + '"' + (all ? ' checked' : '') + '> ' + words + '</label>').join('')
    + '<p>Sharing this device? Tick every box so the next person starts fresh.</p>'
    + '<div class="dialog-btns"><button type="button" class="btn back" data-act="cancel" autofocus>Cancel</button>'
    + '<button type="button" class="btn" data-act="yes">Yes, start again</button></div>';
  document.body.appendChild(d);
  dialogOpen = true;
  return new Promise(resolve => {
    let confirmed = false, busy = false;
    // once Yes is pressed the reset is under way: Escape must not report "backed out" while it finishes
    d.addEventListener('cancel', e => { if (busy) e.preventDefault(); });
    d.addEventListener('close', () => {
      dialogOpen = false;
      d.remove();
      if (confirmed) return;
      if (opener && typeof opener.focus === 'function' && opener.isConnected) opener.focus();
      resolve(false);
    });
    d.addEventListener('click', async e => {
      const b = e.target.closest('[data-act]');
      if (!b || busy) return;
      if (b.dataset.act === 'cancel') { d.close(); return; }
      busy = true;
      b.setAttribute('aria-disabled', 'true');
      const o = {};
      d.querySelectorAll('[data-opt]').forEach(c => { o[c.dataset.opt] = c.checked; });
      await reset(o);
      confirmed = true;
      d.close();
      resolve(true);
      leave(who);
    });
    d.showModal();
  });
}
// After a reset the page on screen still shows the work that has gone, so it is always left or reloaded.
function leave(who) {
  const here = location.pathname.replace(/index\.html$/, '');
  if (who !== 'teacher') { location.replace(BASE); return; }
  const target = BASE + 'teachers/';
  if (here !== target) { location.replace(target + '#reset'); return; }
  if (location.hash !== '#reset') location.hash = '#reset';
  location.reload();
}

// ---------- small things every page needs ----------
const calm = () => { try { return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

// scrollIntoView that honours "reduce motion". Pages never pass behavior:'smooth' themselves.
// behavior:'instant' is a jump and is passed on as it is: 'auto' would glide, because pound.css sets
// scroll-behavior:smooth on the page.
export function scrollTo(el, opts) {
  if (!el || typeof el.scrollIntoView !== 'function') return;
  const o = Object.assign({ block: 'start' }, opts || {});
  o.behavior = o.behavior === 'instant' ? 'instant' : calm() || o.behavior === 'auto' ? 'auto' : 'smooth';
  try { el.scrollIntoView(o); } catch (e) { el.scrollIntoView(); }
}

// After a step change: focus the new step's heading (the CSS shows the ring) and bring it clear of the top bar.
// It only scrolls when the heading is under the bar or more than half-way down, so a step that is already in
// view does not jump.
export function focusHeading(el) {
  if (!el || typeof el.focus !== 'function') return;
  if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
  try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
  const bar = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bar-h')) || 0;
  const top = el.getBoundingClientRect().top;
  if (top < bar + 4 || top > window.innerHeight * 0.45) scrollTo(el, { block: 'start' });
}

// One polite live region for the whole page. It is in the page, empty, before anything is said (mount makes it),
// and the words are set a moment after it is cleared, so saying the same thing twice is heard twice.
let live = null, liveTimer = 0;
function liveRegion() {
  if (live && live.isConnected) return live;
  if (typeof document === 'undefined' || !document.body) return null;
  live = document.getElementById('paws-live');
  if (!live) {
    live = document.createElement('div');
    live.id = 'paws-live';
    live.className = 'vh';
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    document.body.appendChild(live);
  }
  return live;
}
export function announce(words) {
  const el = liveRegion();
  if (!el) return;
  el.textContent = '';
  clearTimeout(liveTimer);
  liveTimer = setTimeout(() => { el.textContent = String(words == null ? '' : words); }, 60);
}

// Copy to the clipboard. The button says "Copied" for 1.2 seconds, or "Select and copy" if the browser refused.
const flashing = new WeakMap();
function flash(btn, words) {
  let st = flashing.get(btn);
  if (st) clearTimeout(st.timer); else st = { html: btn.innerHTML };
  btn.textContent = words;
  st.timer = setTimeout(() => { btn.innerHTML = st.html; flashing.delete(btn); }, 1200);
  flashing.set(btn, st);
}
// For a browser with no clipboard API (some school browsers, and any page not on https).
function oldCopy(s) {
  try {
    const back = document.activeElement, ta = document.createElement('textarea');
    ta.value = s;
    ta.setAttribute('readonly', '');
    ta.setAttribute('aria-hidden', 'true');
    ta.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    if (back && typeof back.focus === 'function') back.focus();
    return !!ok;
  } catch (e) { return false; }
}
export async function copy(t, button) {
  const s = String(t == null ? '' : t);
  let ok = false;
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(s); ok = true; }
  } catch (e) {}
  if (!ok && typeof document !== 'undefined') ok = oldCopy(s);
  if (button) flash(button, ok ? 'Copied' : 'Select and copy');
  announce(ok ? 'Copied.' : 'Could not copy. Select the words and copy them.');
  return ok;
}

// ---------- the chrome: Start / Carry on, the menu button, the trail ----------
let mounted = null;      // { page, stage, sub } once a page has called mount()
let resetSeen = null;    // the reset time this page loaded with; a different one means the work on screen has gone
let T = null;            // the trail's nodes, built once

// Attributes are only written when they change: every class or hidden change makes pencil.js walk the whole page.
const setClass = (el, c) => { if (el.className !== c) el.className = c; };
const setHidden = (el, on) => { if (el.hidden !== on) el.hidden = on; };
const setWords = (el, t) => { if (el.textContent !== t) el.textContent = t; };
const setAttr = (el, name, v) => {
  if (v == null) { if (el.hasAttribute(name)) el.removeAttribute(name); }
  else if (el.getAttribute(name) !== v) el.setAttribute(name, v);
};

const TICK = '<svg class="trail-i" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 13l4 4 10-11"/></svg>';
const LOCK = '<svg class="trail-i" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

// Built once. Each stage has a link and a locked twin that is not a link; one of the two is hidden. After this
// only classes, hidden words, addresses and aria-current change, so a link that has the focus is never replaced.
function buildTrail(el) {
  el.classList.add('trail');
  if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', 'Your comic, step by step');
  el.setAttribute('data-nopencil', '');
  el.innerHTML = '<p class="trail-now"></p><ol class="trail-list">' + STAGES.map(s => {
    const face = '<span class="trail-n" aria-hidden="true">' + s.n + '</span><span class="trail-t">' + esc(s.name) + '</span>';
    return '<li style="--c:' + esc(s.colour) + '">'
      + '<a href="' + esc(hrefFor(s.n)) + '">' + face + TICK + '<span class="trail-here" aria-hidden="true">You’re here</span><span class="vh"></span></a>'
      + '<span class="trail-lock" hidden>' + face + LOCK + '<span class="vh"></span></span></li>';
  }).join('') + '</ol><ol class="trail-subs" aria-label="Inside this step"></ol>'
    + '<p class="trail-note is-ahead" hidden>You have jumped ahead. <a href="' + esc(hrefFor(1)) + '"></a></p>'
    + '<p class="trail-note">Saved on this device only. It will not follow you to another device. '
    + '<button type="button" class="linkbtn" data-reset>Start again</button></p>';
  const ahead = el.querySelector('.trail-note.is-ahead');
  T = {
    el, now: el.querySelector('.trail-now'), nowHTML: '', subs: el.querySelector('.trail-subs'), subsFor: null, ahead, aheadLink: ahead.querySelector('a'),
    items: Array.from(el.querySelectorAll('.trail-list > li')).map(li => {
      const a = li.querySelector('a'), lock = li.querySelector('.trail-lock');
      return { li, a, lock, aWords: a.querySelector('.vh'), lockWords: lock.querySelector('.vh') };
    }),
  };
}

// What the trail shows for a journey, the page's stage (0 or nothing for a page with no stage) and its substep.
// Worked out apart from the drawing, so the rules can be tested with no page. Every state comes out as a class
// and as words for a screen reader, so nothing is told by colour alone.
export function _trail(j, stage, sub) {
  const cur = stageOf(Number(stage)) ? Number(stage) : 0, f = frontier(j), ahead = cur > f;
  const shown = stageOf(cur || f), st = stageOf(cur);
  const at = st ? st.subs.findIndex(([id]) => id === sub) : -1;
  return {
    now: { n: shown.n, name: shown.name, next: !cur },
    stages: STAGES.map(s => {
      const here = s.n === cur, done = !!j.done[s.n];
      // Past the frontier a stage is locked and not a link, unless the learner is standing on it (they jumped ahead).
      const locked = s.n > f && !here;
      let said = '';
      if (locked) said = ' (locked: finish step ' + f + ' first)';
      else if (here) said = ahead ? ' (you are here, you jumped ahead)' : done ? ' (done, you are here)' : ' (you are here)';
      else if (done) said = ' (done)';
      else if (s.n === f) said = ' (your next step)';
      return { n: s.n, here, locked, said, href: hrefFor(s.n),
        cls: [done && 'is-done', here && 'is-current', here && ahead && 'is-ahead', locked && 'is-locked'].filter(Boolean).join(' ') };
    }),
    // Stage 1's small steps are a choice of modes, not a sequence, so none of them is ever "done".
    subs: st ? st.subs.map(([id, label], i) => {
      const here = i === at, done = cur !== 1 && at > -1 && i < at;
      return { id, label, here, cls: here ? 'is-current' : done ? 'is-done' : '', said: done ? ' (done)' : '' };
    }) : [],
    ahead: ahead ? { words: 'Your next step is ' + f + ': ' + stageOf(f).name + '.', href: hrefFor(f) } : null,
  };
}

function drawTrail(j) {
  const el = document.getElementById('trail');
  if (!el) return;
  if (!T || T.el !== el || !el.firstChild) buildTrail(el);
  const cur = mounted.stage || 0, v = _trail(j, cur, mounted.sub);
  const nowHTML = (v.now.next ? 'Next: step ' : 'Step ') + v.now.n + ' of ' + STAGES.length + ': <b>' + esc(v.now.name) + '</b>';
  if (T.nowHTML !== nowHTML) { T.now.innerHTML = nowHTML; T.nowHTML = nowHTML; }

  v.stages.forEach((s, i) => {
    const it = T.items[i];
    setClass(it.li, s.cls);
    setHidden(it.a, s.locked);
    setHidden(it.lock, !s.locked);
    setWords(it.aWords, s.locked ? '' : s.said);
    setWords(it.lockWords, s.locked ? s.said : '');
    setAttr(it.a, 'href', s.href);
    setAttr(it.a, 'aria-current', s.here ? 'step' : null);
  });

  // The small steps inside this stage are plain text (nothing in them takes focus), so the list is rebuilt
  // when the stage changes and only patched otherwise.
  if (T.subsFor !== cur) {
    T.subs.innerHTML = v.subs.map(s => '<li data-sub="' + esc(s.id) + '">' + esc(s.label) + '<span class="vh"></span></li>').join('');
    T.subsFor = cur;
  }
  Array.from(T.subs.children).forEach((li, i) => {
    const s = v.subs[i];
    setClass(li, s.cls);
    setAttr(li, 'aria-current', s.here ? 'step' : null);
    setWords(li.lastChild, s.said);
  });

  setHidden(T.ahead, !v.ahead);
  if (v.ahead) {
    setWords(T.aheadLink, v.ahead.words);
    setAttr(T.aheadLink, 'href', v.ahead.href);
  }
}

// The first sidebar link is Start until there is something to carry on with. It is never marked as the current page.
function drawStart(j) {
  const a = document.querySelector('#sideNav [data-nav="start"]');
  if (!a) return;
  const on = isStarted(j);
  setAttr(a, 'href', on ? resumeHref(j) : BASE + 'references/?start=1');
  const label = a.querySelector('span');
  if (label) setWords(label, on ? 'Carry on' : 'Start');
}

function refresh() {
  if (!mounted || typeof document === 'undefined') return;
  const j = get();
  drawStart(j);
  drawTrail(j);
}

// The narrow screen's menu. CSS keeps the links closed from the first paint (class js on <html>); here the
// button appears and opens them. Escape closes it and puts the focus on the button, wherever the focus was.
// A press outside the bar, or the focus leaving it, closes it and leaves the focus alone.
function wireMenu() {
  const side = document.querySelector('.side'), nav = document.getElementById('sideNav');
  const btn = side && side.querySelector('.menu-btn');
  if (!btn || !nav) return;
  btn.hidden = false;
  const isOpen = () => nav.classList.contains('is-open');
  const set = open => { nav.classList.toggle('is-open', open); btn.setAttribute('aria-expanded', open ? 'true' : 'false'); };
  btn.addEventListener('click', () => set(!isOpen()));
  // In the capture phase, and stopped there, so one press of Escape closes one thing: a page's own Escape
  // handler (the big screen on Look Closely) does not also run.
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !isOpen()) return;
    e.stopPropagation();
    set(false);
    btn.focus();
  }, true);
  document.addEventListener('pointerdown', e => { if (isOpen() && !side.contains(e.target)) set(false); });
  side.addEventListener('focusout', e => { if (isOpen() && e.relatedTarget && !side.contains(e.relatedTarget)) set(false); });
}

// Every [data-reset] button, including ones added later, opens the dialog. data-reset="all" opens it with every box ticked.
function wireResets() {
  document.addEventListener('click', e => {
    const b = e.target && e.target.closest ? e.target.closest('[data-reset]') : null;
    if (!b) return;
    e.preventDefault();
    confirmReset({ who: 'learner', all: b.getAttribute('data-reset') === 'all', opener: b });
  });
}

// Another tab, or coming back to a page the browser kept in memory: redraw the chrome. If the device was
// reset meanwhile, the page itself is out of date, so load it again.
function wireStorage() {
  window.addEventListener('storage', e => {
    if (e.key === RESET_AT) { location.reload(); return; }
    if (e.key === KEY || e.key === null) refresh();
  });
  window.addEventListener('pageshow', e => {
    if (!e.persisted) return;
    if (store.get(RESET_AT) !== resetSeen) { location.reload(); return; }
    refresh();
  });
}

// ?start=1 on any page begins the journey; ?reset=1 on the home page opens Start again with every box ticked.
// Each is taken out of the address at once (other parameters and the hash stay), so a reload does not repeat it.
function readAddress(page) {
  let q;
  try { q = new URLSearchParams(location.search); } catch (e) { return; }
  const drop = name => {
    q.delete(name);
    const rest = q.toString();
    try { history.replaceState(history.state, '', location.pathname + (rest ? '?' + rest : '') + location.hash); } catch (e) {}
  };
  if (q.get('start') === '1') { start(); drop('start'); }
  if (page === 'home' && q.get('reset') === '1') { drop('reset'); confirmReset({ who: 'learner', all: true }); }
}

// Call once per page: mount({ page, stage?, sub? }) with page one of home, look, picture, builder, teachers, explore.
// It does not record a visit: only start(), setStage() and setSub() move the saved stage.
export function mount(opts) {
  if (typeof document === 'undefined') return;
  const o = opts || {}, first = !mounted;
  mounted = { page: o.page || '', stage: stageOf(Number(o.stage)) ? Number(o.stage) : undefined, sub: o.sub };
  liveRegion();
  if (first) {
    resetSeen = store.get(RESET_AT);
    wireMenu();
    wireResets();
    wireStorage();
    readAddress(mounted.page);
  }
  refresh();
}

const J = {
  STAGES, BASE, get, save, start, setStage, setSub, markDone, frontier, isStarted, hrefFor, resumeHref, reset, confirmReset,
  mount, scrollTo, focusHeading, announce, words, esc, copy, tierRank, _setStorage, _trail,
};
export default J;
