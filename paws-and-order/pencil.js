// Pencil lines: replaces the straight CSS borders with wobbly, doubled, hand-drawn ones.
// It draws each border as an SVG picture and lays it in the element's background, so it works on
// boxes, buttons and text boxes alike. If this script does not run, the normal CSS borders stay.
// To keep an element's plain border, give it  data-nopencil.

const SKIP = '.sheet *, .prose-page *, svg, [data-nopencil]';

function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Smooth wander along a line: two slow waves plus a tiny grain.
function wander(rand, amp) {
  const p1 = rand() * 6.28, p2 = rand() * 6.28, k1 = 38 + rand() * 30, k2 = 11 + rand() * 9;
  return s => amp * (0.62 * Math.sin(s / k1 + p1) + 0.38 * Math.sin(s / k2 + p2)) + (rand() - 0.5) * amp * 0.28;
}

// Points around a rounded rectangle, each with its outward normal.
function roundedSamples(x, y, w, h, r, step) {
  const pts = [];
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  const seg = (x0, y0, x1, y1, nx, ny) => {
    const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(len / step));
    for (let i = 0; i < n; i++) { const t = i / n; pts.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, nx, ny]); }
  };
  const arc = (cx, cy, a0) => {
    const n = Math.max(2, Math.round((rr * 1.57) / step));
    for (let i = 0; i < n; i++) { const a = a0 + (i / n) * Math.PI / 2; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, Math.cos(a), Math.sin(a)]); }
  };
  seg(x + rr, y, x + w - rr, y, 0, -1); arc(x + w - rr, y + rr, -Math.PI / 2);
  seg(x + w, y + rr, x + w, y + h - rr, 1, 0); arc(x + w - rr, y + h - rr, 0);
  seg(x + w - rr, y + h, x + rr, y + h, 0, 1); arc(x + rr, y + h - rr, Math.PI / 2);
  seg(x, y + h - rr, x, y + rr, -1, 0); arc(x + rr, y + rr, Math.PI);
  return pts;
}

const f = n => Math.round(n * 10) / 10;
// Quadratic smoothing through the midpoints, so the line has no corners of its own.
function smooth(P, closed) {
  if (P.length < 2) return '';
  let d = '';
  if (closed) {
    const m = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], s = m(P[P.length - 1], P[0]);
    d = 'M' + f(s[0]) + ' ' + f(s[1]);
    for (let i = 0; i < P.length; i++) { const c = P[i], e = m(P[i], P[(i + 1) % P.length]); d += 'Q' + f(c[0]) + ' ' + f(c[1]) + ' ' + f(e[0]) + ' ' + f(e[1]); }
    return d + 'Z';
  }
  d = 'M' + f(P[0][0]) + ' ' + f(P[0][1]);
  for (let i = 1; i < P.length - 1; i++) { const c = P[i], e = [(P[i][0] + P[i + 1][0]) / 2, (P[i][1] + P[i + 1][1]) / 2]; d += 'Q' + f(c[0]) + ' ' + f(c[1]) + ' ' + f(e[0]) + ' ' + f(e[1]); }
  const l = P[P.length - 1];
  return d + 'L' + f(l[0]) + ' ' + f(l[1]);
}

function radiusOf(cs, corner, W, H) {
  const v = cs['border' + corner + 'Radius'].split(' ')[0];
  const n = parseFloat(v) || 0;
  return v.endsWith('%') ? n * Math.min(W, H) / 100 : n;
}

function strokeStyle(kind, bw) {
  if (kind === 'dashed') return ' stroke-dasharray="' + f(bw * 3.6) + ' ' + f(bw * 2.4) + '"';
  if (kind === 'dotted') return ' stroke-dasharray="0.1 ' + f(bw * 2.3) + '"';
  return '';
}

