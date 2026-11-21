"""把 data.json 转成原型用的 _data.js（file:// 下也能直接打开，不需要 fetch）。

每封记：日期、那句话、图片相对路径、缩略图、宽高比、平均色、三个主色。
用法：python3 design/app/tools/build_data.py
"""
import json, re
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'design/app/design-demos/_data.js'
REL = '../../../'  # 从 design/app/design-demos/ 回到仓库根


def line_of(text):
    t = (text or '').split('\n')[0]
    t = re.sub(r'^[\s♥️❤️]*(今日份爱你)?\s*', '', t).strip().lstrip('，,。 ')
    if not re.search(r'[\w\u4e00-\u9fff]', t):
        return ''  # 只剩表情
    return t if len(t) <= 32 else ''  # 早期几封存的是生图提示词，不是那句话


def hexc(rgb):
    return '#%02x%02x%02x' % tuple(rgb)


entries = []
for e in json.load(open(ROOT / 'data.json', encoding='utf-8')):
    src = ROOT / 'images' / e['filename']
    thumb = ROOT / 'images/thumbs' / (e['id'] + '.webp')
    im = Image.open(thumb if thumb.exists() else src).convert('RGB')
    w, h = Image.open(src).size
    avg = im.resize((1, 1), Image.LANCZOS).getpixel((0, 0))
    pal = im.resize((64, 64)).quantize(colors=4, method=Image.Quantize.MEDIANCUT)
    cols = sorted(pal.getcolors(), reverse=True)
    raw = pal.getpalette()
    palette = [hexc(raw[i * 3:i * 3 + 3]) for _, i in cols[:4]]
    entries.append({
        'id': e['id'], 'date': e['date'], 'line': line_of(e.get('loveLetter')),
        'img': REL + 'images/' + e['filename'],
        'thumb': REL + ('images/thumbs/' + e['id'] + '.webp' if thumb.exists() else 'images/' + e['filename']),
        'ratio': round(w / h, 3), 'color': hexc(avg), 'palette': palette,
    })

OUT.write_text('window.LM_DATA = ' + json.dumps(entries, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
print(OUT, len(entries))
