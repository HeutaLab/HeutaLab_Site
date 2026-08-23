#!/usr/bin/env python3
"""Generate the static blog + legacy pages from the parsed Squarespace export.

Outputs (committed to the repo):
  blog/index.html, blog/<slug>/index.html, blog/feed.xml
  /<legacy-page>/index.html for every exported page
  art-and-imaging/, bee-bot-activity-center/, newsletter/ collection landings
  about/, site-index/, 404.html, sitemap.xml, _redirects
Re-run any time with: python3 migration/build_site.py
"""
import sys as _sys

# ---------------------------------------------------------------------------
# STOP. This script can no longer regenerate this site.
#
# It was the one-off Squarespace migration tool and it has not tracked the
# site since. Checked 2026-08-23, it still emits:
#   * the old chrome -- <a class="brand"> with four <i class="bar"> elements
#     that have had no CSS for months and render as an empty 58x58 box
#   * no tokens.css link, no sec-* section classes, no wordmark, no new footer
#   * CARD_TONES / EYEBROW_TONES, the four-way colour rotation that was
#     deleted deliberately (the tints measured 1.007-1.017:1 against each
#     other -- four names for one tint)
#
# Running it would silently revert the design system across 166 pages.
# Bring it up to date before removing this guard, or delete the script.
# ---------------------------------------------------------------------------
if __name__ == '__main__':
    _sys.exit(
        "build_site.py is stale and would revert the live design system.\n"
        "See the guard comment at the top of this file."
    )


import html as htmllib
import json
import re
from collections import Counter
from datetime import datetime
from pathlib import Path

from common import (ROOT, PUBLISHED, PAGES, OLD2NEW, SPECIAL_REDIRECTS,
                    clean_html, excerpt_of, post_new_path, text_of, UNMAPPED_LINKS)

SITE = 'https://heutalab.com'
MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
          'August', 'September', 'October', 'November', 'December']

LIBRARY_LINKS = [
    ('/resources/', 'Resource library'),
    ('/coding/', 'Coding'),
    ('/game-based-learning/', 'Game-based learning'),
    ('/media/', 'Media'),
    ('/presenting/', 'Presenting'),
    ('/eyfs/', 'Early Years (EYFS)'),
    ('/professional-development/', 'Professional development'),
    ('/experimental/', 'Experimental'),
    ('/site-index/', 'Everything (site index)'),
]

SITEMAP_URLS = []


def esc(s):
    return htmllib.escape(s, quote=True)


def fmt_date(iso):
    d = datetime.strptime(iso[:10], '%Y-%m-%d')
    return f'{d.day} {MONTHS[d.month - 1]} {d.year}'


def page_shell(*, title, description, path, active, inner, extra_head=''):
    nav_lib = '\n'.join(
        f'              <a href="{h}">{esc(t)}</a>' for h, t in LIBRARY_LINKS)
    mobile = '\n'.join(
        f'            <a href="{h}">{esc(t)}</a>'
        for h, t in [('/', 'Home'), ('/blog/', 'Blog'), ('/resources/', 'Resources'),
                     ('/site-index/', 'Site index'), ('/about/', 'About')])
    def act(name):
        return ' class="active"' if active == name else ''
    return f'''<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="{esc(description)}" />
    <meta property="og:title" content="{esc(title)}" />
    <meta property="og:description" content="{esc(description)}" />
    <meta property="og:image" content="{SITE}/assets/og.png" />
    <link rel="canonical" href="{SITE}{path}" />
    <link rel="alternate" type="application/rss+xml" title="HeutaLab blog" href="/blog/feed.xml" />
    <title>{esc(title)}</title>
    <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml" />
    <link rel="stylesheet" href="/css/styles.css?v=2" />
    <link rel="stylesheet" href="/css/legacy.css?v=2" />
{extra_head}  </head>
  <body>
    <main id="top">
      <header class="site-header shell">
        <a class="brand" href="/" aria-label="HeutaLab home">
          <span class="brand-mark" aria-hidden="true">
            <i class="bar one"></i><i class="bar two"></i><i class="bar three"></i><i class="bar four"></i>
          </span>
          <span class="brand-copy">
            <span class="brand-name">Heuta<span>Lab</span></span>
            <small>EDTECH FOR CURIOUS MINDS</small>
          </span>
        </a>
        <nav class="desktop-nav" aria-label="Primary navigation">
          <a{act('home')} href="/">Home</a>
          <a{act('blog')} href="/blog/">Blog</a>
          <details>
            <summary>Library</summary>
            <div class="nav-menu">
{nav_lib}
            </div>
          </details>
          <a{act('about')} href="/about/">About</a>
        </nav>
        <a class="login" href="/#newsletter">Login</a>
        <details class="mobile-menu">
          <summary aria-label="Open navigation"><span></span><span></span><span></span></summary>
          <nav aria-label="Mobile navigation">
{mobile}
          </nav>
        </details>
      </header>

{inner}

      <footer class="site-footer shell">
        <p><strong>HeutaLab</strong> · <a href="/blog/">Blog</a> · <a href="/resources/">Resources</a> · <a href="/site-index/">Site index</a> · <a href="/about/">About</a></p>
        <p class="footnote">Includes the EdTech Lounge archive (2009–2024), migrated from Squarespace to this site.</p>
      </footer>
    </main>
  </body>
</html>
'''


