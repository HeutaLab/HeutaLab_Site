#!/usr/bin/env python3
"""Shared loading + HTML cleaning for the EdTech Lounge -> HeutaLab migration."""
import html as htmllib
import json
import re
from pathlib import Path
from urllib.parse import urlparse, unquote

ROOT = Path(__file__).resolve().parent.parent
CONTENT = json.loads((ROOT / 'migration' / 'content.json').read_text())
ASSET_MAP = json.loads((ROOT / 'migration' / 'asset-map.json').read_text())

SQS_HOSTS = (
    'images.squarespace-cdn.com', 'static.squarespace.com', 'static1.squarespace.com',
    'glenn-malcolm-jrft.squarespace.com', 'edtechlounge.squarespace.com',
)
INTERNAL_HOSTS = (
    'edtechlounge.com', 'www.edtechlounge.com',
    'glenn-malcolm-jrft.squarespace.com', 'edtechlounge.squarespace.com',
)

def _dedupe_posts():
    """Squarespace exported cross-posted entries once per collection.

    Group by wp:post_name (date-path identity); prefer the /blog copy as
    canonical unless another copy is substantially longer. Returns the list of
    unique published posts, each with clean `slug`, `collections`, `aliases`.
    """
    groups = {}
    for p in CONTENT['posts']:
        if p['status'] != 'publish':
            continue
        groups.setdefault(p['slug'], []).append(p)

    unique = []
    for ident, copies in groups.items():
        blog = [c for c in copies if c['collection'] == 'blog']
        canon = blog[0] if blog else copies[0]
        longest = max(copies, key=lambda c: len(c['body']))
        if len(longest['body']) > len(canon['body']) * 1.2:
            canon = longest
        canon = dict(canon)
        canon['collections'] = sorted({c['collection'] for c in copies})
        aliases = set()
        for c in copies:
            aliases.add(c['path_old'])
            if c['path_old'].endswith('.html'):
                aliases.add(c['path_old'][:-5])
        canon['aliases'] = sorted(aliases)
        base = ident.rsplit('/', 1)[-1].removesuffix('.html')
        canon['slug'] = base
        unique.append(canon)

    unique.sort(key=lambda p: p['date'])
    seen = {}
    for p in unique:
        if p['slug'] in seen:
            p['slug'] = f"{p['slug']}-{p['date'][:4]}"
        seen[p['slug']] = p
    return unique


PUBLISHED = _dedupe_posts()

# ---- new URL scheme -------------------------------------------------------
def post_new_path(post):
    return f"/blog/{post['slug']}/"

# old exact path -> new path (posts, all alias copies)
OLD2NEW = {}
for p in PUBLISHED:
    for a in p['aliases']:
        OLD2NEW[a] = post_new_path(p)

SPECIAL_REDIRECTS = {
    '/cover': '/about/', '/work': '/', '/programming': '/blog/',
    '/graphic-animation': '/blog/', '/ict-and-gaming-programming': '/blog/',
    '/welcome': '/', '/oops-can-you-type-or-have-we-done-something-wrong': '/',
    '/video': '/spreadsheet-videos/', '/fobissea': '/fobgames2012/',
    # page-style aliases of posts, seen in old internal links
    '/ipad-set-up-guide-for-multiple-devices': '/blog/ipad-set-up-guide-for-multiple-devices/',
    '/literacy-in-ict/2010/10/6/collaborative-writing-online-and-creating-stories-with-story.html':
        '/blog/collaborative-writing-and-creating-stories-with-storybird/',
}

def dedupe_pages():
    """Squarespace exported 5 pages twice; keep the longer body."""
    by_path = {}
    for pg in CONTENT['pages']:
        cur = by_path.get(pg['path_old'])
        if cur is None or len(pg['body']) > len(cur['body']):
            by_path[pg['path_old']] = pg
    by_path.pop('/welcome', None)          # empty placeholder page
    by_path.pop('/oops-can-you-type-or-have-we-done-something-wrong', None)
    return by_path

PAGES = dedupe_pages()
for path in PAGES:
    OLD2NEW[path] = path.rstrip('/') + '/'

