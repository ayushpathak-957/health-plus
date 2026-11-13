"""Reusable local avatar GIF pipeline. No cloud, AI, or external API requests."""
import argparse
import asyncio
import base64
import json
import sys
import time
from io import BytesIO
from PIL import Image
from playwright.async_api import async_playwright
from generate_gif_previews import ROOT, ASSETS, local_server

async def run(args):
    exercises = json.loads((ASSETS / 'exercises.json').read_text(encoding='utf-8'))['exercises']
    if args.category:
        exercises = [ex for ex in exercises if ex['category'] == args.category]
    if args.ids:
        exercises = [ex for ex in exercises if ex['id'] in args.ids.split(',')]
    if args.limit:
        exercises = exercises[:args.limit]
    if not exercises:
        raise ValueError('No matching exercises')
    server, _ = local_server()
    failures = []
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(args=['--use-angle=d3d11'] if sys.platform == 'win32' and not args.software else [])
            for avatar in ([args.avatar] if args.avatar else ['man-athletic', 'woman-casual', 'wood']):
                output = ROOT / 'public' / 'previews' if avatar == 'wood' else ROOT / 'public' / 'previews' / avatar
                output.mkdir(parents=True, exist_ok=True)
                valid = set()
                for path in output.glob('*.gif'):
                    try:
                        with Image.open(path) as im:
                            im.seek(im.n_frames-1); im.load()
                        valid.add(path.stem)
                    except Exception:
                        pass
                def manifest():
                    temp = output / 'manifest.tmp'
                    temp.write_text(json.dumps(sorted(valid)), encoding='utf-8')
                    for attempt in range(8):
                        try:
                            temp.replace(output / 'manifest.json')
                            return
                        except PermissionError:
                            if attempt == 7: raise
                            time.sleep(.15 * (attempt + 1))
                manifest()
                generated = skipped = 0
                page = await browser.new_page(viewport={'width':args.width,'height':args.height})
                # Only the loopback asset server is permitted during rendering.
                await page.route('**/*', lambda route: route.continue_() if route.request.url.startswith(f'http://127.0.0.1:{server.server_port}/') else route.abort())
                await page.goto(f'http://127.0.0.1:{server.server_port}/scripts/avatar_renderer.html?avatar={avatar}&w={args.width}&h={args.height}')
                await page.wait_for_function('window.__gifPreviewReady || window.__gifError', timeout=120000)
                error = await page.evaluate('window.__gifError')
                if error: raise RuntimeError(error)
                for index, ex in enumerate(exercises, 1):
                    if ex['id'] in valid and not args.force:
                        skipped += 1
                        continue
                    try:
                        meta = await page.evaluate('id => window.__setExercise(id)', ex['id'])
                        frames = []
                        times = [meta['duration'] * frame / (23 if meta['once'] else 24) for frame in range(24)]
                        pngs = await page.evaluate('times => times.map(t => window.__renderAvatarFrame(t))', times)
                        for png in pngs:
                            with Image.open(BytesIO(base64.b64decode(png))) as im:
                                frames.append(im.convert('RGB').convert('P', palette=Image.Palette.ADAPTIVE, colors=args.colors))
                        durations = [max(20, round(meta['duration'] * 1000 / 24 / 10)*10)] * 24
                        if meta['once']: durations[-1] += 2000
                        temp = output / (ex['id'] + '.tmp')
                        frames[0].save(temp, format='GIF', save_all=True, append_images=frames[1:], duration=durations, loop=0, disposal=2)
                        temp.replace(output / (ex['id']+'.gif'));valid.add(ex['id']);manifest()
                        generated += 1
                        print(f'{avatar} [{index}/{len(exercises)}] {ex["id"]}',flush=True)
                    except Exception as error:
                        failures.append((avatar,ex['id'],str(error)));print(f'FAILED {failures[-1]}',flush=True)
                await page.close()
                print(f'{avatar}: generated {generated}, reused {skipped}, available {len(valid)}.',flush=True)
            await browser.close()
    finally:
        server.shutdown();server.server_close()
    print(f'Finished. Failures: {failures}',flush=True)
    return bool(failures)

if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--avatar',choices=['man-athletic','woman-casual','wood'])
    parser.add_argument('--category')
    parser.add_argument('--ids', help='Comma-separated exercise IDs for targeted previews')
    parser.add_argument('--limit',type=int)
    parser.add_argument('--width', type=int, default=360)
    parser.add_argument('--height', type=int, default=300)
    parser.add_argument('--colors', type=int, default=256, choices=range(2, 257))
    parser.add_argument('--force',action='store_true')
    parser.add_argument('--software',action='store_true',help='Use the browser default renderer instead of Direct3D on Windows')
    raise SystemExit(asyncio.run(run(parser.parse_args())))
