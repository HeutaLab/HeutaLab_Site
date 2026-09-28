// heutalab.com Worker: serves the static site, and handles one API route
// for The Precinct (AIFE workshop prompt-briefing tool).
//
// Secrets required (set with `npx wrangler secret put <NAME>`, run by hand,
// never pasted into chat or a script):
//   ANTHROPIC_API_KEY  - a Claude API key from console.anthropic.com
//   WORKSHOP_CODE      - any short passcode you give out at the session,
//                        so a stranger who finds the URL can't burn your
//                        API budget. Attendees type it once per browser.

import THEME from "./the-precinct/theme.js";

const API_PATH = "/the-precinct/api/brief";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === API_PATH) {
      if (request.method !== "POST") return json({ error: "POST only" }, 405);
      return handleBrief(request, env);
    }

    // Everything else: serve the static site as before.
    return env.ASSETS.fetch(request);
  },
};

async function handleBrief(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Bad request body" }, 400);
  }

  const { code, platform, tier, subject, idea } = body || {};
  // Older copies of the page send no palette or cast.
  const palette = (body && body.palette) || THEME.defaultPalette;
  const cast = Array.isArray(body && body.cast) ? body.cast : [];

  if (!env.WORKSHOP_CODE) return json({ error: "Server not configured (missing WORKSHOP_CODE)" }, 500);
  if (!code || code.trim() !== env.WORKSHOP_CODE) return json({ error: "Wrong workshop code" }, 401);

  const validPlatforms = ["gemini", "chatgpt", "copilot", "midjourney", "nanobanana"];
  const validTiers = ["basic", "medium", "advanced"];
  const validSubjects = ["character", "setting"];

  if (!validPlatforms.includes(platform)) return json({ error: "Unknown platform" }, 400);
  if (!validTiers.includes(tier)) return json({ error: "Unknown tier" }, 400);
  if (!validSubjects.includes(subject)) return json({ error: "Unknown subject" }, 400);
  if (!THEME.palettes[palette]) return json({ error: "Unknown palette" }, 400);
  const castIds = THEME.cast.map((c) => c.id);
  if (cast.length > 2 || !cast.every((id) => castIds.includes(id))) return json({ error: "Unknown character" }, 400);
  if (!idea || typeof idea !== "string" || idea.trim().length < 3) {
    return json({ error: "Describe what you want first" }, 400);
  }
  if (idea.length > 800) return json({ error: "Keep it under 800 characters" }, 400);

  if (!env.ANTHROPIC_API_KEY) return json({ error: "Server not configured (missing ANTHROPIC_API_KEY)" }, 500);

  const system = buildSystemPrompt();
  const userMessage = [
    `Platform: ${platform}`,
    `Tier: ${tier}`,
    `Subject type: ${subject}`,
    `Palette: ${palette} (${THEME.palettes[palette].phrase})`,
    castLine(subject === "character" ? cast : []),
    `Attendee's idea, in their own words: ${idea.trim()}`,
  ].join("\n");

  let anthropicRes;
  try {
    anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        // Lets a request the model declines be re-run on a fallback model
        // server-side, instead of coming back as a refusal.
        "anthropic-beta": "server-side-fallback-2026-07-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-5",
        max_tokens: 16000,
        // medium, not the default high: a room of attendees is waiting on
        // each reply, and a prompt suggestion doesn't need deep thought.
        output_config: { effort: "medium", format: { type: "json_schema", schema: BRIEF_SCHEMA } },
        fallbacks: "default",
        system,
        messages: [{ role: "user", content: userMessage }],
      }),
    });
  } catch {
    return json({ error: "Could not reach the AI service. Try again." }, 502);
  }

  if (!anthropicRes.ok) {
    const detail = await anthropicRes.text().catch(() => "");
    console.error("Anthropic API error", anthropicRes.status, detail.slice(0, 500));
    return json({ error: "The AI service returned an error. Try again in a moment." }, 502);
  }

  const data = await anthropicRes.json();
  if (data.stop_reason === "refusal") {
    return json({ error: "The AI declined that one. Try rewording your idea." }, 422);
  }
  if (data.stop_reason === "max_tokens") {
    return json({ error: "The reply was cut off. Try again, or shorten your idea." }, 502);
  }

  // With thinking on, content[0] can be a thinking block; the answer is the text block.
  const text = (data.content || []).find((b) => b.type === "text")?.text || "";

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    console.error("Unparseable reply", text.slice(0, 500));
    return json({ error: "Could not read the AI's reply. Try again." }, 502);
  }

  return json(parsed, 200);
}

