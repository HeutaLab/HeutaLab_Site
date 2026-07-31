#!/usr/bin/env python3
"""Download every Squarespace-hosted asset referenced by the exported content.

Reads migration/content.json (and optionally extra HTML files), collects URLs on
Squarespace hosts, downloads originals into assets/legacy/, and writes
migration/asset-map.json mapping "url base without query" -> local repo path.
Idempotent: already-downloaded files are skipped.
"""
import hashlib
import json
import re
import sys
import time
import urllib.request
import urllib.parse
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / 'migration' / 'content.json'
MAP_PATH = ROOT / 'migration' / 'asset-map.json'
FAIL_PATH = ROOT / 'migration' / 'asset-failures.json'
DEST = ROOT / 'assets' / 'legacy'

SQS_HOSTS = (
    'images.squarespace-cdn.com',
    'static.squarespace.com',
    'static1.squarespace.com',
    'glenn-malcolm-jrft.squarespace.com',
    'edtechlounge.squarespace.com',
)

URL_RE = re.compile(r'''(?:src|href)=["']([^"']+)["']''', re.I)
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'


def is_sqs(url):
    try:
        host = urllib.parse.urlparse(url).netloc.lower()
    except ValueError:
        return False
    return any(host == h or host.endswith('.' + h) for h in SQS_HOSTS)


def norm_base(url):
    """URL without query/fragment, https, used as the dedupe/mapping key."""
    u = urllib.parse.urlsplit(url.strip())
    return urllib.parse.urlunsplit(('https', u.netloc, u.path, '', ''))


def local_name(base):
    path = urllib.parse.urlsplit(base).path
    raw = path.rsplit('/', 1)[-1] or 'file'
    name = urllib.parse.unquote(raw).replace('+', ' ')
    name = re.sub(r'[^A-Za-z0-9._-]+', '-', name).strip('-') or 'file'
    if len(name) > 80:
        stem, dot, ext = name.rpartition('.')
        name = (stem[:70] if stem else name[:70]) + (dot + ext if dot else '')
    h = hashlib.sha1(base.encode()).hexdigest()[:8]
    return f'{h}-{name}'


def collect_urls():
    data = json.loads(CONTENT.read_text())
    urls = set()
    for kind in ('posts', 'pages'):
        for item in data[kind]:
            for m in URL_RE.finditer(item['body']):
                u = m.group(1)
                if is_sqs(u):
                    urls.add(u)
    for att in data['attachments']:
        if att.get('attachment_url') and is_sqs(att['attachment_url']):
            urls.add(att['attachment_url'])
    for extra in sys.argv[1:]:
        html = Path(extra).read_text(errors='replace')
        for m in URL_RE.finditer(html):
            if is_sqs(m.group(1)):
                urls.add(m.group(1))
    return urls


def fetch(base):
    name = local_name(base)
    dest = DEST / name
    if dest.exists() and dest.stat().st_size > 0:
        return base, name, 'cached'
    # images.squarespace-cdn supports format=original for the pristine upload
    candidates = [base + '?format=original', base]
    if 'images.squarespace-cdn.com' not in base:
        candidates = [base]
    last_err = None
    for url in candidates:
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=30) as r:
                blob = r.read()
            if not blob:
                raise IOError('empty response')
            dest.write_bytes(blob)
            return base, name, 'ok'
        except Exception as e:  # noqa: BLE001 - record and try next candidate
            last_err = str(e)
            time.sleep(0.3)
    return base, name, f'FAIL {last_err}'


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    bases = sorted({norm_base(u) for u in collect_urls()})
    print(f'{len(bases)} unique squarespace assets to fetch', flush=True)
    mapping, failures = {}, {}
    done = 0
    with ThreadPoolExecutor(max_workers=6) as ex:
        for base, name, status in ex.map(fetch, bases):
            done += 1
            if status.startswith('FAIL'):
                failures[base] = status
            else:
                mapping[base] = f'assets/legacy/{name}'
            if done % 50 == 0:
                print(f'  {done}/{len(bases)} ({len(failures)} failed)', flush=True)
    MAP_PATH.write_text(json.dumps(mapping, indent=1))
    FAIL_PATH.write_text(json.dumps(failures, indent=1))
    print(f'done: {len(mapping)} ok, {len(failures)} failed', flush=True)


if __name__ == '__main__':
    main()
