"""Build single-file distributables for each ThinkStill game.

For every game folder it inlines the shared CSS/JS and the game scripts, and embeds the
bubble-expression images it references as resized WebP data URIs (the originals in
/bubble-expressions are never modified or duplicated in the repo).

Outputs:
  games/dist/<game>.html            full HTML document: host anywhere, embed in Framer
  games/dist/artifact/<game>.html   page content only, for publishing as a claude.ai artifact

Usage: python3 games/tools/build.py
"""
import base64, io, os, re, sys
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
GAMES = os.path.join(ROOT, 'games')
DIST = os.path.join(GAMES, 'dist')
GAME_DIRS = ['loop-rodeo', 'case-file']
IMG_RE = re.compile(r"\.\./\.\./bubble-expressions/([a-z]+_E\d+)\.webp")
# hero characters get more pixels than the supporting cast
SIZES = {'loopie': 320, 'glitch': 300}
DEFAULT_SIZE = 200
_cache = {}


def data_uri(name):
    if name in _cache:
        return _cache[name]
    path = os.path.join(ROOT, 'bubble-expressions', name + '.webp')
    im = Image.open(path).convert('RGBA')
    size = SIZES.get(name.split('_')[0], DEFAULT_SIZE)
    im = im.resize((size, size), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=82, method=6)
    uri = 'data:image/webp;base64,' + base64.b64encode(buf.getvalue()).decode('ascii')
    _cache[name] = uri
    return uri


def inline(game):
    gdir = os.path.join(GAMES, game)
    html = open(os.path.join(gdir, 'index.html'), encoding='utf-8').read()

    def css(m):
        href = m.group(1)
        if href.startswith('http'):
            return m.group(0)
        return '<style>\n' + open(os.path.normpath(os.path.join(gdir, href)), encoding='utf-8').read() + '\n</style>'

    def js(m):
        src = m.group(1)
        code = open(os.path.normpath(os.path.join(gdir, src)), encoding='utf-8').read()
        code = code.replace('</script', '<\\/script')
        return '<script>\n/* ' + os.path.basename(src) + ' */\n' + code + '\n</script>'

    html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', css, html)
    html = re.sub(r'<script src="([^"]+)"></script>', js, html)
    names = sorted(set(IMG_RE.findall(html)))
    for n in names:
        html = html.replace('../../bubble-expressions/' + n + '.webp', data_uri(n))
    return html, names


def full_document(content, lang='en-AU'):
    # Everything before the app root is head material (metas, title, font links, styles).
    i = content.find('<div class="app"')
    head, body = content[:i], content[i:]
    if '<meta charset' not in head:
        head = '<meta charset="utf-8">\n' + head
    return '<!doctype html>\n<html lang="' + lang + '">\n<head>\n' + head.strip() + '\n</head>\n<body>\n' + body.strip() + '\n</body>\n</html>\n'


def artifact_content(content):
    # The artifact skeleton supplies charset and viewport; the page starts with its <title>.
    content = re.sub(r'<meta charset="utf-8">\s*', '', content)
    content = re.sub(r'<meta name="viewport"[^>]*>\s*', '', content)
    return content.lstrip()


def main():
    os.makedirs(os.path.join(DIST, 'artifact'), exist_ok=True)
    for game in GAME_DIRS:
        content, names = inline(game)
        leftovers = re.findall(r'(?:src|href)="(?!https?:|data:|#)[^"]+"', content)
        if leftovers:
            print('WARNING unresolved local refs in', game, leftovers[:5])
        full = full_document(content)
        art = artifact_content(content)
        with open(os.path.join(DIST, game + '.html'), 'w', encoding='utf-8') as f:
            f.write(full)
        with open(os.path.join(DIST, 'artifact', game + '.html'), 'w', encoding='utf-8') as f:
            f.write(art)
        print(f'{game}: {len(names)} images, {len(full) / 1024:.0f} KB full, {len(art) / 1024:.0f} KB artifact')


if __name__ == '__main__':
    sys.exit(main())