// Which of the cast the attendee picked, with each one's fixed look.
function castLine(ids) {
  if (!ids.length) return "Cast: none picked (the attendee's own character, or a setting)";
  return "Cast in this picture:\n" + ids.map((id) => {
    const c = THEME.cast.find((x) => x.id === id);
    return `- ${c.name}, ${c.role.toLowerCase()} (${c.tag.toLowerCase()}). Fixed look: ${c.look}.` + (c.arc ? ` His expression across a story: ${c.arc.join(", then ")}.` : "");
  }).join("\n");
}

function castSummary() {
  return THEME.cast.map((c) => `- ${c.name}, ${c.role.toLowerCase()} (${c.tag.toLowerCase()}): ${c.story}`).join("\n");
}

// Structured outputs hold the reply to this shape, so no regex-extracting JSON from prose.
const BRIEF_SCHEMA = {
  type: "object",
  properties: {
    anchor: { type: "string", description: "Shared anchor paragraph; empty only for the basic tier" },
    prompts: { type: "array", items: { type: "string" }, description: "The ready-to-paste prompt(s)" },
    why_this_works: { type: "string", description: "Required, never empty: 2-3 sentences on why the prompt is shaped this way" },
    platform_notes: { type: "string", description: "Required, never empty: what would change on another named platform" },
    watch_for: { type: "string", description: "Required, never empty: the single most likely failure to check for" },
  },
  required: ["anchor", "prompts", "why_this_works", "platform_notes", "watch_for"],
  additionalProperties: false,
};

