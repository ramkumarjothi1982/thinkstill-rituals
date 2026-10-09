"""Write the dev harness pages for the two consoles from the game folders.

games/dev/reset.html and games/dev/reframe.html load the shared engine, the kit, the mode's analysis, every game file
in games/games-<mode>/ (in file-name order, e.g. 001-loop-rodeo.js), then the console. Open them from a local server:
  python3 -m http.server 8000   then   http://127.0.0.1:8000/games/dev/reset.html
Direct launch for testing: ?game=<id>&text=...&before=7&theme=dark|bright&tsgdev=1
"""
import os, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SHARED = ['shared/ts-core.js', 'shared/ts-audio.js', 'shared/ts-ai.js', 'shared/ts-safety.js', 'shared/ts-ui.js', 'kit/kit.js']
CSS = ['shared/ts-ui.css', 'kit/kit.css', 'arcade/arcade.css']


def game_files(mode):
    d = os.path.join(ROOT, 'games-' + mode)
    if not os.path.isdir(d):
        return []
    return sorted(f for f in os.listdir(d) if f.endswith('.js'))


def page(mode, files=None, prefix='../'):
    title = 'Reset Console (dev)' if mode == 'reset' else 'Reframe Console (dev)'
    files = game_files(mode) if files is None else files
    lines = ['<!doctype html>', '<html lang="en-AU">', '<head>', '<meta charset="utf-8">',
             '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">', f'<title>{title}</title>']
    lines += [f'<link rel="stylesheet" href="{prefix}{c}">' for c in CSS]
    lines += ['<style>html,body{height:100%;margin:0;background:#070b1a}#app{position:fixed;inset:0}</style>', '</head>', '<body>', '<div id="app"></div>',
              '<script>window.TSG_ENV = { root: document.getElementById("app"), mode: "' + mode + '", assetBase: "/bubble-expressions/", opts: { mode: "' + mode + '" } };</script>']
    lines += [f'<script src="{prefix}{s}"></script>' for s in SHARED]
    lines.append(f'<script src="{prefix}arcade/analysis-{mode}.js"></script>')
    lines += [f'<script src="{prefix}games-{mode}/{f}"></script>' for f in files]
    lines += [f'<script src="{prefix}arcade/arcade.js"></script>', '</body>', '</html>', '']
    return '\n'.join(lines)


def main():
    os.makedirs(os.path.join(ROOT, 'dev'), exist_ok=True)
    for mode in ('reset', 'reframe'):
        with open(os.path.join(ROOT, 'dev', mode + '.html'), 'w', encoding='utf-8') as f:
            f.write(page(mode))
        print(mode, len(game_files(mode)), 'games')


if __name__ == '__main__':
    sys.exit(main())
