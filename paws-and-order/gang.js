// Paws & Order gang: the cast and the places, for every page that shows them or lets a learner pick one.
// The site's own characters and places come from theme.js. Characters a learner makes stay in this
// browser (localStorage['police_pound_cast_v1'], at most eight) and are never sent anywhere whole:
// the prompt helper is only ever given a made character's name and look, never its picture.

import THEME from './theme.js';
import { unfriendly } from './ai.js';

const CAST_KEY = 'police_pound_cast_v1';
const MAX = 8, NAME_MAX = 40, LOOK_MAX = 400, LOOK_MIN = 20;

// Browser storage can be missing or blocked; the pages work without it.
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
};
const esc = t => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Read fresh every time: another tab, or a reset, may have changed the list since this page loaded.
function stored() {
  let list = [];
  try { list = JSON.parse(store.get(CAST_KEY) || '[]'); } catch (e) {}
  return (Array.isArray(list) ? list : []).filter(c => c && typeof c.id === 'string' && c.name && c.look).slice(0, MAX);
}
function fromTheme(c) {
  const out = { id: c.id, name: c.name, short: c.short, role: c.role, tag: c.tag, story: c.story, look: c.look,
    img: THEME.castFile(c.file), sticker: c.sticker, colour: c.colour, mine: false };
  if (c.arc) out.arc = c.arc;
  return out;
}
function fromStore(c) {
  const name = String(c.name);
  return { id: c.id, name, short: name.split(' ')[0], role: 'My character', tag: 'Made by me', story: '', look: String(c.look),
    img: typeof c.img === 'string' ? c.img : '', mine: true };
}

// The picture a learner picks is shrunk before it is kept (longest side 560px, JPEG), so eight of them fit in storage.
async function shrinkToData(file) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 560 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.85);
}

let forms = 0;   // a page may show the form twice; each gets its own ids

