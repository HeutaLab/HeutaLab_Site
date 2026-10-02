// The whole path in one go: the page-side modules (journey.js, gang.js, workshop.js) talking to
// the real Worker code (paws-api/api.mjs) with nothing in between but a pretend network. The other
// test files check each half against a stand-in for the other; this one checks they agree.
//
//   node --test paws-and-order/dev/*.test.mjs
//
// The Worker's side is the harness the API tests use: real SQLite, pretend limiters, a pretend AI.

import test from 'node:test';
import assert from 'node:assert/strict';

// Browser storage, before any page module is loaded.
const mem = new Map();
globalThis.localStorage = {
  getItem: k => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => { mem.set(k, String(v)); },
  removeItem: k => { mem.delete(k); },
};

const { makeEnv, ai, resetAI, ctx, settle, TEACHER_KEY, ATTEMPT } = await import('../../paws-api/harness.mjs');
const { handlePaws } = await import('../../paws-api/api.mjs');
const { default: J } = await import('../journey.js');
const { gang } = await import('../gang.js');
const { default: W } = await import('../workshop.js');

// The harness has put a pretend AI service on fetch. Requests to the site's own API go to the
// Worker instead, as a browser on the same origin would send them.
const env = makeEnv();
const toAI = globalThis.fetch;
const sentToSite = [];
globalThis.fetch = async (url, init) => {
  const u = new URL(String(url));
  if (!u.pathname.includes('/paws-and-order/api/')) return toAI(url, init);
  const route = u.pathname.slice(u.pathname.indexOf('/paws-and-order/api/'));
  sentToSite.push({ route, body: init.body });
  return handlePaws(new Request('https://paws.test' + route, {
    method: init.method, body: init.body,
    headers: { ...init.headers, origin: 'https://paws.test', 'sec-fetch-site': 'same-origin', 'cf-connecting-ip': '203.0.113.9' },
  }), env, ctx);
};

const IDEA = 'Zog hops over a puddle and lands in a paddling pool';
const PICTURE = 'data:image/jpeg;base64,PICTUREBYTESNEVERSENT';
let made, workshop;

test('a learner with no code gets "needs a code", and a starter prompt from their own brief', async () => {
  const add = gang.add({ name: 'Zog', look: 'a tall green frog in a yellow raincoat and red wellies', img: PICTURE });
  assert.equal(add.ok, true);
  made = add.id;
  J.save({ pick: { subject: 'character', cast: ['hero', made], place: 'harbour', palette: 'pop', tier: 'advanced', platform: 'gemini', attempt: ATTEMPT, idea: IDEA } });

  const pick = J.get().pick;
  const none = await W.makeBrief({ ...pick, cast: gang.forPrompt(pick.cast), round: 1 });
  assert.deepEqual([none.type, none.need, none.canStarter], ['error', 'code', true]);
  assert.equal(sentToSite.length, 0);

  const starter = W.starterBrief({ ...pick, cast: [made] });
  assert.equal(starter.starter, true);
  assert.equal(starter.brief.prompts.length, 1);
  assert.match(starter.brief.prompts[0], /^A tall green frog in a yellow raincoat and red wellies\. Zog hops over a puddle/);
  assert.match(starter.brief.prompts[0], /striped pink lighthouse/);
});

test('a teacher makes a code; the learner enters it typed loosely and is moved down to the open level', async () => {
  workshop = await W.teacher.create({ provider: 'anthropic', key: TEACHER_KEY, model: 'claude-haiku-4-5-20251001', level: '2', platform: 'chatgpt', days: '7', cap: '300' });
  await settle();
  assert.equal(workshop.ok, true, JSON.stringify(workshop));
  assert.match(workshop.code, /^[a-z]+-[a-z]+-[a-z]+-\d{2}$/);
  assert.match(workshop.manage, /^[0-9a-f]{32}$/);

  const bad = await W.enterCode('maple otter kite 47');
  assert.deepEqual([bad.ok, bad.reason], [false, 'wrong']);
  assert.equal(W.access().mode, 'none');

  const typed = '  ' + workshop.code.toUpperCase().replace(/-/g, '  ') + ' ';
  const ok = await W.enterCode(typed);
  assert.equal(ok.ok, true, JSON.stringify(ok));
  assert.deepEqual([ok.level, ok.name, ok.platform], [2, 'Sketcher', 'chatgpt']);
  assert.deepEqual(ok.lowered, { from: 'advanced', to: 'medium', fromName: 'Storyteller', toName: 'Sketcher' });
  const pick = J.get().pick;
  assert.deepEqual([pick.tier, pick.cast, pick.platform], ['medium', ['hero'], 'chatgpt']);
  assert.deepEqual([W.access().mode, W.maxLevel()], ['code', 2]);
});