def write_page(path, html):
    """path like /blog/foo/ -> blog/foo/index.html ; or a bare file path."""
    if path.endswith('/'):
        out = ROOT / path.strip('/') / 'index.html'
    else:
        out = ROOT / path.lstrip('/')
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html)
    SITEMAP_URLS.append(path if path.endswith('/') or path.startswith('/') else '/' + path)


def chips_for(post):
    cats = sorted({c.strip() for c in post['categories'] if c and c.strip()})
    return cats


# ---------------------------------------------------------------- blog posts
def build_posts():
    for i, p in enumerate(PUBLISHED):
        body = clean_html(p['body'], ctx=post_new_path(p))
        cats = chips_for(p)
        chips = ''.join(f'<a class="chip" href="/blog/#cat={esc(c.lower())}">{esc(c)}</a>' for c in cats)
        prev_link = next_link = ''
        if i > 0:
            q = PUBLISHED[i - 1]
            prev_link = f'<a class="pn prev" href="{post_new_path(q)}"><small>← Older</small><span>{esc(q["title"])}</span></a>'
        if i < len(PUBLISHED) - 1:
            q = PUBLISHED[i + 1]
            next_link = f'<a class="pn next" href="{post_new_path(q)}"><small>Newer →</small><span>{esc(q["title"])}</span></a>'
        inner = f'''      <article class="page-wrap shell">
        <div class="page-hero">
          <p class="eyebrow blue">Blog · EdTech Lounge archive</p>
          <h1>{esc(p['title'])}<span>.</span></h1>
          <div class="lime-stroke" aria-hidden="true"></div>
          <p class="post-meta"><time datetime="{p['date'][:10]}">{fmt_date(p['date'])}</time>{'&ensp;·&ensp;' if chips else ''}{chips}</p>
        </div>
        <div class="prose">
{body}
        </div>
        <nav class="post-nav" aria-label="More posts">{prev_link}{next_link}</nav>
        <p class="backlink"><a href="/blog/">← All posts</a></p>
      </article>'''
        write_page(post_new_path(p), page_shell(
            title=f"{p['title']} — HeutaLab",
            description=excerpt_of(p),
            path=post_new_path(p), active='blog', inner=inner))
    print(f'posts: {len(PUBLISHED)}')