export const gang = {
  // The site's gang, then the learner's own.
  all() { return THEME.cast.filter(c => !c.placeholder).map(fromTheme).concat(stored().map(fromStore)); },
  mine() { return stored().map(fromStore); },
  byId(id) { return gang.all().find(c => c.id === id) || null; },

  // { ok: true, id } or { ok: false, message, field? }. The message is ready to show to a child.
  add(input) {
    const name = String((input && input.name) || '').trim().slice(0, NAME_MAX);
    const look = String((input && input.look) || '').trim().slice(0, LOOK_MAX);
    const img = input && typeof input.img === 'string' ? input.img : '';
    if (name.length < 2) return { ok: false, field: 'name', message: 'Give your character a name.' };
    if (look.length < LOOK_MIN) return { ok: false, field: 'look', message: 'Say a bit more about how they look (at least ' + LOOK_MIN + ' letters).' };
    if (unfriendly(name)) return { ok: false, field: 'name', message: 'That has a word we do not use here. Try a friendlier version.' };
    if (unfriendly(look)) return { ok: false, field: 'look', message: 'That has a word we do not use here. Try a friendlier version.' };
    const list = stored();
    if (list.length >= MAX) return { ok: false, message: 'That is enough characters for now. Remove one first.' };
    // 'mine-' and a short run of letters and digits: the only shape of id the prompt helper accepts for a made character
    let id = 'mine-' + Date.now().toString(36);
    while (list.some(c => c.id === id)) id += '0';
    if (!store.set(CAST_KEY, JSON.stringify(list.concat({ id, name, look, img })))) {
      return { ok: false, message: 'This browser would not save it. The picture may be too big, or saving is switched off.' };
    }
    return { ok: true, id };
  },

  remove(id) {
    const list = stored(), next = list.filter(c => c.id !== id);
    return next.length !== list.length && store.set(CAST_KEY, JSON.stringify(next));
  },

  // What travels to the prompt helper as input.cast: only an id for one of the gang (the helper looks the rest
  // up itself), and id, name and look for a learner-made character. Never a picture. Unknown ids are dropped.
  forPrompt(ids) {
    const mine = stored();
    return (Array.isArray(ids) ? ids : []).map(id => {
      if (THEME.cast.some(c => c.id === id && !c.placeholder)) return { id };
      const m = mine.find(c => c.id === id);
      return m ? { id: m.id, name: String(m.name).slice(0, NAME_MAX), look: String(m.look).slice(0, LOOK_MAX) } : null;
    }).filter(Boolean);
  },

  // The add-a-character form, written into el. The picture page and Explore both use this one; neither writes its own.
  // onAdd(id) is called after a character has been saved.
  mountAddForm(el, opts) {
    if (!el) return;
    const onAdd = opts && typeof opts.onAdd === 'function' ? opts.onAdd : null;
    const p = 'ac' + (++forms) + '-';
    el.innerHTML = '<form class="addchar frame" autocomplete="off" novalidate><div class="row"><div>'
      + '<label for="' + p + 'name">Name</label>'
      + '<input type="text" id="' + p + 'name" maxlength="' + NAME_MAX + '">'
      + '<label for="' + p + 'pic">Picture <small>(you can skip this)</small></label>'
      + '<div class="pickpic"><img src="' + esc(THEME.castPlaceholder) + '" alt="" width="74" height="74"><input type="file" id="' + p + 'pic" accept="image/*"></div>'
      + '</div><div>'
      + '<label for="' + p + 'look">How do they look?</label>'
      + '<p class="hint2" id="' + p + 'hint">Write at least ' + LOOK_MIN + ' letters. Use the same words every time and they will stay the same.</p>'
      + '<textarea id="' + p + 'look" maxlength="' + LOOK_MAX + '" aria-describedby="' + p + 'hint ' + p + 'count"></textarea>'
      + '<p class="count2" id="' + p + 'count">0 of ' + LOOK_MAX + ' letters</p>'
      + '</div></div>'
      + '<p class="hint2">Do not use a real person&rsquo;s name or photo. Your characters stay on this device.</p>'
      + '<p class="error" role="alert" id="' + p + 'error"></p>'
      + '<button type="submit" class="btn">Add to the gang</button></form>';
    const $ = s => el.querySelector('#' + p + s);
    const form = el.querySelector('form'), preview = el.querySelector('.pickpic img');
    const name = $('name'), look = $('look'), pic = $('pic'), count = $('count'), error = $('error');
    let img = '';
    const tally = () => { count.textContent = look.value.length + ' of ' + LOOK_MAX + ' letters'; };
    look.addEventListener('input', tally);
    pic.addEventListener('change', async e => {
      const f = e.target.files && e.target.files[0];
      img = '';
      if (!f) { preview.src = THEME.castPlaceholder; return; }
      try { img = await shrinkToData(f); preview.src = img; } catch (err) { preview.src = THEME.castPlaceholder; }
    });
    form.addEventListener('submit', e => {
      e.preventDefault();
      const out = gang.add({ name: name.value, look: look.value, img });
      error.textContent = out.ok ? '' : out.message;
      if (!out.ok) {
        const field = out.field === 'name' ? name : out.field === 'look' ? look : null;
        if (field) field.focus();
        return;
      }
      form.reset();
      img = '';
      preview.src = THEME.castPlaceholder;
      tally();
      if (onAdd) onAdd(out.id);
    });
  },

  // Addresses are worked out from this file's own, so they hold from any page in any folder.
  paletteImg(key) { return new URL('./img/palettes/' + encodeURIComponent(key) + '.webp', import.meta.url).href; },
  // The standing cut-out of one of the gang, or '' for a character that has none (a learner-made one).
  stickerImg(c) { return c && c.sticker ? THEME.stickerPath(c.sticker, 'standing', false) : ''; },
};

// The places in Doodleville. Each id is also its small card picture (img/thumbs/) and its reference picture (img/ref/).
const place = p => ({ id: p.id, name: p.name, look: p.look, thumb: THEME.thumbPath(p.id), ref: THEME.refPath(p.id) });
export const places = {
  all() { return (THEME.places || []).map(place); },
  byId(id) { const p = (THEME.places || []).find(x => x.id === id); return p ? place(p) : null; },
};
