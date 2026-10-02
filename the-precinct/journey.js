// The Precinct journey: the five steps every page shows, and where a learner
// is in them. The step names and their order match Paws & Order on purpose.
//
// Nothing new is stored for it: the steps are worked out from what the case
// file already keeps in this browser (localStorage 'precinct_journey'), so
// work begun before this file existed still counts. The cases (Character,
// Location, Scene, Page, Review) are kinds of case, and Rookie, Detective and
// Commissioner are levels: neither is a step.
//
// Pages call mount() once. The case file hands in its own copy of the journey,
// so the bar follows it without waiting for a save. This file only reads
// theme.js and copycheck.js; it changes neither, so nothing the Worker runs
// is touched.

import THEME from './theme.js';
import { words } from './copycheck.js';

export const BASE = '/the-precinct/';
const KEY = 'precinct_journey';
const MIN_WORDS = 15;   // the floor the briefing desk asks of a description

export const STEPS = [
  { n: 1, id: 'look',   name: 'Look closely',        noir: 'Study the evidence',   href: 'references/' },
  { n: 2, id: 'choose', name: 'Choose and describe', noir: 'Build the case file',  href: 'case/#choose' },
  { n: 3, id: 'create', name: 'Create with AI',      noir: 'Send the brief',       href: 'case/#create' },
  { n: 4, id: 'check',  name: 'Check and improve',   noir: 'Compare the evidence', href: 'case/#check' },
  { n: 5, id: 'build',  name: 'Build and share',     noir: 'Close the case',       href: 'builder/' },
];

// The parts of a case, in order, and the step each belongs to. The keys are
// the ones the case file has always saved its place under.
export const PARTS = {
  who:     { step: 2, label: 'Choose a character' },
  place:   { step: 2, label: 'Add a place' },
  palette: { step: 2, label: 'Choose a palette' },
  notice:  { step: 2, label: 'Write what you notice' },
  brief:   { step: 3, label: 'Get my brief' },
  make:    { step: 3, label: 'Make the picture' },
  compare: { step: 4, label: 'Check and improve' },
};

export const CASES = THEME.cases;
export const caseOf = n => CASES.find(c => c.n === Number(n));
const stepOf = n => STEPS.find(s => s.n === Number(n));

// ---------- the saved journey ----------
// Browser storage can be missing or blocked; every page works without it.
const box = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
};

// A journey with every part in place, whatever was saved.
export function tidy(raw) {
  const j = Object.assign({ c: 1, at: {}, subj: {}, ref: {}, done: {}, work: {}, platform: null, palette: null },
    raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {});
  ['at', 'subj', 'ref', 'done', 'work'].forEach(k => { if (!j[k] || typeof j[k] !== 'object' || Array.isArray(j[k])) j[k] = {}; });
  j.c = caseOf(j.c) ? Number(j.c) : 1;   // a number, whatever was saved
  return j;
}
export function read() {
  let raw = null;
  try { raw = JSON.parse(box.get(KEY) || 'null'); } catch (e) {}
  return tidy(raw);
}
// Read, change, write: for the pages that do not keep the journey open
// themselves (Look closely, the comic builder).
export function change(fn) {
  const j = read();
  fn(j);
  box.set(KEY, JSON.stringify(j));
  refresh();
  return j;
}
const tick = (j, n, k) => {
  const d = Array.isArray(j.done[n]) ? j.done[n] : (j.done[n] = []);
  if (!d.includes(k)) d.push(k);
};
// Step 5 is finished by pressing Finish in the comic builder, for the case on
// the desk. (Step 1's tick travels with the description Look closely sends on.)
export const markBuilt = () => change(j => tick(j, j.c, 'build'));

export function subjectOf(j, c) {
  return (c.swap && (j.subj[c.n] === 'setting' || j.subj[c.n] === 'character')) ? j.subj[c.n] : c.subject;
}
// A setting has no character to choose and is its own place. Review is the check alone.
export function partsOf(j, c) {
  if (!c.tier) return ['compare'];
  return subjectOf(j, c) === 'character' ? ['who', 'place', 'palette', 'notice', 'brief', 'make', 'compare'] : ['palette', 'notice', 'brief', 'make', 'compare'];
}