# ---------------------------------------------------------------- blog index
def build_blog_index():
    cat_counts = Counter()
    for p in PUBLISHED:
        for c in chips_for(p):
            cat_counts[c.lower()] += 1
    top = [c for c, n in cat_counts.most_common() if n >= 3]

    years = {}
    for p in reversed(PUBLISHED):
        years.setdefault(p['date'][:4], []).append(p)

    chip_html = '<button class="chip chip-btn selected" data-cat="">All</button>' + ''.join(
        f'<button class="chip chip-btn" data-cat="{esc(c)}">{esc(c)} <i>{cat_counts[c]}</i></button>'
        for c in top)

    sections = []
    for year, plist in years.items():
        items = []
        for p in plist:
            cats = [c.lower() for c in chips_for(p)]
            items.append(f'''          <li data-cats="{esc('|'.join(cats))}">
            <a class="pl-title" href="{post_new_path(p)}">{esc(p['title'])}</a>
            <span class="pl-meta">{fmt_date(p['date'])}{' · ' + esc(', '.join(chips_for(p))) if cats else ''}</span>
            <p class="pl-excerpt">{esc(excerpt_of(p, 150))}</p>
          </li>''')
        sections.append(f'''        <section class="year-group" data-year="{year}">
          <h2 class="year-h">{year}</h2>
          <ul class="post-list">
{chr(10).join(items)}
          </ul>
        </section>''')

    inner = f'''      <div class="page-wrap shell">
        <div class="page-hero">
          <p class="eyebrow blue">Blog</p>
          <h1>The EdTech Lounge archive<span>.</span></h1>
          <div class="lime-stroke" aria-hidden="true"></div>
          <p class="hero-sub">{len(PUBLISHED)} posts on classroom technology, coding, games and training —
          written between 2009 and 2024 and preserved here on HeutaLab.
          Subscribe via <a href="/blog/feed.xml">RSS</a>.</p>
        </div>
        <div class="chip-row" id="filters" aria-label="Filter by category">
{chip_html}
        </div>
{chr(10).join(sections)}
        <p class="filter-empty" id="filter-empty" hidden>No posts in this category.</p>
      </div>
      <script>
      (function () {{
        var chips = document.querySelectorAll('.chip-btn');
        function apply(cat) {{
          chips.forEach(function (c) {{ c.classList.toggle('selected', c.dataset.cat === cat); }});
          var any = false;
          document.querySelectorAll('.post-list li').forEach(function (li) {{
            var show = !cat || ('|' + li.dataset.cats + '|').indexOf('|' + cat + '|') !== -1;
            li.hidden = !show; if (show) any = true;
          }});
          document.querySelectorAll('.year-group').forEach(function (g) {{
            g.hidden = !Array.prototype.some.call(g.querySelectorAll('li'), function (li) {{ return !li.hidden; }});
          }});
          document.getElementById('filter-empty').hidden = any;
        }}
        chips.forEach(function (c) {{
          c.addEventListener('click', function () {{
            var cat = c.dataset.cat;
            history.replaceState(null, '', cat ? '#cat=' + encodeURIComponent(cat) : location.pathname);
            apply(cat);
          }});
        }});
        var m = location.hash.match(/^#cat=(.+)$/);
        if (m) apply(decodeURIComponent(m[1]));
      }})();
      </script>'''
    write_page('/blog/', page_shell(
        title='Blog — HeutaLab',
        description='The EdTech Lounge archive: 15 years of posts on classroom technology, coding, game-based learning and teacher training.',
        path='/blog/', active='blog', inner=inner))
    print('blog index: ok')


# ------------------------------------------------------------- legacy pages
# Nav-level hub pages get the homepage's panel-card treatment; the rest stay
# as plain prose articles.
HUB_META = {
    '/resources': ('Resource library',
                   'Classroom-ready projects, files and how-to videos from fifteen years of teaching with technology.'),
    '/coding': ('Coding',
                'Schemes of work and projects for teaching programming — Scratch, Sonic Pi, robots and more.'),
    '/presenting': ('Presenting',
                    'Workshop and conference resources: Minecraft Education, Sonic Pi and hands-on sessions.'),
    '/media': ('Media',
               'Making things in the classroom — 3D printing, Photoshop, MinecraftEDU and stop-motion animation.'),
    '/game-based-learning': ('Game-based learning',
                             'Learning through games, from Minecraft story worlds to classroom game design.'),
    '/experimental': ('Experimental',
                      'Prototypes and future-classroom experiments — digital canvases, new hardware, new habits.'),
    '/eyfs': ('Early Years (EYFS)',
              'Websites, apps and interactives that actually work with 3–5 year olds.'),
    '/professional-development': ('Professional development',
                                  'Teacher training sessions, masterclasses and conference workshops.'),
}
CARD_TONES = ['']          # retired: rotation by document order, no meaning
EYEBROW_TONES = ['']       # retired: .eyebrow now reads the page's section
H_SPLIT = re.compile(r'<h([12])\b[^>]*>(.*?)</h\1>', re.S | re.I)


def anchor_slug(text, used):
    base = re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')[:60] or 'section'
    slug, n = base, 2
    while slug in used:
        slug, n = f'{base}-{n}', n + 1
    used.add(slug)
    return slug


DIV_TOKEN = re.compile(r'<div\b[^>]*>|</div\s*>', re.I)


