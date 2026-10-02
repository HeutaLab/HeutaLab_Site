# Paws & Order

A guided comic-making workshop for ages 9 to 12 (a cousin of The Precinct). It teaches children to look closely, describe precisely, keep a character, a place and their colours the same from picture to picture, judge what an AI makes, and turn their pictures into a story. Hand-drawn, wobbly-outline look. All the art is original.

No build step and no framework: plain pages and ES modules. The pages work from any static host at any path. Workshop codes also need the Worker (see below).

## The five steps

| Step | Page |
|---|---|
| 1 Look closely | `references/` |
| 2 Choose and describe | `picture/#choose` |
| 3 Create with AI | `picture/#create` |
| 4 Check and improve | `picture/#check` |
| 5 Build and share | `builder/` |

`index.html` is the home page (Start my comic, I'm teaching this). `teachers/` has the lesson plan, setup, privacy and how to reset shared devices. `explore/` holds the gang, the places, colours, levels, templates and My comics. `slips/` is an extra activity, Spot the AI slips: two pictures with AI mistakes left in (the robot chef and the doughnut factory) for learners to find, explain and fix one thing in. Its notes for teachers are on the Teachers page. The order and names of the steps live in `stages` in `theme.js` and are the same everywhere.

Progress is kept in the browser (`localStorage`, key `paws_journey_v1`) and does not follow a learner to another device. Start again clears it.

## The prompt helper: three ways it can run

1. **A workshop code (for a class).** A teacher makes a code on the Teachers page with their own AI key (Anthropic, OpenAI or Google). Learners type three words and a number. Their requests go through the site's Worker, `/paws-and-order/api/`, to that service. The code for this is in `paws-api/` at the top of the repo, with its own README: it says how to switch codes on, what is kept, and the limits.
2. **The teacher's own key on one device (advanced).** On the Teachers page, option C. The browser calls the AI service directly and nothing goes through the site. An OpenAI-compatible address (LM Studio, Ollama) works here too.
3. **Neither.** The lesson still runs: learners get a starter prompt built from their own brief, and check their picture by eye.

The helper only writes text prompts. Pictures are made in a separate image tool the school chooses, and the site never receives them.

## Files

- `theme.js`: all wording and data: the stages, the cast and places (each with a fixed `look`), palettes, levels, templates, stickers.
- `journey.js`: saved progress, the progress trail, the menu button, the Start again dialog and reset.
- `workshop.js`: the pages' one way to the prompt helper (by code, by own key, or the starter prompt), and the code box.
- `ai.js`: what is asked of the AI and the safety checks. It runs in the browser and in the Worker.
- `gang.js`: the cast, learner-made characters and places. `shelf.js`: templates and My comics.
- `pound.css`, `pencil.js` (draws the wobbly outlines), `fonts/` (self-hosted open-licence fonts), `img/`.
- `builder/?template=<key>` opens a starter page from `templates` in `theme.js`; `builder/?comic=<id>` opens a page saved in My comics. Comics are kept in this browser's IndexedDB (`police-pound-builder`, keys `comic:<id>`).
- `img/stickers/<character>/`: the gang as cut-outs, `<name>.webp` with a see-through background and `<name>-b.webp` with a white border, listed in `stickers` in `theme.js`. The border is grown from the cut-out's own outline, never drawn a second time, so the two always match.
- `img/icons/`: the comic-stroke icon set (32 by 32, `currentColor`). The menu uses five of them, written into each page.
- `gemini-prompts/`: an art prompt pack. Not linked from the site.

Old home-page links (`#brief`, `#cast`, `#palettes`, `#compare`, `#templates`, `#mycomics`, `#grownups`) are sent on to the page that now holds them.

## Add your own characters

Drop square pictures into `img/cast/`, then fill in the matching entries in `theme.js` (name, role, story, look) and delete `placeholder: true`. Children can also invent characters in the browser; those stay on their own device.

## Testing

```
node --test paws-and-order/dev/*.test.mjs   # ai.js, workshop.js, the journey, the copy check
node --test paws-api/*.test.mjs             # the Worker's routes and the vault
node paws-and-order/dev/mock-ai-server.mjs  # a pretend AI on http://localhost:1234/v1
```

To try option C without a real key: on the Teachers page choose "Other (OpenAI-compatible address)", address `http://localhost:1234/v1`, any key and model. To try workshop codes without a real key, see "Trying it without a real key" in `paws-api/README.md`.

The default model names in `ai.js` have been run against the mock server only, not against live keys.

## Child safety

Kid-oriented instructions to the AI, no real people, brands or existing characters, and a word filter (English only) on what a learner types and on everything the helper writes back. The one thing not filtered on the way in is a description pasted from the image tool, because an honest description of a picture may name something unfriendly; the helper is told not to repeat such a word, and anything it writes that contains one is left out. It is a backstop, not a guarantee: a teacher should still be in the room.