function buildSystemPrompt() {
  return `You are the briefing desk for a 1940s-noir comic-generation workshop for teachers ("Human Creativity, AI Precision"). Every comic is monochrome noir; the attendee picks the palette (see PALETTE RULES). House style reference: ${THEME.houseStyle}.

THE CAST (who they are, and how they relate):
${castSummary()}

You write ONE ready-to-paste image-generation prompt (or a short set, for medium/advanced tiers) tailored to the platform and tier given, based on the attendee's own idea. You do not generate images yourself, only the text prompt and the teaching notes around it.

TIER RULES:
- basic: exactly ONE prompt. Single self-contained image, no continuity requirement. Keep it reliable enough to likely succeed in one attempt (attendees may be on a free tier with limited generations).
- medium: an "anchor" paragraph (shared style/location/character description, reused verbatim) plus exactly TWO prompts that each append a different specific detail to that anchor. The test is whether the two separate generations read as the same world.
- advanced: an anchor paragraph plus THREE OR MORE short shot prompts appended to it, forming a mini sequence (establishing shot, then two or more follow-on shots). Note that attendees should ideally plan the shot list with an LLM as co-writer before generating.

PLATFORM KNOWLEDGE (apply this specifically, do not give generic advice):
- gemini: strongly tends to auto-populate scenes with extra people, dialogue balloons, captions and sound effects unless explicitly told not to. Always include an explicit negative instruction ("no characters, no text, no dialogue, no captions") when the goal is an empty setting or a single subject. Gemini can also invent incidental details (weather, props) and then hold them consistent across a session unprompted, which is a feature to mention but not rely on. Responds well to named artist + era + medium for style-locking.
- chatgpt: generally more literal and compliant with explicit constraints than Gemini, but weaker at holding consistency across separate, unlinked generations. If the tier needs consistency (medium/advanced), recommend uploading the first generated image back in as a reference for the next prompt rather than relying on text alone.
- copilot: similar compliance to chatgpt (same underlying image model family) but defaults toward a glossier, more "digital painting" look. Needs an explicit style correction such as "flat ink illustration, hatching and cross-hatching shading, not digital painting or airbrush" to avoid that.
- midjourney: parameter-driven and the most literal about art-style keywords and named artists. Mention relevant parameters where useful (e.g. --ar 1:1 for a character sheet, --ar 16:9 for a wide establishing shot). Best consistency tool of the set via image-prompting or --seed, but requires a paid plan, which is why it's a look-only demo in this workshop rather than the hands-on tool.
- nanobanana: Google's image model accessed via API/AI Studio rather than the consumer Gemini app; generally more literal and compliant with negative constraints than the consumer Gemini chat app, closer to chatgpt/copilot behaviour than to Gemini's chat behaviour.

PALETTE RULES (the palette line in the request is the attendee's choice; honour it exactly):
- Put the palette in every prompt in so many words, as a "limited palette" line. For medium and advanced tiers it belongs in the anchor, word for word, so every generation carries it.
- Always close the palette line with "no other colours". Without it, models drift: a Gemini control run with no palette pinned came back sepia, and chat models slide back into full colour.
- bw is the easiest to hold. With a single accent (yellow, red), say what the accent touches (lamplight, windows, a car, the sky) so it lands on one or two things instead of washing the whole frame.
- green and blue are whole-image tints rather than accents: describe the shadows and the highlights, not objects.
- Only the Gemini sepia result above was tested. Treat the rest of this palette advice as reasoned, not proven, and don't present it to attendees as tested.

CAST RULES (when the request names cast members):
- Each character has a fixed look. Put it into the prompt near word for word: it is the only thing keeping the character recognisable from one picture to the next. For medium and advanced tiers it belongs in the anchor.
- Never swap looks between characters, and keep the two detectives visibly different: Edward Novak is young, clean-shaven and neat; Sergeant Frank Rourke is older and hugely muscular, in shirtsleeves, braces and a shoulder holster, and always on the edge of rage.
- Use the names in why_this_works and the other notes, but keep them out of the image prompt itself: image models don't know these characters, and a name in the prompt invites lettering on the picture. In the prompt, describe the character by their fixed look.
- With two characters in an advanced request, let their relationship drive the staging (who looks at whom, who stands in whose shadow), but show it; never write it as text in the image.
- Keep everything suitable for a room of teachers: tension and menace, no gore.
- If no cast is picked, work only from the attendee's idea.

SUBJECT KNOWLEDGE:
- character: one figure, full body or bust, one clear expression and pose. For basic, if the attendee's idea is only the character, use character-reference-sheet framing on a plain background. If their idea puts the character somewhere or doing something (a streetlight, a doorway, rain), keep that: give a simple, uncluttered setting instead of a plain background, and never ask for both in one prompt.
- The attendee's idea always wins over these defaults. Never write a prompt that contradicts itself.
- setting: emphasise empty of people (state this explicitly regardless of platform), a wide establishing shot, and for medium/advanced, load-bearing continuity details (window shape, ceiling material, light fixtures, time of day/weather) that should repeat verbatim across prompts.

OUTPUT FORMAT: a JSON object with these fields. Fill every field; only "anchor" may be an empty string, and only for the basic tier. The three notes are what attendees learn from, so never leave them blank:
{
  "anchor": "shared anchor paragraph, or empty string for basic tier",
  "prompts": ["prompt 1", "prompt 2", "..."],
  "why_this_works": "2-3 sentences on why this prompt is shaped this way for THIS platform and tier, referencing the attendee's actual idea",
  "platform_notes": "1-2 sentences on what would need to change if they used a different platform instead (name at least one other platform)",
  "watch_for": "one sentence naming the single most likely failure mode for this platform/tier combination, phrased as something to check in the result, not a disclaimer"
}`;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });
}

