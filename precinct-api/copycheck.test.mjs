// Run with: node --test precinct-api/*.test.mjs  (the module lives in the-precinct/)
// The samples below are what COPY_THRESHOLD was chosen from.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkCopy, jaccard, normalise, instructionPhrases, COPY_THRESHOLD } from "../the-precinct/copycheck.js";

const PROMPT = "A heavy-set police commissioner in his sixties, jowly face and a permanent scowl, standing under a single streetlamp on a rain-soaked 1940s city street at night. Three-piece suit under a long belted trench coat, grey fedora with a dark band, hands deep in his coat pockets. 1940s film noir comic book, black and white ink illustration with fine hatching. Limited palette: black ink and grey tones with a single yellow accent on the streetlamp glow, no other colours. No text, no captions, no speech balloons.";

const BRIEF = {
  anchor: "1940s film noir comic book, black and white ink illustration with fine hatching. A heavy-set police commissioner in his sixties, jowly face and a permanent scowl, three-piece suit under a long belted trench coat, grey fedora with a dark band. Limited palette: black ink and grey tones with a single yellow accent, no other colours. No text, no captions.",
  prompts: [
    "He stands behind a wide desk in a dim office, venetian blinds throwing striped shadows across the wall.",
    "He waits at the top of the precinct steps at night, rain falling, one lit window behind him glowing yellow.",
  ],
};

// Pasted straight back.
const IDENTICAL = PROMPT;
// The same prompt with a few words swapped and a sentence reordered.
const LIGHT = "A heavy-set police commissioner in his sixties, jowly face and a permanent scowl, standing under one streetlamp on a rain-soaked 1940s city street at night. Three-piece suit under a long belted trench coat, grey fedora with a dark band, hands deep in his pockets. 1940s film noir comic book, black and white ink illustration with fine hatching. Limited palette: black ink and grey tones with a single yellow accent on the streetlamp glow, no other colours. No text, no captions, no speech balloons.";
// A heavier paraphrase: someone retyping the prompt from memory.
const PARAPHRASE = "An older, heavy police commissioner with a scowl and jowls stands beneath a streetlamp on a wet 1940s street at night. He wears a three-piece suit, a belted trench coat and a grey fedora, hands in his pockets. Film noir comic style, black and white ink with hatching, one yellow accent on the lamp, no other colours, no text.";
// What a tool actually says when shown the picture and asked to describe it as a prompt.
const GENUINE = "A black and white comic book illustration of a stout older man in a long double-breasted trench coat and a wide-brimmed fedora, standing on a wet cobblestone street at night. His face is lined and heavy, with a deep frown. Behind him is a brick wall with a lit window and a fire escape, and a single street lamp casts a pool of warm yellow light that reflects in the puddles. Rain streaks across the frame. Heavy black shadows, cross-hatching, vintage 1950s pulp detective comic style, sepia-tinged paper texture.";
// A word changed in nearly every phrase: still the prompt, retyped.
const HEAVIER = "A heavy police commissioner in his sixties, jowly face and a deep scowl, standing beneath a single streetlamp on a rain-soaked 1940s street at night. Three-piece suit under a long trench coat, grey fedora with a black band, hands deep in his coat pockets. 1940s film noir comic, black and white ink drawing with fine hatching. Limited palette: black ink and grey tones with one yellow accent on the streetlamp glow, no other colours. No text, no captions, no balloons.";
// The prompt with a real description pasted after it, and the tool echoing the prompt back.
const MIXED = PROMPT + " " + GENUINE;
const ECHO = "Here is a prompt that would recreate this image: " + PROMPT;

// The whole brief (anchor and prompt 2) pasted in instead of the prompt they ran.
const BRIEF_BACK = BRIEF.anchor + "\n" + BRIEF.prompts[1];

const score = (d) => checkCopy(d, PROMPT, BRIEF).score;

test("the samples, for choosing the threshold", () => {
  const rows = { IDENTICAL, LIGHT, HEAVIER, MIXED, ECHO, PARAPHRASE, GENUINE, BRIEF_BACK };
  for (const [k, v] of Object.entries(rows)) console.log(k.padEnd(11), score(v).toFixed(3));
});

test("identical text is a copy", () => {
  assert.equal(score(IDENTICAL), 1);
  assert.equal(checkCopy(IDENTICAL, PROMPT, BRIEF).copied, true);
});

test("light rewording of the prompt is still a copy", () => {
  assert.ok(checkCopy(LIGHT, PROMPT, BRIEF).copied, "score " + score(LIGHT));
});

test("heavier rewording, extra text around it, or an echo are still copies", () => {
  for (const d of [HEAVIER, MIXED, ECHO]) assert.ok(checkCopy(d, PROMPT, BRIEF).copied, "score " + score(d));
});

test("the brief pasted back is a copy", () => {
  assert.ok(checkCopy(BRIEF_BACK, "", BRIEF).copied, "score " + checkCopy(BRIEF_BACK, "", BRIEF).score);
  assert.ok(checkCopy(BRIEF_BACK, PROMPT, BRIEF).copied);
});

test("a paraphrase from memory is not blocked (the API step can still flag it)", () => {
  assert.equal(checkCopy(PARAPHRASE, PROMPT, BRIEF).copied, false);
});

test("a genuine reverse description passes, well clear of the threshold", () => {
  assert.equal(checkCopy(GENUINE, PROMPT, BRIEF).copied, false);
  assert.ok(score(GENUINE) < COPY_THRESHOLD / 4);
});

test("empty and very short inputs never count as copies", () => {
  for (const d of ["", "   ", "a man", "a man in a hat"]) {
    assert.equal(checkCopy(d, PROMPT, BRIEF).copied, false, JSON.stringify(d));
  }
  assert.equal(checkCopy("A man in a hat.", "", null).copied, false);
  assert.equal(jaccard("", ""), 0);
});

test("punctuation, case and spacing are ignored", () => {
  assert.equal(normalise("  No-other   COLOURS!!  Don’t "), "no other colours dont");
  assert.equal(score(PROMPT.toUpperCase().replace(/[.,:]/g, " ;")), 1);
});

test("instruction language is picked out as a soft warning", () => {
  assert.ok(instructionPhrases(PROMPT).length >= 2);
  assert.equal(instructionPhrases(GENUINE).length, 0);
});
