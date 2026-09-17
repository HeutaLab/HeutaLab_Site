# Retiring edtechlounge.com (the Squarespace site)

Written 2026-09-17. Everything on the HeutaLab side is done; what is left needs
account access — the registrar, Cloudflare and Squarespace — so it is yours to click.

Not published: `migration/` is excluded in `.assetsignore`, so this file lives in the
repo but is never served.

## Where things stand

| | |
|---|---|
| Domain | edtechlounge.com, registered 2009-05-26 at Tucows (Hover) |
| DNS | Hover nameservers — `ns1.hover.com`, `ns2.hover.com` |
| Web | apex + `www` both CNAME `ext-cust.squarespace.com` |
| Mail | MX → `mail.tutanota.de`, so `glenn@edtechlounge.com` lands in Tutanota |
| heutalab.com | already on Cloudflare (`jeff` / `braelyn.ns.cloudflare.com`) |

## The content is safe — checked, not assumed

All 438 URLs in the old sitemap were fetched against heutalab.com on 2026-09-17:

- **438 of 438 return 200.** Nothing 404s.
- 291 are Squarespace tag/category listing pages and land on `/blog/`. Correct — the
  new site has no tag pages and there is nothing more specific to send them to.
- 147 are real content URLs. **141 land on their own page.** The other six are
  `/blog` (→ `/blog/`), the old Squarespace 404 page, and four old category
  landing pages; `/work` now points at `/about/cv/`.

Re-run that check any time with the script in this session's notes, or simply:
`curl -s -o /dev/null -w "%{http_code} %{url_effective}\n" -L https://heutalab.com/<old-path>`

## The one thing that would have broken, now fixed

`blog/olympics-qr-code-treasure-hunt-with-ipods-and-ipads/` linked an 81 MB zip of
25 QR-code photos that only ever lived on Squarespace's CDN — it would have died with
the account, and it is too big for the Workers 25 MiB per-file limit.

The photos were 3648 px camera originals. They are now 1600 px at q82: **7.5 MB**, well
inside the limit, hosted at `/assets/files/qr-treasure-hunt-images.zip`, and the post
links there. Every code was decoded before and after with jsQR — all 25 read, and the
payloads are identical. (One photo, RIMG0984, is marginal for that decoder at certain
scales, but it behaves the same way in the untouched original, so nothing was lost.)

The 81 MB originals remain at `~/Edtechlounge_Export/oversize/`. Worth knowing: the codes
point at 2012-era external image URLs, and the two that could be tested in full are gone
(Wikimedia 404, tqn.com 402) — the hunt is a historical artefact, not a working resource.

## What is left to do

### 1. Move the DNS to Cloudflare

Add edtechlounge.com to the same Cloudflare account as heutalab.com, then change the
nameservers at Hover. **Cloudflare's scan does not always catch everything — check these
records exist in the new zone before you switch the nameservers over**, or mail to
`glenn@edtechlounge.com` stops:

```
MX    edtechlounge.com         1 mail.tutanota.de
TXT   edtechlounge.com         "v=spf1 include:spf.tutanota.de -all"
TXT   edtechlounge.com         "google-site-verification=FAev3Ep3Yk-yo0vftK2pjUAyU9CoVm9SCZC_Rx6pTug"
TXT   edtechlounge.com         "t-verify=1690e3e654cdc7e0096652298ae4b7af"
TXT   _dmarc.edtechlounge.com  "v=DMARC1; p=quarantine; adkim=s"
CNAME s1._domainkey            s1._domainkey.tutanota.de
CNAME s2._domainkey            s2._domainkey.tutanota.de
```

The two A/CNAME records pointing at Squarespace are the ones you are replacing; everything
above is mail and must be recreated exactly.

### 2. Redirect the whole domain

Cloudflare → Rules → Redirect Rules. One rule:

- **If** hostname equals `edtechlounge.com` or `www.edtechlounge.com`
- **Then** dynamic redirect to `concat("https://heutalab.com", http.request.uri.path)`, 301, preserve query string

That is all that is needed — heutalab.com's own `_redirects` (249 rules) then resolves the
old paths. No change to the Worker, no deploy, nothing in this repo.

### 3. Verify before cancelling

```bash
curl -sI https://www.edtechlounge.com/bee-bot-activity-center | head -3
```

Expect `301` → `https://heutalab.com/bee-bot-activity-center`, which then serves the page.
Spot-check a handful of old post URLs the same way.

### 4. Then, and only then

- Cancel the Squarespace plan.
- Google Search Console: submit a change of address from edtechlounge.com to heutalab.com.
- The spam reason for all this: once the old site is off, ~1,300 plaintext copies of the
  email address stop being served. heutalab.com already ships none — `js/main.js`
  assembles it in the browser. See the email-exposure note in memory.

## Do not skip

Squarespace is the only remaining copy of anything not already exported. Before cancelling,
confirm `~/Edtechlounge_Export/` still holds what you need — the five commercial game-design
book PDFs in `s-files/` were deliberately not republished (copyright), and those links 404
on heutalab.com already, cancellation or not.
