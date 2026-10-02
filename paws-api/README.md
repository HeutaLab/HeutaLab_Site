# paws-api: workshop codes for Paws & Order

Worker-only code for everything under `/paws-and-order/api/`. Nothing in this folder is served as a file (`paws-api` is in `.assetsignore`). `worker.js` imports `api.mjs` and hands it every request under that prefix, plus the daily cron.

A teacher makes a workshop code on the Teachers page and gives their own AI key with it. Learners type the code; their prompt-helper requests then run on that teacher's key, through this Worker. There are no house codes and no key of Glenn's.

| File | What it is |
|---|---|
| `api.mjs` | The routes, the checks every request passes, the limits. Exports `PAWS_API`, `handlePaws`, `sweepPaws`. |
| `vault.mjs` | Codes, fingerprints, the lock on the teacher's key, and every SQL statement. |
| `words.mjs` | The words a code is made from. |
| `workshops.sql` | The one table, `paws_workshops`. |
| `harness.mjs`, `*.test.mjs` | Tests. `node --test paws-api/*.test.mjs` |

What is asked of the AI lives in `paws-and-order/ai.js`, the same file a teacher's own-key browser uses.

## Switching it on (Glenn, by hand, once)

Until both steps are done every route answers `503 {"reason":"not_open"}`. The pages say "Workshop codes are not switched on yet", learners get starter prompts, and nothing else on the site is affected. Run these from the repo root, where `wrangler.jsonc` is.

**1. Create the table.** It goes in the existing `precinct-usage` database, next to the Precinct's `events` table, which it does not touch.

```
npx wrangler d1 execute precinct-usage --remote --file paws-api/workshops.sql
```

Check it is there (the answer should be `n = 0`; a missing table fails silently in the Worker, as "not open"):

```
npx wrangler d1 execute precinct-usage --remote --command "SELECT COUNT(*) AS n FROM paws_workshops"
```

**2. Set the vault secret.** 32 random bytes, base64. This makes one and hands it straight to Cloudflare, so it is never on screen, in a file or in a chat:

```
openssl rand -base64 32 | npx wrangler secret put PAWS_VAULT_KEY
```

Do not keep a copy. If it is ever lost or changed, every code made before stops working (a learner sees "That code did not work"), teachers make new codes, and the daily sweep clears the old rows as they expire. Nothing else breaks.

**3. Deploy** the usual way. The deploy also brings the six `PAWS_*` rate limiters, the cron (03:17 UTC daily) and `PAWS_SESSION_CAP` from `wrangler.jsonc`. If any of the six limiters is missing the API answers "not open" instead of running without it.

Then, on the live site: open the Teachers page, make a code with a real key, and type it into the code box on the home page.

## What is kept, and for how long

One row per code, in `paws_workshops`. Never the code itself (only an HMAC of it), never a learner's text, never a name, an address or a per-request record.

- The teacher's AI key, encrypted with AES-256-GCM. The row's key is derived from `PAWS_VAULT_KEY` and from the code, so neither the database alone nor the secret alone opens it. Whoever holds both can (a code is short enough to find by trying them all): that is the site owner. The Teachers page says so, and tells teachers to make a key just for this with a spend limit.
- The level, image tool, AI service and model; when the code was made, when it ends, whether it was ended; the daily allowance and today's count; a SHA-256 of the teacher's manage token.
- The encrypted key is erased the moment a teacher ends the workshop, and otherwise by the first sweep after it expires (the cron runs daily; making a code also runs it). The emptied row stays 30 days so a learner can be told "that code has finished" rather than "that code did not work", then it is deleted. D1's own backups (Time Travel) can hold an earlier copy for up to 30 days more.
- Counters, not logs: Cloudflare's rate limiters count requests per address and per browser id for a minute, and the data centre's cache holds a count per browser id (hashed) for six hours and a count of key tests per day.
- The Worker's log gets a route name and a short code (`brief`, `gate_http_529`) when something fails. Never text, never a key.

## The limits

| Limit | Value | Where |
|---|---|---|
| Helper requests per code per UTC day | 300, 600 or 1200, chosen by the teacher | the row's `cap`, taken in one SQL statement |
| AI requests per browser per minute | 8 | `PAWS_SESSION_LIMIT` |
| AI requests per browser per six hours | 40 | `PAWS_SESSION_CAP` (a var in `wrangler.jsonc`) |
| Brief and compare requests per address per minute | 120 | `PAWS_IP_LIMIT` |
| Code checks per browser, per address, per minute | 12, 600 | `PAWS_CODE_CHECKS`, `PAWS_CODE_IP` |
| New codes per address per minute | 5 | `PAWS_SETUP_IP` |
| Status, end and level requests per address per minute | 60 | `PAWS_MANAGE_IP` |
| Live key tests per day, from one address | 20 | `api.mjs` |
| Live key tests per day, per data centre | 400 | `api.mjs` |
| New codes per day, everywhere | 200 | `api.mjs`, counted in the table |

A whole class shares one school address, so the per-address limits are flood guards. The two per-browser limits are a courtesy, not a lock: the page invents the browser id, so anyone who sends a new id each time is held only by the per-address limit. The bound on what anyone can make a teacher's key spend is the code's own daily allowance.

The allowance counts requests, not money. One request is at most two calls to the AI service (the coach, then the helper; a compare is one), each capped at 1,500 or 3,000 output tokens, and a request that the service fails to answer still counts. The count starts again at midnight UTC. So a key's real ceiling is the spend limit the teacher sets at the AI service, which the Teachers page tells them to do.

Someone who has a class's code (it is written on a board) can use up that class's allowance for the day. A code cannot be used to read the key, the model or anything about the teacher.

## Trying it without a real key (local only)

For a local Worker (`wrangler dev` from a config outside the repo: from the repo root it loops), the Worker reads `PAWS_TEST_AI_BASE`. When its host is `localhost` or `127.0.0.1`, every AI call goes to that OpenAI-compatible address instead of the real services:

```
node paws-and-order/dev/mock-ai-server.mjs          # http://localhost:1234/v1
```

with `PAWS_TEST_AI_BASE=http://localhost:1234/v1` and a `PAWS_VAULT_KEY` in the local `.dev.vars`, and the table made in the local database (`--local` in place of `--remote` above). Any other value is ignored and logged as `test_base_ignored`: whatever is at that address would be sent teachers' keys. It is never read from a request, and must never be set on the live Worker.

## Tests

```
node --test paws-api/*.test.mjs
node --test precinct-api/*.test.mjs        # The Precinct's, which must still pass
node --test paws-and-order/dev/*.test.mjs  # ai.js, workshop.js, the journey
```

The database in the tests is real SQLite (node's built-in `node:sqlite`, in memory, with the table from `workshops.sql`), so the statements in `vault.mjs` are run, not imitated. `sqlite.test.mjs` runs them once more through the `sqlite3` command-line tool, if the machine has one. What the tests cannot see is a real Worker start-up: before a deploy, also run `npx wrangler deploy --dry-run --outdir <somewhere outside the repo>` and load the result locally.
