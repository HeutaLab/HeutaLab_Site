-- Paws & Order workshop codes (read and written by paws-api/vault.mjs through the Worker's
-- D1 binding: PAWS_DB if there is one, else USAGE, the precinct-usage database).
-- One row per code a teacher has made. No learner text, no names, no per-request record:
-- only what is needed to answer "is this code open, at what level, on whose key".
--
-- Create it once (Glenn runs this by hand; see paws-api/README.md):
--   npx wrangler d1 execute precinct-usage --remote --file paws-api/workshops.sql
-- Safe to run again: it changes nothing if the table is there.

CREATE TABLE IF NOT EXISTS paws_workshops (
  id       TEXT PRIMARY KEY,           -- a fingerprint (HMAC) of the code; the code itself is never stored
  level    INTEGER NOT NULL,           -- the highest level the code opens: 1 Doodler, 2 Sketcher, 3 Storyteller
  platform TEXT,                       -- the image tool the class uses (a theme.js platform id), or NULL: learners choose
  provider TEXT NOT NULL,              -- anthropic | openai | google
  model    TEXT NOT NULL,
  salt     TEXT,                       -- base64, 16 random bytes  \
  iv       TEXT,                       -- base64, 12 random bytes   } the teacher's AI key, AES-256-GCM.
  ct       TEXT,                       -- base64                   /  All three are NULL once the workshop has finished.
  manage   TEXT NOT NULL,              -- SHA-256 of the teacher's manage token
  created  TEXT NOT NULL,              -- UTC, ISO 8601
  expires  TEXT NOT NULL,              -- UTC, ISO 8601: at most 30 days after created
  ended    TEXT,                       -- UTC, ISO 8601, when the teacher ended it early; else NULL
  uses     INTEGER NOT NULL DEFAULT 0, -- helper requests on last_day
  cap      INTEGER NOT NULL,           -- helper requests allowed per UTC day
  last_day TEXT                        -- the UTC day (YYYY-MM-DD) uses belongs to
);
-- For the daily count of new codes.
CREATE INDEX IF NOT EXISTS paws_workshops_created ON paws_workshops (created);
