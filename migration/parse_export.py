#!/usr/bin/env python3
"""Parse the Squarespace WordPress-format export into migration/content.json.

Usage: python3 migration/parse_export.py /path/to/Squarespace-Wordpress-Export.xml
"""
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import urlparse

NS = {
    'wp': 'http://wordpress.org/export/1.2/',
    'content': 'http://purl.org/rss/1.0/modules/content/',
    'excerpt': 'http://wordpress.org/export/1.2/excerpt/',
}

OUT = Path(__file__).parent / 'content.json'


def text(item, tag, ns=None):
    return (item.findtext(tag, namespaces=NS) if ns is None else item.findtext(tag, namespaces=NS)) or ''


def parse(xml_path):
    tree = ET.parse(xml_path)
    posts, pages, attachments = [], [], []
    for item in tree.getroot().iter('item'):
        ptype = item.findtext('wp:post_type', namespaces=NS)
        link = (item.findtext('link') or '').strip()
        path_old = urlparse(link).path
        cats = [c.text for c in item.findall('category') if c.get('domain') == 'category' and c.text]
        tags = [c.text for c in item.findall('category') if c.get('domain') == 'post_tag' and c.text]
        row = {
            'id': item.findtext('wp:post_id', namespaces=NS),
            'title': (item.findtext('title') or '').strip(),
            'link': link,
            'path_old': path_old,
            'slug': item.findtext('wp:post_name', namespaces=NS) or '',
            'status': item.findtext('wp:status', namespaces=NS),
            'date': item.findtext('wp:post_date', namespaces=NS),
            'categories': cats,
            'tags': tags,
            'body': item.findtext('content:encoded', namespaces=NS) or '',
            'excerpt': item.findtext('excerpt:encoded', namespaces=NS) or '',
        }
        if ptype == 'post':
            # collection = first path segment of the old URL (blog, newsletter, ...)
            m = re.match(r'^/([^/]+)/', path_old)
            row['collection'] = m.group(1) if m else 'blog'
            posts.append(row)
        elif ptype == 'page':
            pages.append(row)
        elif ptype == 'attachment':
            row['attachment_url'] = item.findtext('wp:attachment_url', namespaces=NS) or ''
            attachments.append(row)

    posts.sort(key=lambda r: r['date'] or '')
    data = {'posts': posts, 'pages': pages, 'attachments': attachments}
    OUT.write_text(json.dumps(data, indent=1, ensure_ascii=False))

    dup = {}
    for p in pages:
        dup.setdefault(p['path_old'], []).append(p)
    dups = {k: [(x['id'], len(x['body'])) for x in v] for k, v in dup.items() if len(v) > 1}
    print(f"posts={len(posts)} (pub={sum(1 for p in posts if p['status']=='publish')}), "
          f"pages={len(pages)}, attachments={len(attachments)}")
    print("duplicate page paths:", json.dumps(dups, indent=1))
    colls = {}
    for p in posts:
        colls[p['collection']] = colls.get(p['collection'], 0) + 1
    print("post collections:", colls)


if __name__ == '__main__':
    parse(sys.argv[1])
