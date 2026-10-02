// Paws & Order shelf: the two shelves of comics. Featured templates come from theme.js. My comics are the
// pages a learner saved in the Comic Maker: they live in this browser only, in the Comic Maker's own
// database (IndexedDB 'police-pound-builder', object store 'kv', one record per page under 'comic:<id>').
//
// This file imports only theme.js and works out its own addresses, so journey.js can load it on demand
// for a reset without the two files importing each other.

import THEME from './theme.js';

const BASE = new URL('./', import.meta.url).pathname;
const DB = 'police-pound-builder', STORE = 'kv';

const esc = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const styleName = k => (THEME.pageStyles.find(s => s.key === k) || {}).name || '';
const sticker = (s, border) => { const [dir, file] = s.split('/'); return THEME.stickerPath(dir, file, border); };
const dayOf = t => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
const calm = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

// Whoever opens the database first makes the store, exactly as the Comic Maker does. Any failure
// (no IndexedDB, private browsing, a blocked open) gives null, and the shelf then shows as empty.
function openDB() {
  return new Promise(res => {
    try {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => res(r.result);
      r.onerror = () => res(null);
    } catch (e) { res(null); }
  });
}
// One transaction on the store; resolves when it has finished, whatever happened.
function withStore(mode, fn) {
  return openDB().then(db => new Promise(res => {
    if (!db) return res(false);
    const done = ok => { try { db.close(); } catch (e) {} res(ok); };
    try {
      const tx = db.transaction(STORE, mode);
      fn(tx.objectStore(STORE));
      tx.oncomplete = () => done(true);
      tx.onerror = tx.onabort = () => done(false);
    } catch (e) { done(false); }
  }));
}

// THEME.templates, each with the address that opens it in the Comic Maker.
export function templates() {
  return (THEME.templates || []).map(t => Object.assign({}, t, { href: BASE + 'builder/?template=' + encodeURIComponent(t.key) }));
}

// The saved pages, newest first: [{ id, title, thumb (a Blob, or null), at (ms), href }]. Empty if there are none
// or the database cannot be opened.
export async function comics() {
  const rows = [];
  await withStore('readonly', st => {
    const rq = st.openCursor();
    rq.onsuccess = () => {
      const c = rq.result;
      if (!c) return;
      if (String(c.key).startsWith('comic:') && c.value) rows.push(c.value);
      c.continue();
    };
  });
  return rows.sort((a, b) => (b.when || 0) - (a.when || 0)).map(c => ({
    id: c.id, title: c.title || '', thumb: c.thumb || null, at: c.when || 0, href: BASE + 'builder/?comic=' + encodeURIComponent(c.id),
  }));
}

// Empties the Comic Maker's store: the page on the desk, the saved comics and the uploaded pictures.
// It clears the store and never deletes the database, which a page with the Comic Maker open would block.
export function clearAll() {
  return withStore('readwrite', st => { st.clear(); });
}

// Writes the template cards into el.
export function renderTemplates(el) {
  if (!el) return;
  el.classList.add('tpls');
  el.innerHTML = templates().map(t => '<a class="tpl" href="' + esc(t.href) + '">'
    + '<span class="shot' + (t.style === 'noir' ? ' noir' : '') + '" style="background-image:url(' + esc(THEME.thumbPath(t.thumb[0])) + ')">'
    + '<img src="' + esc(sticker(t.thumb[1], false)) + '" alt="" loading="lazy"><span class="tag">' + esc(t.level === 'advanced' ? styleName(t.style) : 'Four panels') + '</span></span>'
    + '<b>' + esc(t.name) + '</b><span class="blurb">' + esc(t.blurb) + '</span></a>').join('');
}

// Writes the My comics row into el: a strip of saved pages with arrows to move along it and a delete button on
// each. opts.empty is the sentence for when there are none (HTML from the page's own markup, never text someone
// typed). Call it again to redraw.
const rows = new WeakMap();
export async function renderComics(el, opts) {
  if (!el) return;
  let st = rows.get(el);
  if (!st) {
    el.innerHTML = '<div class="mine-row"><button type="button" class="mine-arrow prev" aria-label="Show earlier comics" disabled>&lsaquo;</button>'
      + '<div class="mine"></div><button type="button" class="mine-arrow next" aria-label="Show more comics" disabled>&rsaquo;</button></div>';
    st = { row: el.querySelector('.mine'), prev: el.querySelector('.prev'), next: el.querySelector('.next'), urls: [], empty: '' };
    rows.set(el, st);
    const arrows = () => {
      const r = st.row, more = r.scrollWidth > r.clientWidth + 4;
      st.prev.disabled = !more || r.scrollLeft < 4;
      st.next.disabled = !more || r.scrollLeft + r.clientWidth > r.scrollWidth - 4;
    };
    st.arrows = arrows;
    const slide = dir => st.row.scrollBy({ left: dir * st.row.clientWidth, behavior: calm() ? 'auto' : 'smooth' });
    st.row.addEventListener('scroll', arrows, { passive: true });
    window.addEventListener('resize', arrows);
    st.prev.addEventListener('click', () => slide(-1));
    st.next.addEventListener('click', () => slide(1));
    st.row.addEventListener('click', async e => {
      const b = e.target.closest('[data-rm]');
      if (!b) return;
      if (!confirm('Delete this comic from My comics? This can’t be undone.')) return;
      await withStore('readwrite', s => { s.delete('comic:' + b.dataset.rm); });
      await renderComics(el);
      // the button that was pressed has gone: put the focus on what is there now
      const next = st.row.querySelector('.comic a.open, .mine-empty a');
      if (next) next.focus();
    });
  }
  if (opts && typeof opts.empty === 'string') st.empty = opts.empty;
  const list = await comics();
  st.urls.forEach(u => URL.revokeObjectURL(u));
  st.urls = [];
  st.row.classList.toggle('is-empty', !list.length);
  if (!list.length) {
    st.row.innerHTML = '<div class="mine-empty"><img src="' + esc(THEME.stickerPath('nettle', 'face-thinking', true)) + '" alt=""><span>'
      + (st.empty || 'Nothing here yet. Build a page in the <a href="' + esc(BASE + 'builder/') + '">Comic Maker</a>, or start from a template, then press <b>Save to My comics</b>.')
      + '</span></div>';
  } else {
    st.row.innerHTML = list.map(c => {
      const u = c.thumb ? URL.createObjectURL(c.thumb) : '';
      if (u) st.urls.push(u);
      return '<article class="comic"><a class="open" href="' + esc(c.href) + '" title="Open it in the Comic Maker">'
        + '<span class="page-pic"' + (u ? ' style="background-image:url(' + u + ')"' : '') + '></span>'
        + '<b>' + esc(c.title || 'My comic') + '</b><small>' + esc(dayOf(c.at)) + '</small></a>'
        + '<button type="button" class="rm" data-rm="' + esc(c.id) + '" aria-label="Delete ' + esc(c.title || 'this comic') + '">&times;</button></article>';
    }).join('');
  }
  st.arrows();
}

const shelf = { templates, comics, renderTemplates, renderComics, clearAll };
export default shelf;