// Which of the five steps are finished for a case. A step is finished by
// something the learner did, never by a visit.
export function status(j, n) {
  const c = caseOf(n == null ? j.c : n) || CASES[0];
  const d = Array.isArray(j.done[c.n]) ? j.done[c.n] : [];
  const w = j.work[c.n] && typeof j.work[c.n] === 'object' ? j.work[c.n] : {};
  const subject = subjectOf(j, c), has = k => d.includes(k);
  const described = words(typeof w.attempt === 'string' ? w.attempt : '').length;
  const brief = !!(w.brief && Array.isArray(w.brief.prompts) && w.brief.prompts.length);
  const skip = c.tier ? {} : { 1: true, 2: true, 3: true };   // Review starts at the check
  const done = c.tier ? {
    1: has('look') || described > 0 || !!String(w.notes || '').trim(),
    2: (subject === 'setting' || (Array.isArray(w.cast) && w.cast.length > 0) || !!w.own) && described >= MIN_WORDS,
    3: brief && has('make'),
    4: has('compare') || has('check'),
    5: has('build'),
  } : { 1: false, 2: false, 3: false, 4: has('compare') || has('check'), 5: has('build') };
  let frontier = 1;
  while (frontier < STEPS.length && (done[frontier] || skip[frontier])) frontier++;
  return { c: c.n, kase: c, subject, parts: partsOf(j, c), done, skip, frontier, all: STEPS.every(s => done[s.n] || skip[s.n]) };
}

export function begun(j) {
  return !!(j.started
    || Object.values(j.done).some(d => Array.isArray(d) && d.length)
    || Object.values(j.work).some(w => w && (w.notes || w.attempt || w.idea)));
}

// Where the learner was last working: the part the case file saved, unless
// that is past the first unfinished step, or is the end of a finished step
// (then the next thing to do is the step after it).
export function position(j) {
  const st = status(j), at = j.at[st.c], p = st.parts.includes(at) ? PARTS[at] : null;
  const last = p && st.parts.filter(k => PARTS[k].step === p.step).pop() === at;
  const step = p && p.step <= st.frontier && !(st.done[p.step] && last) ? p.step : st.frontier;
  // The part is named only when it is the one the case file will open at: the saved one.
  return { step, part: p && p.step === step ? at : null };
}

// The one start or continue action: what it says and where it goes.
export function resume(j) {
  const st = status(j);
  if (!begun(j)) return { kind: 'start', label: 'Start Case 0' + st.c, short: 'Start', href: BASE + 'references/?start=1' };
  if (st.all) {
    const next = st.kase.tier ? caseOf(st.c + 1) : null;
    if (next && next.tier) return { kind: 'next', label: 'Start the next case', short: 'Next case', href: BASE + 'references/?case=' + next.n };
    return { kind: 'comic', label: 'Open my comic', short: 'My comic', href: BASE + 'builder/' };
  }
  const pos = position(j), s = stepOf(pos.step);
  const name = pos.part && pos.step !== 4 ? PARTS[pos.part].label : s.name;
  return { kind: 'continue', label: 'Continue Step ' + s.n + ': ' + name, short: 'Continue', href: BASE + s.href };
}

// What finishing a step takes, said when a later step is locked.
const TO_FINISH = {
  1: 'Step 1 is finished when you press “Next: Choose and describe” on the Look closely page.',
  2: 'Step 2 is finished when you have chosen who or what you are drawing and written at least 15 words about it.',
  3: 'Step 3 is finished when you have your brief and press “I’ve made my picture”.',
  4: 'Step 4 is finished when you press “Next: Build my comic”.',
};

// What the bar shows for a journey and the step the page is on (0 for a page
// with no step). Worked out apart from the drawing so it can be tested with
// no page. Every state is words as well as a class: nothing is told by colour alone.
export function trailView(j, cur) {
  const st = status(j), f = st.frontier, here = stepOf(cur) ? Number(cur) : 0;
  const ahead = here > f;
  const shown = stepOf(here || f);
  return {
    kase: 'Case 0' + st.c,
    now: { n: shown.n, name: shown.name, noir: shown.noir, next: !here },
    steps: STEPS.map(s => {
      const isHere = s.n === here, done = !!st.done[s.n], skip = !!st.skip[s.n] && !isHere;
      const locked = s.n > f && !isHere;
      const state = skip ? 'Not in this case' : locked ? 'Locked' : isHere ? 'You are here' : done ? 'Done' : s.n === f ? 'Next' : '';
      const why = skip ? 'This case is the check on its own, so it starts at Step 4. Change case to use Steps 1 to 3.'
        : locked ? 'Step ' + s.n + ' is locked. Finish Step ' + f + ' first. ' + TO_FINISH[f] : '';
      return { n: s.n, name: s.name, href: BASE + s.href, here: isHere, done, locked: locked || skip, state, why,
        cls: [done && 'is-done', isHere && 'is-current', (locked || skip) && 'is-locked'].filter(Boolean).join(' ') };
    }),
    ahead: ahead ? { words: 'Your next step is ' + f + ': ' + stepOf(f).name + '.', href: BASE + stepOf(f).href } : null,
  };
}

