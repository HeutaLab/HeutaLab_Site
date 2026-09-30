-- Ready-made questions for The Precinct's usage log. Run one with:
--   npx wrangler d1 execute precinct-usage --remote --command "<the query>"
-- Times are stored in UTC; datetime(at, '+7 hours') gives Bangkok time.
-- via = desk (Glenn's key, through the Worker) or own (the attendee's key).

-- Requests per day, split by shared desk and own key
SELECT date(at, '+7 hours') AS day, via, route, COUNT(*) AS requests, COUNT(DISTINCT who) AS browsers
FROM events GROUP BY day, via, route ORDER BY day, via, route;

-- How requests ended (ok, questions, fallback, wrong_code, locked, limited, capped, ...)
SELECT via, route, outcome, COUNT(*) AS n FROM events GROUP BY via, route, outcome ORDER BY via, route, n DESC;

-- People per level (from the workshop codes they used)
SELECT level, COUNT(DISTINCT who) AS browsers FROM events WHERE via = 'desk' AND level IS NOT NULL GROUP BY level;

-- Which image tools, tiers, subjects, palettes and characters people chose
SELECT platform, tier, subject, COUNT(*) AS briefs FROM events WHERE route = 'brief' GROUP BY platform, tier, subject ORDER BY briefs DESC;
SELECT palette, COUNT(*) AS briefs FROM events WHERE route = 'brief' GROUP BY palette ORDER BY briefs DESC;
SELECT cast_ids, COUNT(*) AS briefs FROM events WHERE route = 'brief' AND cast_ids IS NOT NULL GROUP BY cast_ids ORDER BY briefs DESC;

-- How often the look-first gate asked questions before a brief (round 1 only)
SELECT outcome, COUNT(*) AS n FROM events WHERE route = 'brief' AND round = 1 AND example = 0 GROUP BY outcome;

-- Speed: average and slowest successful brief, per day
SELECT date(at, '+7 hours') AS day, via, ROUND(AVG(ms)) AS avg_ms, MAX(ms) AS max_ms
FROM events WHERE route = 'brief' AND outcome = 'ok' GROUP BY day, via;

-- Own keys: which AI services attendees brought
SELECT provider, COUNT(DISTINCT who) AS browsers, COUNT(*) AS requests FROM events WHERE via = 'own' GROUP BY provider;

-- Busiest hours during the workshop (Bangkok time)
SELECT strftime('%Y-%m-%d %H:00', at, '+7 hours') AS hour, COUNT(*) AS requests
FROM events GROUP BY hour ORDER BY hour;