def balance_divs(fragment):
    """Heading-boundary splits can cut through Squarespace wrapper divs,
    leaving orphan closers that would end our card early. Drop closers with no
    opener in the fragment and close any left open."""
    out, depth = [], 0
    pos = 0
    for m in DIV_TOKEN.finditer(fragment):
        out.append(fragment[pos:m.start()])
        tok = m.group(0)
        if tok.lower().startswith('<div'):
            depth += 1
            out.append(tok)
        elif depth > 0:
            depth -= 1
            out.append(tok)
        # else: orphan </div> — drop it
        pos = m.end()
    out.append(fragment[pos:])
    return ''.join(out) + '</div>' * depth


def sectionize(body):
    """Split cleaned page HTML into (intro, [(heading_text, inner_html), ...])
    at its top-most heading level. Empty headings merge into the previous
    section (Squarespace used them as spacers)."""
    levels = [m.group(1) for m in H_SPLIT.finditer(body)]
    if not levels:
        return body, []
    top = min(levels)
    parts = re.split(r'(<h%s\b[^>]*>.*?</h%s\s*>)' % (top, top), body, flags=re.S | re.I)
    intro, sections = parts[0], []
    for i in range(1, len(parts), 2):
        heading_html, content = parts[i], parts[i + 1] if i + 1 < len(parts) else ''
        heading = text_of(heading_html).strip()
        if not heading and sections:
            sections[-1] = (sections[-1][0], sections[-1][1] + content)
        elif not heading:
            intro += content
        else:
            sections.append((heading, content))
    return intro, sections


def hub_inner(title, blurb, body):
    intro, sections = sectionize(body)
    used = set()
    cards, chips = [], []
    intro = balance_divs(intro)
    # "Part 2" / "Day 3"-style headings are continuations, not new topics
    merged = []
    for heading, content in sections:
        if merged and re.match(r'^(part|day|session|lesson)\s*\d+\b', heading, re.I):
            merged[-1] = (merged[-1][0],
                          merged[-1][1] + f'<h2>{esc(heading)}</h2>' + content)
        else:
            merged.append((heading, content))
    sections = [(h, balance_divs(c)) for h, c in merged]
    for i, (heading, content) in enumerate(sections):
        sid = anchor_slug(heading, used)
        tone = CARD_TONES[i % len(CARD_TONES)]
        eyebrow = EYEBROW_TONES[i % len(EYEBROW_TONES)]
        chips.append(f'<a class="chip" href="#{sid}">{esc(heading)}</a>')
        cards.append(f'''        <section class="content-card {tone}" id="{sid}">
          <p class="eyebrow {eyebrow}">{esc(title)} · {i + 1:02d}</p>
          <h2 class="card-title">{esc(heading)}</h2>
          <div class="prose card-prose">
{content.strip()}
          </div>
        </section>''')
    intro_html = f'<div class="prose">\n{intro.strip()}\n</div>\n' if text_of(intro).strip() else ''
    toc = f'<nav class="chip-row toc-row" aria-label="On this page">{"".join(chips)}</nav>' if len(chips) > 1 else ''
    return f'''      <div class="page-wrap shell">
        <div class="page-hero">
          <p class="eyebrow purple">Library · EdTech Lounge archive</p>
          <h1>{esc(title)}<span>.</span></h1>
          <div class="lime-stroke" aria-hidden="true"></div>
          <p class="hero-sub">{esc(blurb)}</p>
        </div>
        {toc}
        {intro_html}<div class="card-stack">
{chr(10).join(cards)}
        </div>
        <p class="backlink"><a href="/site-index/">← Site index</a></p>
      </div>'''


def build_legacy_pages():
    for path, pg in sorted(PAGES.items()):
        new_path = path.rstrip('/') + '/'
        body = clean_html(pg['body'], ctx=new_path)
        if path in HUB_META:
            title, blurb = HUB_META[path]
            inner = hub_inner(title, blurb, body)
            desc = blurb
        else:
            title = pg['title'] or path.strip('/').replace('-', ' ').title()
            if title.isupper() and len(title) > 6:
                title = title.capitalize()
            desc = excerpt_of(pg) or f'{title} — from the EdTech Lounge archive.'
            inner = f'''      <article class="page-wrap shell">
        <div class="page-hero">
          <p class="eyebrow purple">Library · EdTech Lounge archive</p>
          <h1>{esc(title)}<span>.</span></h1>
          <div class="lime-stroke" aria-hidden="true"></div>
        </div>
        <div class="prose">
{body}
        </div>
        <p class="backlink"><a href="/site-index/">← Site index</a></p>
      </article>'''
        write_page(new_path, page_shell(
            title=f'{title} — HeutaLab', description=desc,
            path=new_path, active='', inner=inner))
    print(f'legacy pages: {len(PAGES)} ({len(HUB_META)} hub-style)')


