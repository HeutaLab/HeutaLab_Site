// The rules behind the five-step bar and the one start-or-continue action.
// Run: node --test the-precinct/dev/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import J from '../journey.js';

const LONG = 'A big man in a long belted coat and a fedora, hands in his pockets, scowling on a wet street at night.';
const fresh = extra => J.tidy(extra);
const brief = { prompts: ['A character reference sheet of a patrolman.'] };

test('the five steps carry the same names, in the same order, as Paws & Order', () => {
  assert.deepEqual(J.STEPS.map(s => s.name), ['Look closely', 'Choose and describe', 'Create with AI', 'Check and improve', 'Build and share']);
});

test('a new visitor is offered Case 01, and every later step is locked', () => {
  const j = fresh();
  assert.equal(J.begun(j), false);
  assert.deepEqual(J.resume(j), { kind: 'start', label: 'Start Case 01', short: 'Start', href: '/the-precinct/references/?start=1' });
  const v = J.trailView(j, 0);
  assert.deepEqual(v.steps.map(s => s.state), ['Next', 'Locked', 'Locked', 'Locked', 'Locked']);
  assert.match(v.steps[1].why, /Finish Step 1 first/);
  assert.equal(v.now.next, true);
});

test('work saved before the five steps existed still counts', () => {
  // the old case file ticked "look" and kept the notes and the description per case
  const j = fresh({ c: 1, at: { 1: 'palette' }, done: { 1: ['look', 'who'] }, work: { 1: { notes: 'a cap, a badge', cast: ['detective'], attempt: '' } } });
  const st = J.status(j);
  assert.equal(st.done[1], true);
  assert.equal(st.done[2], false);
  assert.equal(st.frontier, 2);
  assert.equal(J.resume(j).label, 'Continue Step 2: Choose a palette');
  assert.equal(J.resume(j).href, '/the-precinct/case/#choose');
});

test('step 2 needs a choice and fifteen words; a setting needs only the words', () => {
  const who = fresh({ done: { 1: ['look'] }, work: { 1: { attempt: LONG } } });
  assert.equal(J.status(who).done[2], false, 'no character chosen yet');
  who.work[1].own = true;
  assert.equal(J.status(who).done[2], true, 'a character of my own counts');
  const room = fresh({ c: 2, done: { 2: ['look'] }, work: { 2: { attempt: LONG } } });
  assert.equal(J.status(room).done[2], true);
  assert.deepEqual(J.status(room).parts, ['palette', 'notice', 'brief', 'make', 'compare']);
});

test('the continue action names the part the learner was on', () => {
  const j = fresh({ at: { 1: 'who' }, done: { 1: ['look'] } });
  assert.equal(J.resume(j).label, 'Continue Step 2: Choose a character');
  // a saved place past the first unfinished step is not trusted
  const ahead = fresh({ at: { 1: 'compare' }, started: '2026-10-02T00:00:00Z' });
  assert.equal(J.resume(ahead).label, 'Continue Step 1: Look closely');
});

test('step 3 is finished by a brief and a picture made, step 4 by the check', () => {
  const j = fresh({ at: { 1: 'make' }, done: { 1: ['look'] }, work: { 1: { cast: ['detective'], attempt: LONG, brief } } });
  assert.equal(J.status(j).frontier, 3);
  assert.equal(J.resume(j).label, 'Continue Step 3: Make the picture');
  j.done[1].push('make');
  assert.equal(J.status(j).frontier, 4);
  j.at[1] = 'compare';
  assert.equal(J.resume(j).label, 'Continue Step 4: Check and improve');
  j.done[1].push('check');
  assert.equal(J.status(j).frontier, 5);
  assert.equal(J.resume(j).href, '/the-precinct/builder/');
  assert.equal(J.resume(j).label, 'Continue Step 5: Build and share');
});

test('a finished case offers the next case, and the last one the comic', () => {
  const all = ['look', 'make', 'check', 'build'];
  const j = fresh({ c: 1, done: { 1: all }, work: { 1: { cast: ['detective'], attempt: LONG, brief } } });
  assert.deepEqual(J.resume(j), { kind: 'next', label: 'Start the next case', short: 'Next case', href: '/the-precinct/references/?case=2' });
  const last = fresh({ c: 4, done: { 4: all }, work: { 4: { cast: ['detective'], attempt: LONG, brief } } });
  assert.equal(J.resume(last).label, 'Open my comic');
});

test('standing on a locked step is "jumped ahead", not locked', () => {
  const j = fresh({ started: '2026-10-02T00:00:00Z' });
  const v = J.trailView(j, 5);
  assert.equal(v.steps[4].state, 'You are here');
  assert.equal(v.steps[4].locked, false);
  assert.equal(v.ahead.words, 'Your next step is 1: Look closely.');
  assert.equal(v.steps[2].locked, true);
});

test('Review is the check on its own: steps 1 to 3 are not part of it', () => {
  const j = fresh({ c: 5, started: '2026-10-02T00:00:00Z' });
  const st = J.status(j);
  assert.equal(st.frontier, 4);
  assert.deepEqual(st.parts, ['compare']);
  const v = J.trailView(j, 4);
  assert.deepEqual(v.steps.map(s => s.state), ['Not in this case', 'Not in this case', 'Not in this case', 'You are here', 'Locked']);
  assert.equal(v.ahead, null);
});

test('every state on the bar has words, so nothing is told by colour alone', () => {
  const j = fresh({ at: { 1: 'brief' }, done: { 1: ['look'] }, work: { 1: { cast: ['detective'], attempt: LONG } } });
  const v = J.trailView(j, 3);
  assert.deepEqual(v.steps.map(s => s.state), ['Done', 'Done', 'You are here', 'Locked', 'Locked']);
  assert.equal(v.now.name, 'Create with AI');
  assert.equal(v.now.noir, 'Send the brief');
});

test('a damaged saved journey is put right, not thrown away', () => {
  const j = J.tidy({ c: 99, done: [], work: 'x' });
  assert.equal(j.c, 1);
  assert.deepEqual(j.done, {});
  assert.deepEqual(j.work, {});
  assert.equal(J.status(j).frontier, 1);
});
