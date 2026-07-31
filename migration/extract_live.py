#!/usr/bin/env python3
"""Extract main content from scraped live Squarespace pages (7.0 templates).

Produces migration/live-extracted.json: {name: {"title":…, "html":…}}
Strategy: take <section id="page">, unwrap video blocks (data-html), promote
data-src/noscript images, then keep the sqs-block-content fragments in order.
"""
import html as htmllib
import json
import re
from html.parser import HTMLParser
from pathlib import Path

HERE = Path(__file__).parent
PAGES = ['video', 'fobissea']


def region_of(html):
    m = re.search(r'<section id="page"[^>]*>(.*)</section>', html, re.S)
    return m.group(1) if m else ''


class BlockCollector(HTMLParser):
    """Collect inner HTML of every div.sqs-block-content, in document order."""

    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.blocks = []
        self.depth = 0        # nesting inside a capturing block
        self.buf = []

    def handle_starttag(self, tag, attrs):
        cls = dict(attrs).get('class', '') or ''
        if self.depth:
            self.buf.append(self.get_starttag_text())
            if tag == 'div':
                self.depth += 1
        elif tag == 'div' and 'sqs-block-content' in cls:
            self.depth = 1

    def handle_startendtag(self, tag, attrs):
        if self.depth:
            self.buf.append(self.get_starttag_text())

    def handle_endtag(self, tag):
        if not self.depth:
            return
        if tag == 'div':
            self.depth -= 1
            if self.depth == 0:
                self.blocks.append(''.join(self.buf).strip())
                self.buf = []
                return
        self.buf.append(f'</{tag}>')

    def handle_data(self, data):
        if self.depth:
            self.buf.append(data)

    def handle_entityref(self, name):
        if self.depth:
            self.buf.append(f'&{name};')

    def handle_charref(self, name):
        if self.depth:
            self.buf.append(f'&#{name};')


def promote_lazy_images(fragment):
    def fix(m):
        tag = m.group(0)
        if 'src=' not in tag.replace('data-src=', ''):
            ds = re.search(r'''data-src=["']([^"']+)["']''', tag)
            if ds:
                tag = tag[:-1].rstrip('/') + f' src="{ds.group(1)}">'
        return tag
    fragment = re.sub(r'<img\b[^>]*>', fix, fragment)
    fragment = re.sub(r'</?noscript>', '', fragment)
    return fragment


def unwrap_videos(html):
    def fix(m):
        return htmllib.unescape(m.group(1))
    return re.sub(r'<div[^>]+class="[^"]*sqs-video-wrapper[^"]*"[^>]+data-html="([^"]*)"[^>]*>',
                  fix, html)


def main():
    out = {}
    for name in PAGES:
        html = (HERE / 'live-pages' / f'{name}.html').read_text(errors='replace')
        title = re.search(r'<title>(.*?)</title>', html, re.S)
        title = htmllib.unescape(title.group(1)).split('—')[0].strip() if title else name
        region = unwrap_videos(region_of(html))
        col = BlockCollector()
        col.feed(region)
        blocks = [promote_lazy_images(b) for b in col.blocks if b and len(b) > 5]
        out[name] = {'title': title, 'html': '\n\n'.join(blocks)}
        print(f'{name}: title={title!r} blocks={len(col.blocks)} chars={len(out[name]["html"])}')
    (HERE / 'live-extracted.json').write_text(json.dumps(out, indent=1, ensure_ascii=False))


if __name__ == '__main__':
    main()
