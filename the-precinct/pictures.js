// The Precinct's case pictures: the image a learner made in their AI tool,
// brought back for the check, and its improved second try. They live in this
// browser only, in the comic builder's own database (IndexedDB
// 'precinct-builder', store 'kv'), so the builder has them waiting. Nothing
// here is sent anywhere.
//
// Keys are 'case:<n>:first' and 'case:<n>:improved', each a JPEG Blob. The
// builder's own pictures are 'img:<id>', and its tidy-up only ever removes
// those, so a case picture stays until its case is started again.

const DB = 'precinct-builder', STORE = 'kv';
export const SLOTS = ['first', 'improved'];
export const SLOT_NAMES = { first: 'First result', improved: 'Improved result' };
export const keyFor = (n, slot) => 'case:' + n + ':' + slot;

// Whoever opens the database first makes the store, exactly as the builder
// does. Any failure (no IndexedDB, private browsing) gives null, and the
// pages then say the picture could not be kept.
function open() {
  return new Promise(res => {
    try {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => res(r.result);
      r.onerror = () => res(null);
    } catch (e) { res(null); }
  });
}
// One transaction; resolves with fn's request result, or null if anything failed.
function run(mode, fn) {
  return open().then(db => new Promise(res => {
    if (!db) return res(null);
    const done = v => { try { db.close(); } catch (e) {} res(v); };
    try {
      const tx = db.transaction(STORE, mode), rq = fn(tx.objectStore(STORE));
      tx.oncomplete = () => done(rq && 'result' in rq ? rq.result : true);
      tx.onerror = tx.onabort = () => done(null);
    } catch (e) { done(null); }
  }));
}

// Big pictures are shrunk to 1600px, as the builder does, so they save reliably.
export async function shrink(file) {
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise(r => c.toBlob(r, 'image/jpeg', 0.9));
  } catch (e) { return file; }
}

export const get = (n, slot) => run('readonly', st => st.get(keyFor(n, slot)));
// Resolves true if the picture was kept.
export async function put(n, slot, file) {
  const blob = await shrink(file);
  return !!blob && (await run('readwrite', st => st.put(blob, keyFor(n, slot)))) !== null;
}
export const remove = (n, slot) => run('readwrite', st => st.delete(keyFor(n, slot)));
export const clearCase = n => Promise.all(SLOTS.map(s => remove(n, s)));

// Every case picture there is: [{ key, n, slot, blob }], first results before improved ones.
export async function all() {
  const keys = (await run('readonly', st => st.getAllKeys())) || [];
  const mine = keys.map(String).filter(k => /^case:\d+:(first|improved)$/.test(k)).sort();
  const out = [];
  for (const key of mine) {
    const blob = await run('readonly', st => st.get(key));
    const [, n, slot] = key.split(':');
    if (blob) out.push({ key, n: Number(n), slot, blob });
  }
  return out;
}

export default { SLOTS, SLOT_NAMES, keyFor, shrink, get, put, remove, clearCase, all };
