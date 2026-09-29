// Run with: node --test dev/
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkCopy, jaccard, COPY_THRESHOLD } from "../copycheck.js";

const PROMPT = "A round blue penguin in a red postie cap, holding up a letter and smiling, standing in front of a yellow post box on a sunny street, thick wobbly black outlines, flat bright colours, simple halftone dots.";
const LIGHT = "A round blue penguin in a red postie cap, holding up a letter and smiling, standing in front of a yellow post box on a sunny road, thick wobbly black outlines, flat bright colours, simple halftone dots.";
const GENUINE = "A cartoon penguin with a blue body and white tummy wears a small red hat and carries a brown bag. It waves a white envelope near a yellow mailbox. The background has pale blue sky, green grass and a few buildings, drawn with heavy black lines.";

test("identical text counts as copied", () => {
  assert.equal(checkCopy(PROMPT, PROMPT).copied, true);
});
test("a lightly edited prompt counts as copied", () => {
  assert.equal(checkCopy(PROMPT, LIGHT).copied, true);
});
test("a real description of the picture does not", () => {
  assert.equal(checkCopy(PROMPT, GENUINE).copied, false);
});
test("similarity is symmetric and between 0 and 1", () => {
  const a = jaccard(PROMPT, GENUINE), b = jaccard(GENUINE, PROMPT);
  assert.ok(a >= 0 && a <= 1);
  assert.equal(a, b);
  assert.ok(COPY_THRESHOLD > 0 && COPY_THRESHOLD < 1);
});
