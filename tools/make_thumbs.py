#!/usr/bin/env python3
"""
画信缩略图：images/YYYYMMDD.webp → images/thumbs/YYYYMMDD.webp

画历的圆窗、看画的胶卷条、"这个月的特别日子"只显示几十像素的小图，
用原图（平均 270KB）一个月就是六七 MB。缩略图短边 320px（三倍屏上 100px 的圆窗也够清楚），
每张二三十 KB。

前端找不到缩略图时会自动退回原图（见 js/script.js 的 thumbSrc），所以新画没补缩略图也不会坏，
只是那几张多花一点流量。补齐：

    python3 tools/make_thumbs.py            # 只补缺的、以及原图比缩略图新的
    python3 tools/make_thumbs.py --force    # 全部重做
"""

import argparse
import re
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'images'
OUT = SRC / 'thumbs'
SHORT_SIDE = 320
QUALITY = 74
NAME = re.compile(r'^\d{8}\.webp$')


def make(src: Path, dst: Path) -> int:
    with Image.open(src) as im:
        im = im.convert('RGB')
        w, h = im.size
        scale = SHORT_SIDE / min(w, h)
        if scale < 1:
            im = im.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
        im.save(dst, 'WEBP', quality=QUALITY, method=6)
    return dst.stat().st_size


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--force', action='store_true', help='全部重做')
    args = parser.parse_args()

    OUT.mkdir(exist_ok=True)
    made = 0
    total = 0
    for src in sorted(SRC.iterdir()):
        if not NAME.match(src.name):
            continue
        dst = OUT / src.name
        if not args.force and dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime:
            continue
        total += make(src, dst)
        made += 1
    if made:
        print(f'缩略图 {made} 张，共 {total / 1024:.0f} KB（平均 {total / made / 1024:.1f} KB）')
    else:
        print('缩略图已是最新')
    return 0


if __name__ == '__main__':
    sys.exit(main())
