# HeutaLab website

Framework-free static site for [heutalab.com](https://heutalab.com), served by a
Cloudflare Worker (static assets). Includes the full **EdTech Lounge archive**
(2009–2024) migrated from Squarespace: 120 blog posts, 39 legacy pages, and all
images/files self-hosted under `assets/legacy/`.

## Structure

```text
index.html            homepage
blog/                 blog index + one folder per post + feed.xml
<page>/index.html     legacy library pages (resources, coding, media, …)
about/  site-index/   about page, full site index
404.html              not-found page (served by the Worker)
css/                  styles.css (homepage) + legacy.css (blog/library)
assets/legacy/        migrated images & downloads from Squarespace
assets/files/         file downloads (/s/… links from the old site)
_redirects            old Squarespace URLs -> new locations
migration/            scripts + content store used for the migration
```

## Preview locally

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`. (`_redirects` and the 404 page only work on
Cloudflare, not in the local server.)

## Deploy

One-time: `npx wrangler login`. Then from the repo root:

```bash
npx wrangler deploy
```

This uploads everything (minus `.assetsignore` entries) to the existing Worker
(`hidden-hall-06d6`, behind heutalab.com).

## Regenerating the blog / legacy pages

Content lives in `migration/content.json` (parsed from the Squarespace export).
To rebuild all generated pages after editing templates in
`migration/build_site.py`:

```bash
python3 migration/build_site.py
```

New posts can be added by copying an existing `blog/<slug>/index.html` and
editing it, or by extending `migration/content.json` and re-running the build.
