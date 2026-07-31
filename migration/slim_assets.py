#!/usr/bin/env python3
"""Slim assets/legacy: dedupe identical files, re-fetch big images at 1500w,
and quarantine files over the Workers 25MiB per-file limit.
Updates migration/asset-map.json in place; writes migration/oversize.json.
"""
import hashlib
import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEST = ROOT / 'assets' / 'legacy'
MAP_PATH = ROOT / 'migration' / 'asset-map.json'
OVERSIZE_DIR = Path('/Users/glenn/Edtechlounge_Export/oversize')
LIMIT = 25 * 1024 * 1024
IMG_EXT = {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.jpe'}
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'

mapping = json.loads(MAP_PATH.read_text())

# 1) dedupe identical content
by_hash = {}
rewrites = {}
for url, rel in sorted(mapping.items()):
    f = ROOT / rel
    if not f.exists():
        continue
    h = hashlib.sha256(f.read_bytes()).hexdigest()
    if h in by_hash:
        keep = by_hash[h]
        if rel != keep:
            rewrites[rel] = keep
    else:
        by_hash[h] = rel
removed = 0
for url, rel in list(mapping.items()):
    if rel in rewrites:
        mapping[url] = rewrites[rel]
for rel in set(rewrites):
    (ROOT / rel).unlink(missing_ok=True)
    removed += 1
print(f'dedupe: removed {removed} duplicate files')

# 2) re-fetch large images at 1500w (CDN-resized)
big_imgs = []
for url, rel in mapping.items():
    f = ROOT / rel
    if f.suffix.lower() in IMG_EXT and f.exists() and f.stat().st_size > 400_000 \
            and 'images.squarespace-cdn.com' in url:
        big_imgs.append((url, f))
big_imgs = list({f: (u, f) for u, f in big_imgs}.values())
print(f'{len(big_imgs)} large images to re-fetch at 1500w')
saved = 0
for i, (url, f) in enumerate(big_imgs, 1):
    try:
        req = urllib.request.Request(url + '?format=1500w', headers={'User-Agent': UA})
        with urllib.request.urlopen(req, timeout=30) as r:
            blob = r.read()
        if blob and len(blob) < f.stat().st_size:
            saved += f.stat().st_size - len(blob)
            f.write_bytes(blob)
    except Exception as e:  # noqa: BLE001
        print(f'  keep original ({e}): {f.name}')
    if i % 40 == 0:
        print(f'  {i}/{len(big_imgs)}, saved {saved/1e6:.0f}MB', flush=True)
print(f'resize: saved {saved/1e6:.0f}MB')

# 3) quarantine >25MiB files (Workers per-file limit)
OVERSIZE_DIR.mkdir(parents=True, exist_ok=True)
oversize = {}
for url, rel in list(mapping.items()):
    f = ROOT / rel
    if f.exists() and f.stat().st_size > LIMIT:
        target = OVERSIZE_DIR / f.name
        if not target.exists():
            f.rename(target)
        else:
            f.unlink()
        oversize[url] = str(target)
        del mapping[url]
for url, path in oversize.items():
    print(f'oversize (archived, not deployed): {url} -> {path}')
(ROOT / 'migration' / 'oversize.json').write_text(json.dumps(oversize, indent=1))

MAP_PATH.write_text(json.dumps(mapping, indent=1))
total = sum(f.stat().st_size for f in DEST.iterdir() if f.is_file())
print(f'final: {len(list(DEST.iterdir()))} files, {total/1e6:.0f}MB')