# ------------------------------------------------- collection landing pages
def build_collections():
    coll_meta = {
        'art-and-imaging': ('Art and Imaging',
                            'Digital art, photo editing and creative imaging in the primary classroom.'),
        'bee-bot-activity-center': ('Bee-Bot Activity Center',
                                    'Programmable floor robots for early-years computing.'),
        'newsletter': ('Newsletters',
                       'School ICT newsletters from the archive.'),
    }
    for coll, (title, blurb) in coll_meta.items():
        plist = [p for p in PUBLISHED if coll in p['collections']]
        if not plist:
            continue
        items = ''.join(f'''          <li>
            <a class="pl-title" href="{post_new_path(p)}">{esc(p['title'])}</a>
            <span class="pl-meta">{fmt_date(p['date'])}</span>
            <p class="pl-excerpt">{esc(excerpt_of(p, 150))}</p>
          </li>\n''' for p in reversed(plist))
        inner = f'''      <div class="page-wrap shell">
        <div class="page-hero">
          <p class="eyebrow purple">Collection · EdTech Lounge archive</p>
          <h1>{esc(title)}<span>.</span></h1>
          <div class="lime-stroke" aria-hidden="true"></div>
          <p class="hero-sub">{esc(blurb)}</p>
        </div>
        <ul class="post-list">
{items}        </ul>
        <p class="backlink"><a href="/blog/">← All posts</a></p>
      </div>'''
        write_page(f'/{coll}/', page_shell(
            title=f'{title} — HeutaLab', description=blurb,
            path=f'/{coll}/', active='blog', inner=inner))
    print('collection landings: ok')


# ------------------------------------------------------------------- about
def build_about():
    img = ''
    cover_map_key = 'https://images.squarespace-cdn.com/content/v1/4ff7ea9be4b049a93ba88dc0/1481114494025-QCHX42X6EMKW7NJIT2M0/image-asset.jpeg'
    asset_map = json.loads((ROOT / 'migration' / 'asset-map.json').read_text())
    for k, v in asset_map.items():
        if '1481114494025' in k:
            img = f'<img class="about-photo" src="/{v}" alt="Glenn Malcolm" loading="lazy">'
            break
    inner = f'''      <article class="page-wrap shell">
        <div class="page-hero">
          <p class="eyebrow blue">About</p>
          <h1>Glenn Malcolm<span>.</span></h1>
          <div class="lime-stroke" aria-hidden="true"></div>
        </div>
        <div class="prose about-prose">
          {img}
          <p><strong>Technology &amp; Learning · Curriculum Designer, Subject Leader &amp; International
          schools consultant.</strong></p>
          <p>Educational Technology qualifications including Google for Education training, plus
          innovation and game-based-learning consultancy through Minecraft at your school.</p>
          <p>HeutaLab is where that work continues — practical EdTech tools, ideas and training for
          teachers, leaders and parents of 5–13 year olds. The <a href="/blog/">blog archive</a> collects
          fifteen years of writing from the EdTech Lounge era (2009–2024).</p>
          <p class="about-actions">
            <a class="button button-primary" href="mailto:glenn.malcolm@tutanota.com">Get in touch</a>
            <a class="button button-outline" href="/assets/files/GLENN-MALCOLM-CV-EDUCATIONAL-TECHNOLOGY.pdf">CV (PDF)</a>
          </p>
        </div>
      </article>'''
    write_page('/about/', page_shell(
        title='About — HeutaLab',
        description='Glenn Malcolm — technology & learning curriculum designer, subject leader and international schools consultant.',
        path='/about/', active='about', inner=inner))
    print('about: ok')


