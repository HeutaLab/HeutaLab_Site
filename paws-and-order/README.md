# Paws & Order

A child-friendly, primary-aged comic-making workshop site (a cousin of The Precinct). Children look closely at a picture, write a picture prompt with an AI helper, check the result, then build a comic page. Hand-drawn, wobbly-outline look. All the art is original.

No build step, no server code. Open it from any static host (or `python3 -m http.server`) and it works at any path.

## Bring your own AI key
The AI parts (prompt helper, coach, compare check) run in the browser and call the service a grown-up chooses under **Grown-ups** on the home page: Anthropic, OpenAI, Google Gemini, or any OpenAI-compatible address (LM Studio, Ollama). Nothing goes through your account or a server of yours.

- The key is kept in that browser tab (session storage). It is only saved on the device if "Remember" is ticked. "Forget" removes it.
- The grown-up also sets the highest level children can use.
- Default model names are editable, because providers rename models. They have been tested against the mock server only, not live keys.

## Add your own characters
Drop square pictures into `img/cast/` (`hero.png`, `buddy.png`, `trouble.png`, `helper.png`), then fill in the matching entries in `theme.js` and delete `placeholder: true`. A banner character can be added as `img/hero.png`. Children can also invent characters in the browser (stored on their device only).

## Files
- `index.html` home, prompt helper, gang, colours, compare check, Grown-ups setup
- `references/` Look Closely
- `builder/` Comic Maker
- `theme.js` all wording, cast, palettes, levels; `ai.js` provider calls and safety checks
- `pound.css`, `fonts/` (self-hosted open-licence fonts), `img/`
- `img/stickers/<character>/` the gang cut out of their character sheets for the Comic Maker's sticker tray: `<name>.webp` with a see-through background and `<name>-b.webp` with a white border. They are listed in `stickers` in `theme.js`.

## Testing without a key
```
node dev/mock-ai-server.mjs      # pretend AI on http://localhost:1234/v1
node --test dev/copycheck.test.mjs
```
In Grown-ups choose "Something else", address `http://localhost:1234/v1`, any key and model.

## Child safety
Kid-oriented system prompts, no real people, brands or existing characters, and a word filter on inputs and outputs. It is a backstop, not a guarantee: a teacher should still be in the room.