// ---------- the page ----------
let mounted = null;   // { page, step, part, journey } once a page has called mount()
let T = null;         // the bar's nodes, built once
let arrived = false;

const esc = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Only written when they change, so a link that has the focus is never replaced.
const setWords = (el, t) => { if (el.textContent !== t) el.textContent = t; };
const setHidden = (el, on) => { if (el.hidden !== on) el.hidden = on; };
const setAttr = (el, name, v) => {
  if (v == null) { if (el.hasAttribute(name)) el.removeAttribute(name); }
  else if (el.getAttribute(name) !== v) el.setAttribute(name, v);
};

// One polite live region for the page: copied, saved, a choice made, a step opened.
// The words are set a moment after it is cleared, so the same thing said twice is heard twice.
let live = null, liveTimer = 0;
function liveRegion() {
  if (live && live.isConnected) return live;
  if (typeof document === 'undefined' || !document.body) return null;
  live = document.getElementById('precinct-live');
  if (!live) {
    live = document.createElement('div');
    live.id = 'precinct-live';
    live.className = 'sr';
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    document.body.appendChild(live);
  }
  return live;
}
export function announce(t) {
  const el = liveRegion();
  if (!el) return;
  el.textContent = '';
  clearTimeout(liveTimer);
  liveTimer = setTimeout(() => { el.textContent = String(t == null ? '' : t); }, 60);
}

function buildTrail(el) {
  el.classList.add('trail');
  if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', 'Your case, step by step');
  el.innerHTML = '<p class="trail-now"></p><ol class="trail-list">' + STEPS.map(s => {
    const face = '<span class="trail-n" aria-hidden="true">' + s.n + '</span><span class="trail-w"><span class="sr">Step ' + s.n + ': </span>'
      + '<span class="trail-t">' + esc(s.name) + '</span> <span class="trail-s"></span></span>';
    return '<li><a href="' + esc(BASE + s.href) + '">' + face + '</a>'
      + '<button type="button" class="trail-lock" aria-disabled="true" data-n="' + s.n + '" hidden>' + face + '</button></li>';
  }).join('') + '</ol><p class="trail-part" hidden></p>'
    + '<p class="trail-note is-ahead" hidden>You have jumped ahead. <a href=""></a></p>'
    + '<p class="trail-note" role="status"></p>';
  const ahead = el.querySelector('.trail-note.is-ahead');
  T = {
    el, now: el.querySelector('.trail-now'), nowHTML: null, part: el.querySelector('.trail-part'), noteFor: 0,
    ahead, aheadLink: ahead.querySelector('a'), note: el.querySelector('.trail-note:not(.is-ahead)'),
    items: Array.from(el.querySelectorAll('.trail-list > li')).map(li => {
      const a = li.querySelector('a'), lock = li.querySelector('.trail-lock');
      return { li, a, lock, aState: a.querySelector('.trail-s'), lockState: lock.querySelector('.trail-s') };
    }),
  };
  // A locked step says why when it is pressed: in the bar for the eye, and aloud (the note is a status).
  el.addEventListener('click', e => {
    const b = e.target.closest('.trail-lock');
    if (b) { T.note.textContent = b.dataset.why || ''; T.noteFor = Number(b.dataset.n); }
  });
}

function drawTrail(j) {
  const el = document.getElementById('trail');
  if (!el) return;
  if (!T || T.el !== el || !el.firstChild) buildTrail(el);
  const v = trailView(j, mounted.step || 0);
  const nowHTML = '<span class="trail-case">' + esc(v.kase) + '</span> ' + (v.now.next ? 'Next: step ' : 'Step ') + v.now.n + ' of ' + STEPS.length
    + ': <b>' + esc(v.now.name) + '</b> <span class="trail-noir">' + esc(v.now.noir) + '</span>';
  if (T.nowHTML !== nowHTML) { T.now.innerHTML = nowHTML; T.nowHTML = nowHTML; }
  v.steps.forEach((s, i) => {
    const it = T.items[i];
    if (it.li.className !== s.cls) it.li.className = s.cls;
    setHidden(it.a, s.locked);
    setHidden(it.lock, !s.locked);
    setWords(it.aState, s.locked ? '' : s.state);
    setWords(it.lockState, s.locked ? s.state : '');
    setAttr(it.a, 'aria-current', s.here ? 'step' : null);
    setAttr(it.lock, 'data-why', s.locked ? s.why : null);
  });
  // The reason a step was locked goes once that step opens.
  if (T.noteFor && !v.steps[T.noteFor - 1].locked) { setWords(T.note, ''); T.noteFor = 0; }
  const p = mounted.part;
  setHidden(T.part, !p);
  if (p) setWords(T.part, (p.of > 1 ? 'Part ' + p.i + ' of ' + p.of + ': ' : '') + p.label);
  setHidden(T.ahead, !v.ahead);
  if (v.ahead) { setWords(T.aheadLink, v.ahead.words); setAttr(T.aheadLink, 'href', v.ahead.href); }
}