UNMAPPED_LINKS = {}

# ---- cleaning pipeline ----------------------------------------------------
CAPTION_RE = re.compile(r'\[caption[^\]]*\](.*?)\[/caption\]', re.S)
SCRIPT_RE = re.compile(r'<script\b[^>]*>.*?</script\s*>|<script\b[^>]*/\s*>', re.S | re.I)
OBJECT_RE = re.compile(r'<object\b.*?</object\s*>', re.S | re.I)
EMBED_RE = re.compile(r'<embed\b[^>]*>(?:\s*</embed\s*>)?', re.S | re.I)
IFRAME_RE = re.compile(r'<iframe\b[^>]*>\s*(?:</iframe\s*>)?', re.S | re.I)
IMG_RE = re.compile(r'<img\b[^>]*>', re.I)
ATTR_RE = re.compile(r'''(src|href)\s*=\s*(["'])(.*?)\2''', re.I | re.S)


def norm_asset_key(url):
    u = urlparse(url.strip())
    return f'https://{u.netloc}{u.path}'


def is_sqs(url):
    try:
        host = urlparse(url).netloc.lower()
    except ValueError:
        return False
    return any(host == h or host.endswith('.' + h) for h in SQS_HOSTS)


def map_internal_path(path):
    """Map an old edtechlounge path to its new location, or None."""
    path = path.split('#')[0].split('?')[0]
    if not path or path == '/':
        return '/'
    p = '/' + path.strip('/')
    for cand in (p, p + '.html', p.removesuffix('.html')):
        if cand in OLD2NEW:
            return OLD2NEW[cand]
    if p in SPECIAL_REDIRECTS:
        return SPECIAL_REDIRECTS[p]
    if re.match(r'^/(blog|[\w-]+)/(category|tag)/', p) or p.startswith('/category/') or p.startswith('/tag/'):
        return '/blog/'
    if p.startswith('/s/'):
        return '/assets/files/' + unquote(p[3:]).replace(' ', '-')
    if p in ('/blog', '/blog/'):
        return '/blog/'
    if p in ('/art-and-imaging', '/bee-bot-activity-center', '/newsletter'):
        return p + '/'
    return None


def rewrite_url(url, ctx):
    raw = url.strip()
    if not raw or raw.startswith(('#', 'mailto:', 'javascript:', 'data:')):
        return raw
    # protocol-less "www.example.com" hrefs (broken relative links since 2010):
    # bare, or already mangled into paths like /display/admin/www.example.com
    m = re.match(r'^(?:/[\w-]+/admin/)?(www\.[\w.-]+(?:/.*)?)$', raw)
    if m:
        return 'https://' + m.group(1)
    # squarespace-hosted asset?
    if is_sqs(raw):
        key = norm_asset_key(raw)
        if key in ASSET_MAP:
            return '/' + ASSET_MAP[key]
        # internal squarespace-domain page link (not an asset we hold)
        host = urlparse(raw).netloc.lower()
        if host in ('glenn-malcolm-jrft.squarespace.com', 'edtechlounge.squarespace.com'):
            new = map_internal_path(urlparse(raw).path)
            if new:
                return new
        UNMAPPED_LINKS.setdefault(raw, []).append(ctx)
        return raw
    # absolute link to the old domain
    try:
        host = urlparse(raw).netloc.lower()
    except ValueError:
        return raw
    if host in INTERNAL_HOSTS:
        new = map_internal_path(urlparse(raw).path)
        if new:
            return new
        UNMAPPED_LINKS.setdefault(raw, []).append(ctx)
        return urlparse(raw).path or '/'
    # site-relative link
    if raw.startswith('/'):
        new = map_internal_path(raw)
        if new:
            return new
        if not raw.startswith('/assets/'):
            UNMAPPED_LINKS.setdefault(raw, []).append(ctx)
        return raw
    return raw


def _caption_to_figure(m):
    inner = m.group(1)
    img = IMG_RE.search(inner)
    if not img:
        return inner
    cap = IMG_RE.sub('', inner)
    cap = re.sub(r'\s+', ' ', cap).strip()
    fig = '<figure class="fig">' + img.group(0)
    if cap:
        fig += f'<figcaption>{cap}</figcaption>'
    return fig + '</figure>'


