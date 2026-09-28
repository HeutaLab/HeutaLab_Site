// The Precinct compare check, step A: is the "description of the result"
// really the attendee's prompt pasted back? Runs in the Worker before any
// API call, so a copy costs nothing. No user text is stored or logged.

// Word 3-gram Jaccard at or above this means "the same text". Chosen from
// the samples in copycheck.test.mjs: a genuine description scores about 0.01
// and a paraphrase from memory 0.09, while the prompt with a word changed in
// every other phrase, or pasted with extra text around it, still scores
// 0.49 to 0.51. Change it here and re-run the tests.
export const COPY_THRESHOLD = 0.45;

// Phrases that belong in a prompt (instructions to a tool), not in a
// description of a picture. Two or more is a soft warning, not a block.
const INSTRUCTION_PHRASES = [
  /\bin the style of\b/, /\bno other colou?rs?\b/, /\bdo not (include|add|show|draw)\b/, /\bdon'?t (include|add|show|draw)\b/,
  /\bno (text|captions?|dialogue|speech balloons?|lettering|characters|people)\b/, /\blimited palette\b/,
  /\bmake sure\b/, /\bavoid\b/, /\bensure\b/, /\bmust (be|have|include)\b/, /\bwithout any\b/,
];

export function normalise(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[^\p{L}\p{N}'\s]+/gu, " ")
    .replace(/'/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function words(text) {
  const n = normalise(text);
  return n ? n.split(" ") : [];
}

export function trigrams(text) {
  const w = words(text);
  const set = new Set();
  for (let i = 0; i + 2 < w.length; i++) set.add(w[i] + " " + w[i + 1] + " " + w[i + 2]);
  return set;
}

export function jaccard(a, b) {
  const A = a instanceof Set ? a : trigrams(a);
  const B = b instanceof Set ? b : trigrams(b);
  if (!A.size || !B.size) return 0;
  let shared = 0;
  for (const g of A) if (B.has(g)) shared++;
  return shared / (A.size + B.size - shared);
}

// Highest overlap between the description and any candidate text (the
// original prompt, the whole brief, the anchor plus each brief prompt).
export function copyScore(description, candidates) {
  const D = trigrams(description);
  let best = 0;
  for (const c of candidates) {
    if (!c || !String(c).trim()) continue;
    best = Math.max(best, jaccard(D, trigrams(c)));
  }
  return best;
}

export function instructionPhrases(text) {
  const n = String(text || "").toLowerCase().replace(/[‘’]/g, "'");
  return INSTRUCTION_PHRASES.map((re) => (n.match(re) || [])[0]).filter(Boolean);
}

// The candidates to compare a description against, built from what the page sends.
export function briefCandidates(prompt, brief) {
  const out = [prompt];
  if (brief && typeof brief === "object") {
    const anchor = typeof brief.anchor === "string" ? brief.anchor : "";
    const prompts = Array.isArray(brief.prompts) ? brief.prompts.filter((p) => typeof p === "string") : [];
    out.push([anchor, ...prompts].join("\n"));
    for (const p of prompts) out.push(anchor ? anchor + "\n" + p : p);
  }
  return out;
}

export function checkCopy(description, prompt, brief, threshold = COPY_THRESHOLD) {
  const score = copyScore(description, briefCandidates(prompt, brief));
  return { copied: score >= threshold, score, phrases: instructionPhrases(description) };
}
