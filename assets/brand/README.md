# HeutaLab brand kit — the spark

Decided 2026-08-02 (spec: SageStage repo, `docs/heutalab-brand-design.md`; comps:
`docs/design/heutalab-logo-directions.html`). The spark — cobalt hill, coral sun,
amber peak, lime smile; a landscape looking up, a reader over an open book in one
colour — is the HeutaLab mark everywhere. The four header bars live on as tile
art. Wordmark: vendored Poppins 700 as paths, "Heuta" ink / "Lab" coral.

Rules: flat baked colours, no gradients, no CSS vars inside shipped SVGs, text
always as paths. The favicon drops the lime arc (mush below 20px — verified with
honest 16px renders); everything 48px+ keeps it.

| file | use |
|---|---|
| `favicon.svg` | tabs — also deployed as `/assets/favicon.svg` (all pages reference that path) |
| `favicon-16/32.png` `icon-48/192/512.png` | raster ladder; 16/32 are arc-less |
| `apple-touch-180.png` | opaque paper bg (iOS composites black under transparency) |
| `avatar-{paper,ink,coral}.png/.svg` | 1024², mark at 60% — circle-crop safe. **Ink is the default upload** for @heutalab (Instagram, X, YouTube, TikTok) + GitHub org |
| `banner-x-1500x500.*` | X header |
| `banner-youtube-2048x1152.*` | YouTube channel art; lockup inside the 1546×423 safe area |
| `og-1200x630.*` | also deployed as `/assets/og.png` |
| `heutalab-email-header*` | MailerLite masthead — colour (live), ink, teal (#0f766e, Sage Stage's accent); 600×120 display size, @2x for retina, paper bg baked for dark-mode clients |

Regeneration: `build_kit.py` / `build_email_header.py` + `wordmark-raw.json`
(fontTools over `SageStage/vendor/fonts/poppins-*.woff2`).