def _object_repl(m):
    """Old <object> embeds: resurrect YouTube ones as iframes, note the rest."""
    block = m.group(0)
    yt = re.search(r'youtube(?:-nocookie)?\.com/v/([A-Za-z0-9_-]{6,})', block)
    if yt:
        return (f'<div class="embed"><iframe src="https://www.youtube.com/embed/{yt.group(1)}" '
                'title="YouTube video" allowfullscreen loading="lazy"></iframe></div>')
    vm = re.search(r'vimeo\.com/(?:moogaloop\.swf\?clip_id=)?(\d+)', block)
    if vm:
        return (f'<div class="embed"><iframe src="https://player.vimeo.com/video/{vm.group(1)}" '
                'title="Vimeo video" allowfullscreen loading="lazy"></iframe></div>')
    urls = re.findall(r'''(?:src|value|data)=["']([^"']+\.swf[^"']*)["']''', block, re.I)
    src = urls[0] if urls else None
    note = ('<div class="flash-note">This post originally embedded Adobe Flash content here, '
            'which modern browsers no longer support.')
    if src and is_sqs(src) and norm_asset_key(src) in ASSET_MAP:
        note += f' The original file is archived: <a href="/{ASSET_MAP[norm_asset_key(src)]}">download .swf</a>.'
    note += '</div>'
    return note


def _fix_iframe(m):
    tag = m.group(0)
    tag = tag.replace('src="//', 'src="https://').replace("src='//", "src='https://")
    tag = re.sub(r'''src=(["'])http://''', r'src=\1https://', tag)
    tag = re.sub(r'''src=(["'])https://(?:www\.)?youtube\.com/v/([A-Za-z0-9_-]+)[^"']*''',
                 r'src=\1https://www.youtube.com/embed/\2', tag)
    if not tag.rstrip().endswith('</iframe>'):
        tag = tag + '</iframe>'
    return f'<div class="embed">{tag}</div>'


def _fix_img(m, ctx):
    tag = m.group(0)
    src = ATTR_RE.search(tag)
    # images that were already dead on the live site: neat placeholder
    if src and is_sqs(src.group(3)) and norm_asset_key(src.group(3)) not in ASSET_MAP:
        return ('<span class="img-missing">This image was already missing from the '
                'original site before migration.</span>')
    def sub_attr(am):
        return f'{am.group(1)}={am.group(2)}{rewrite_url(am.group(3), ctx)}{am.group(2)}'
    tag = ATTR_RE.sub(sub_attr, tag)
    if 'loading=' not in tag:
        tag = tag[:-1].rstrip('/').rstrip() + ' loading="lazy">'
    return tag


def clean_html(body, ctx=''):
    out = body
    out = CAPTION_RE.sub(_caption_to_figure, out)
    out = SCRIPT_RE.sub('', out)
    out = OBJECT_RE.sub(_object_repl, out)
    out = EMBED_RE.sub('', out)
    out = IFRAME_RE.sub(_fix_iframe, out)
    out = IMG_RE.sub(lambda m: _fix_img(m, ctx), out)

    # rewrite remaining hrefs (anchors) outside imgs
    def sub_href(m):
        if m.group(1).lower() == 'href':
            return f'href={m.group(2)}{rewrite_url(m.group(3), ctx)}{m.group(2)}'
        return m.group(0)
    out = ATTR_RE.sub(sub_href, out)
    out = re.sub(r'\n{3,}', '\n\n', out)
    return out.strip()


def text_of(html_str, limit=None):
    t = re.sub(r'<[^>]+>', ' ', html_str)
    t = htmllib.unescape(t)
    t = re.sub(r'\s+', ' ', t).strip()
    return t[:limit] if limit else t


def excerpt_of(item, limit=180):
    src = item.get('excerpt') or item['body']
    t = text_of(src)
    if len(t) <= limit:
        return t
    cut = t[:limit].rsplit(' ', 1)[0]
    return cut + '…'