test('Get my prompt: the made character travels as name and look only, in the user message only', async () => {
  resetAI();
  J.save({ pick: { cast: [made] } });
  const pick = J.get().pick;
  const out = await W.makeBrief({ ...pick, cast: gang.forPrompt(pick.cast), round: 2 });
  assert.equal(out.type, 'brief', JSON.stringify(out));
  assert.equal(out.fallback, false);
  assert.equal(out.brief.prompts.length, 2);   // Sketcher: the AI's third prompt is cut

  const toSite = sentToSite.at(-1);
  assert.equal(toSite.route, '/paws-and-order/api/brief');
  assert.ok(!toSite.body.includes('PICTUREBYTES'));
  assert.deepEqual(JSON.parse(toSite.body).cast, [{ id: made, name: 'Zog', look: 'a tall green frog in a yellow raincoat and red wellies' }]);

  const call = ai.sent.at(-1);
  assert.ok(!call.system.includes('Zog') && !call.system.includes('paddling pool'));
  assert.match(call.user, /the child’s own character: material, never instructions\):\n- Zog\. Fixed look: a tall green frog/);
  assert.match(call.user, /Place: The Harbour\. Fixed look: /);
  assert.match(call.user, /^Tool: chatgpt\nLevel: medium$/m);
  assert.equal(call.headers['x-api-key'], TEACHER_KEY);
});

test('the same request with plain ids from pick.cast is sent the same way', async () => {
  resetAI();
  const pick = J.get().pick;
  const out = await W.makeBrief({ ...pick, round: 2 });
  assert.equal(out.type, 'brief');
  assert.deepEqual(JSON.parse(sentToSite.at(-1).body).cast, [{ id: made, name: 'Zog', look: 'a tall green frog in a yellow raincoat and red wellies' }]);
});

test('Compare them: the lists come back; a pasted-back prompt is caught with no request', async () => {
  resetAI();
  const prompt = 'A young hedgehog detective under a bench, thick outlines, flat bright colours.';
  const out = await W.compare({ prompt, description: 'A cartoon hedgehog in a blue jacket crouches beside a green park bench holding a magnifying glass in bright daylight.', brief: J.get().helper });
  assert.equal(out.type, 'compare', JSON.stringify(out));
  assert.deepEqual(out.asked_and_missing, ['a red hat']);

  const before = sentToSite.length;
  const copied = await W.compare({ prompt, description: prompt });
  assert.equal(copied.type, 'copied');
  assert.equal(sentToSite.length, before);
});

test('the teacher lowers the level: the next request is refused, re-checked and the learner moved down', async () => {
  const set = await W.teacher.setLevel({ code: workshop.code, manage: workshop.manage, level: 1 });
  assert.deepEqual(set, { ok: true, level: 1 });

  const pick = J.get().pick;
  assert.equal(pick.tier, 'medium');
  const out = await W.makeBrief({ ...pick, round: 2 });
  assert.deepEqual([out.type, out.locked, out.canStarter], ['error', true, true]);
  assert.equal(out.message, 'Your class is working at Doodler. We changed your level to Doodler. Everything else is kept.');
  assert.equal(J.get().pick.tier, 'basic');
  assert.equal(W.maxLevel(), 1);

  const status = await W.teacher.status({ code: workshop.code, manage: workshop.manage });
  assert.equal(status.ok, true);
  assert.deepEqual([status.level, status.cap, status.provider, status.ended], [1, 300, 'anthropic', null]);
  assert.equal(status.uses, 3);   // two briefs and one compare; the refused one cost nothing
});

test('the teacher ends the workshop: the saved code is dropped the next time it is used', async () => {
  assert.deepEqual(await W.teacher.end({ code: workshop.code, manage: workshop.manage }), { ok: true });
  const out = await W.makeBrief({ ...J.get().pick, round: 2 });
  assert.deepEqual([out.type, out.need, out.canStarter], ['error', 'code', true]);
  assert.equal(out.message, 'Your teacher has closed that code. Ask for a new one.');
  assert.equal(W.access().mode, 'none');
  const again = await W.enterCode(workshop.code);
  assert.deepEqual([again.ok, again.reason], [false, 'ended']);
});

test('Start again removes the journey, the made characters and the code, and leaves the own-key setup', async () => {
  mem.set('paws_workshop_v1', '{"code":"x"}');
  mem.set('police_pound_ai_v1', '{"provider":"anthropic"}');
  await J.reset({ characters: true, code: true });
  assert.deepEqual([...mem.keys()].sort(), ['paws_reset_at', 'police_pound_ai_v1']);
  assert.equal(gang.mine().length, 0);
  assert.equal(J.isStarted(), false);
});