function build(el, cs, W, H) {
  const S = ['Top', 'Right', 'Bottom', 'Left'].map(n => ({
    w: parseFloat(cs['border' + n + 'Width']) || 0, kind: cs['border' + n + 'Style'], c: cs['border' + n + 'Color'],
  }));
  const on = S.map(s => s.w > 0 && s.kind !== 'none' && s.kind !== 'hidden' && !/rgba\(\d+, \d+, \d+, 0\)/.test(s.c));
  if (!on.some(Boolean)) return null;
  const rand = rng(hash(el.tagName + '|' + (el.className || '') + '|' + (el.textContent || '').slice(0, 24)));
  let body = '';
  const line = (d, c, bw, kind, op) => '<path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="' + f(bw) + '" stroke-linecap="round" stroke-linejoin="round" opacity="' + op + '"' + strokeStyle(kind, bw) + '/>';
  const same = on.every(Boolean) && S.every(s => s.w === S[0].w && s.kind === S[0].kind && s.c === S[0].c);
  if (same) {
    const bw = S[0].w, ins = bw / 2 + 0.6;
    const r = Math.max(radiusOf(cs, 'TopLeft', W, H), radiusOf(cs, 'TopRight', W, H), radiusOf(cs, 'BottomLeft', W, H), radiusOf(cs, 'BottomRight', W, H)) * 0.8;
    for (let pass = 0; pass < (S[0].kind === 'solid' ? 2 : 1); pass++) {
      const base = roundedSamples(ins, ins, W - 2 * ins, H - 2 * ins, r, 9), wob = wander(rand, Math.min(1.1, bw * 0.4)), pts = [];
      let s = 0;
      base.forEach((p, i) => { if (i) s += Math.hypot(p[0] - base[i - 1][0], p[1] - base[i - 1][1]); const o = wob(s); pts.push([p[0] + p[2] * o, p[1] + p[3] * o]); });
      body += pass ? line(smooth(pts, true), S[0].c, Math.max(1, bw * 0.4), 'solid', 0.55) : line(smooth(pts, true), S[0].c, bw * 0.78, S[0].kind, 0.94);
    }
  } else {
    // one or more single sides: a bowed, wobbly line for each
    const geo = [
      () => [[0, S[0].w / 2 + 0.3], [W, S[0].w / 2 + 0.3]],
      () => [[W - S[1].w / 2 - 0.3, 0], [W - S[1].w / 2 - 0.3, H]],
      () => [[W, H - S[2].w / 2 - 0.3], [0, H - S[2].w / 2 - 0.3]],
      () => [[S[3].w / 2 + 0.3, H], [S[3].w / 2 + 0.3, 0]],
    ];
    S.forEach((sd, i) => {
      if (!on[i]) return;
      const [a, b] = geo[i](), len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(2, Math.round(len / 9));
      const nx = -(b[1] - a[1]) / len, ny = (b[0] - a[0]) / len, wob = wander(rand, Math.min(1.1, sd.w * 0.45)), pts = [];
      for (let k = 0; k <= n; k++) { const t = k / n, o = wob(t * len); pts.push([a[0] + (b[0] - a[0]) * t + nx * o, a[1] + (b[1] - a[1]) * t + ny * o]); }
      body += line(smooth(pts, false), sd.c, sd.w * (sd.kind === 'solid' ? 0.78 : 0.85), sd.kind, 0.9);
    });
  }
  return { svg: '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">' + body + '</svg>', on };
}

const SIDES = ['Top', 'Right', 'Bottom', 'Left'];
function sketch(el) {
  // Undo only what this script drew last time. An element's own background picture or border colour stays:
  // clearing them all used to wipe pictures set on the page (the home page cards) whenever a card was redrawn.
  if (el.__pp) {
    if (el.__pp.bg) ['image', 'size', 'repeat', 'position', 'origin'].forEach(k => el.style.removeProperty('background-' + k));
    (el.__pp.sides || []).forEach(s => el.style.removeProperty('border-' + s.toLowerCase() + '-color'));
    if (el.__pp.shadow) el.style.removeProperty('box-shadow');
  }
  const W = el.offsetWidth, H = el.offsetHeight;
  const cs = getComputedStyle(el);
  const key = W + 'x' + H + '|' + el.className;
  if (W < 14 || H < 8 || cs.display === 'none' || cs.backgroundImage !== 'none') { el.__pp = { key, shadow: false }; return; }
  const out = build(el, cs, W, H);
  el.__pp = { key, shadow: false };
  if (!out) return;
  el.style.backgroundImage = 'url("data:image/svg+xml,' + encodeURIComponent(out.svg) + '")';
  el.style.backgroundSize = '100% 100%'; el.style.backgroundRepeat = 'no-repeat'; el.style.backgroundPosition = '0 0'; el.style.backgroundOrigin = 'border-box';
  el.__pp.bg = true; el.__pp.sides = [];
  out.on.forEach((v, i) => { if (v) { el.style['border' + SIDES[i] + 'Color'] = 'transparent'; el.__pp.sides.push(SIDES[i]); } });
  if (cs.boxShadow !== 'none' && !/inset/.test(cs.boxShadow)) { el.style.boxShadow = 'none'; el.__pp.shadow = true; }
}

function run() {
  document.querySelectorAll('body *').forEach(el => {
    if (el.closest(SKIP) || el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'OPTION') return;
    if (el.tagName === 'DIALOG' && !el.open) return;
    if (el.tagName === 'INPUT' && /checkbox|radio|file|range|hidden/.test(el.type)) return;
    if (el.__pp && el.__pp.key === el.offsetWidth + 'x' + el.offsetHeight + '|' + el.className) return;
    sketch(el);
  });
}

let queued = false;
function later() { if (queued) return; queued = true; setTimeout(() => { queued = false; run(); }, 90); }

run();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(later);
window.addEventListener('resize', later);
window.addEventListener('load', later);
new MutationObserver(later).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'open'] });