// Every start or continue link on the page says the same thing and goes to the same place.
function drawResume(j) {
  const r = resume(j);
  document.querySelectorAll('[data-resume]').forEach(a => {
    const full = a.dataset.resume === 'full', lab = a.querySelector('.lab') || a;
    setAttr(a, 'href', r.href);
    setWords(lab, full ? r.label : r.short);
    setAttr(a, 'aria-label', full ? null : r.label);
  });
}

export function refresh() {
  if (!mounted || typeof document === 'undefined') return;
  const j = mounted.journey ? mounted.journey() : read();
  drawResume(j);
  drawTrail(j);
}

// The menu button: every link on a narrow screen, the quieter ones (About,
// the AI key page, HeutaLab) on a wide one. Escape closes it and puts the
// focus back on the button; a press outside, or the focus leaving, closes it.
function wireMenu() {
  const top = document.querySelector('.top'), nav = document.getElementById('siteNav');
  const btn = top && top.querySelector('.menu-btn');
  if (!btn || !nav) return;
  btn.hidden = false;
  const isOpen = () => nav.classList.contains('is-open');
  const set = open => { nav.classList.toggle('is-open', open); btn.setAttribute('aria-expanded', open ? 'true' : 'false'); };
  btn.addEventListener('click', () => set(!isOpen()));
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !isOpen()) return;
    e.stopPropagation();
    set(false);
    btn.focus();
  }, true);
  document.addEventListener('pointerdown', e => { if (isOpen() && !top.contains(e.target)) set(false); });
  top.addEventListener('focusout', e => { if (isOpen() && e.relatedTarget && !top.contains(e.relatedTarget)) set(false); });
}

// Another tab changed the journey, or the browser brought this page back from memory.
function wireStorage() {
  window.addEventListener('storage', e => { if (e.key === KEY || e.key === null) refresh(); });
  window.addEventListener('pageshow', e => { if (e.persisted) refresh(); });
}

// ?start=1 begins the journey and ?case=N puts that case on the desk. Each is
// taken out of the address at once, so a reload does not repeat it. A page that
// keeps the journey open itself calls this before it reads the journey.
export function arrive() {
  if (arrived || typeof location === 'undefined') return;
  arrived = true;
  let q;
  try { q = new URLSearchParams(location.search); } catch (e) { return; }
  const start = q.get('start') === '1', kase = caseOf(q.get('case'));
  if (!start && !kase) return;
  const j = read();
  j.started = j.started || new Date().toISOString();
  if (kase) j.c = kase.n;
  box.set(KEY, JSON.stringify(j));
  q.delete('start'); q.delete('case');
  const rest = q.toString();
  try { history.replaceState(history.state, '', location.pathname + (rest ? '?' + rest : '') + location.hash); } catch (e) {}
}

// Call once per page: mount({ page, step?, part?, journey? }). `step` is the
// step the page is (1 to 5), `part` is { i, of, label } for the plain line
// under the bar, and `journey` is a function handing back the page's own copy.
export function mount(opts) {
  if (typeof document === 'undefined') return;
  const first = !mounted;
  mounted = Object.assign({ page: '', step: 0, part: null, journey: null }, opts || {});
  if (first) {
    arrive();
    liveRegion();
    wireMenu();
    wireStorage();
  }
  refresh();
}
// The page moved to another step or part.
export function update(patch) {
  if (!mounted) return;
  Object.assign(mounted, patch || {});
  refresh();
}

const J = {
  BASE, STEPS, PARTS, CASES, caseOf, tidy, read, change, markBuilt, subjectOf, partsOf, status, begun, position, resume,
  trailView, announce, refresh, arrive, mount, update,
};
export default J;