# --------------------------------------------------------------- site index
def build_site_index():
    groups = {}
    for path in sorted(PAGES):
        top = path.strip('/').split('/')[0]
        groups.setdefault(top[0].upper(), []).append(path)
    rows = []
    for letter in sorted(groups):
        links = ''.join(
            f'<li><a href="{p.rstrip("/")}/">{esc((PAGES[p]["title"] or p.strip("/")).strip())}</a>'
            f' <span class="pl-meta">{esc(p)}</span></li>\n' for p in groups[letter])
        rows.append(f'<h2 class="year-h">{letter}</h2><ul class="post-list plain">{links}</ul>')
    inner = f'''      <div class="page-wrap shell">
        <div class="page-hero">
          <p class="eyebrow purple">Site index</p>
          <h1>Everything on this site<span>.</span></h1>
          <div class="lime-stroke" aria-hidden="true"></div>
          <p class="hero-sub">All {len(PAGES)} legacy pages from the EdTech Lounge archive, plus the
          <a href="/blog/">blog ({len(PUBLISHED)} posts)</a>, the
          <a href="/art-and-imaging/">Art and Imaging</a> and
          <a href="/bee-bot-activity-center/">Bee-Bot</a> collections, and <a href="/about/">about</a>.</p>
        </div>
{chr(10).join(rows)}
      </div>'''
    write_page('/site-index/', page_shell(
        title='Site index — HeutaLab',
        description='Every page on HeutaLab, including the full EdTech Lounge legacy library.',
        path='/site-index/', active='', inner=inner))
    print('site index: ok')


# --------------------------------------------------------------------- 404
def build_404():
    inner = '''      <div class="page-wrap shell">
        <div class="page-hero">
          <p class="eyebrow blue">404</p>
          <h1>Page not found<span>.</span></h1>
          <div class="lime-stroke" aria-hidden="true"></div>
          <p class="hero-sub">That page isn't here — it may not have survived the move from the old
          EdTech Lounge site. Try the <a href="/blog/">blog archive</a> or the
          <a href="/site-index/">site index</a>.</p>
        </div>
      </div>'''
    (ROOT / '404.html').write_text(page_shell(
        title='Page not found — HeutaLab', description='Page not found.',
        path='/404.html', active='', inner=inner))
    print('404: ok')


# ----------------------------------------------------------------- feeds &c
def build_feed():
    items = []
    for p in reversed(PUBLISHED[-20:]):
        d = datetime.strptime(p['date'], '%Y-%m-%d %H:%M:%S')
        pub = d.strftime('%a, %d %b %Y %H:%M:%S +0000')
        items.append(f'''  <item>
    <title>{esc(p['title'])}</title>
    <link>{SITE}{post_new_path(p)}</link>
    <guid isPermaLink="true">{SITE}{post_new_path(p)}</guid>
    <pubDate>{pub}</pubDate>
    <description>{esc(excerpt_of(p, 300))}</description>
  </item>''')
    feed = f'''<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>HeutaLab blog</title>
  <link>{SITE}/blog/</link>
  <description>EdTech for curious minds — including the EdTech Lounge archive (2009–2024).</description>
{chr(10).join(items)}
</channel>
</rss>
'''
    (ROOT / 'blog' / 'feed.xml').write_text(feed)
    print('feed: ok')


def build_sitemap():
    urls = ['/'] + sorted(set(SITEMAP_URLS))
    entries = []
    for u in urls:
        if u == '/404.html':
            continue
        entries.append(f'  <url><loc>{SITE}{u}</loc></url>')
    (ROOT / 'sitemap.xml').write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + '\n'.join(entries) + '\n</urlset>\n')
    (ROOT / 'robots.txt').write_text(f'User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n')
    print(f'sitemap: {len(entries)} urls')


def build_redirects():
    lines = ['# Legacy EdTech Lounge URLs -> new locations']
    for old, new in sorted(SPECIAL_REDIRECTS.items()):
        lines.append(f'{old} {new} 301')
    for p in PUBLISHED:
        for a in sorted(p['aliases']):
            if a != post_new_path(p):
                lines.append(f'{a} {post_new_path(p)} 301')
    lines += [
        '# category/tag archives from the old blog',
        '/blog/category/* /blog/ 301',
        '/blog/tag/* /blog/ 301',
        '/category/* /blog/ 301',
        '/tag/* /blog/ 301',
        '# squarespace file store',
        '/s/* /assets/files/:splat 301',
    ]
    (ROOT / '_redirects').write_text('\n'.join(lines) + '\n')
    print(f'redirects: {len(lines)} lines')


def main():
    build_posts()
    build_blog_index()
    build_legacy_pages()
    build_collections()
    build_about()
    build_site_index()
    build_404()
    build_feed()
    build_sitemap()
    build_redirects()
    report = {k: v[:3] for k, v in sorted(UNMAPPED_LINKS.items())}
    (ROOT / 'migration' / 'link-report.json').write_text(json.dumps(report, indent=1))
    print(f'unmapped internal links: {len(UNMAPPED_LINKS)} (see migration/link-report.json)')


if __name__ == '__main__':
    main()
