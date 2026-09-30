-- The Precinct's usage log (D1 database precinct-usage, binding USAGE).
-- One row per desk request, whether it ran on the shared desk (Glenn's key,
-- via worker.js) or on an attendee's own key (the page reports it to
-- /the-precinct/api/ping). Only fixed choices and counts: never what anyone
-- typed, their workshop code, their key or their IP address.
--
-- Create it once (already done on 2026-09-30):
--   npx wrangler d1 execute precinct-usage --remote --file precinct-api/usage.sql
-- Read it: see precinct-api/usage-queries.sql.

CREATE TABLE IF NOT EXISTS events (
  id        INTEGER PRIMARY KEY,
  at        TEXT NOT NULL,     -- UTC, ISO 8601
  via       TEXT NOT NULL,     -- desk (shared key) | own (attendee's key)
  route     TEXT NOT NULL,     -- code | brief | compare
  outcome   TEXT NOT NULL,     -- ok, questions, fallback, copied, wrong_code, locked, limited, bad_key, ...
  ms        INTEGER,           -- how long the request took
  who       TEXT,              -- a hash of the page's random browser id: counts people, names nobody
  level     INTEGER,           -- the level the workshop code unlocks (desk only)
  provider  TEXT,              -- anthropic on the desk; gemini | openai | anthropic on own keys
  platform  TEXT,              -- the image tool the prompt is for
  tier      TEXT,              -- basic | medium | advanced
  subject   TEXT,              -- character | setting
  palette   TEXT,
  cast_ids  TEXT,              -- the characters in a character brief, comma-separated
  round     INTEGER,           -- brief round 1 (first try) or 2 (after the questions)
  example   INTEGER,           -- 1 = a worked example brought over from References
  reference INTEGER            -- 1 = a compare with a reference description (Commissioner level)
);
CREATE INDEX IF NOT EXISTS events_at ON events (at);
