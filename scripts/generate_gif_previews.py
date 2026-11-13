"""Render Desk Break exercise animations to local GIF previews.

This utility uses only local project files, a local HTTP server, Chromium, and Pillow.
It makes no AI, cloud, or external API calls.
"""
from __future__ import annotations

import argparse
import asyncio
import contextlib
import json
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from io import BytesIO
from pathlib import Path
from urllib.parse import quote

from PIL import Image
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "assets" / "desk-break"
OUTPUT = ROOT / "public" / "previews"


class QuietStaticHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, format, *args):
        pass


def local_server() -> tuple[ThreadingHTTPServer, threading.Thread]:
    server = ThreadingHTTPServer(("127.0.0.1", 0), QuietStaticHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, thread


def write_manifest(ids: set[str]) -> None:
    (OUTPUT / "manifest.json").write_text(json.dumps(sorted(ids), indent=2) + "\n", encoding="utf-8")


async def generate(args: argparse.Namespace) -> int:
    library = json.loads((ASSETS / "exercises.json").read_text(encoding="utf-8"))
    exercises = library["exercises"]
    if args.category:
        exercises = [exercise for exercise in exercises if exercise["category"] == args.category]
    if args.limit:
        exercises = exercises[:args.limit]
    if not exercises:
        raise SystemExit("No exercises matched the requested selection.")

    OUTPUT.mkdir(parents=True, exist_ok=True)
    generated = {path.stem for path in OUTPUT.glob("*.gif")}
    server, _ = local_server()
    port = server.server_address[1]
    failures: list[str] = []
    try:
        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch()
            page = await browser.new_page(viewport={"width": args.width, "height": args.height}, device_scale_factor=1)
            for index, exercise in enumerate(exercises, start=1):
                exercise_id = exercise["id"]
                destination = OUTPUT / f"{exercise_id}.gif"
                if destination.exists() and not args.force:
                    print(f"[{index}/{len(exercises)}] skip {exercise_id}")
                    continue
                try:
                    url = f"http://127.0.0.1:{port}/scripts/gif_renderer.html?id={quote(exercise_id)}&w={args.width}&h={args.height}"
                    await page.goto(url, wait_until="networkidle")
                    await page.wait_for_function("window.__gifPreviewReady === true", timeout=30_000)
                    duration = await page.evaluate("window.__gifDuration")
                    frames: list[Image.Image] = []
                    for frame in range(args.frames):
                        seconds = duration * frame / args.frames
                        await page.evaluate("seconds => window.__renderGifFrame(seconds)", seconds)
                        png = await page.screenshot(type="png")
                        with Image.open(BytesIO(png)) as image:
                            frames.append(image.convert("RGB").convert("P", palette=Image.Palette.ADAPTIVE, colors=args.colors))
                    frames[0].save(destination, save_all=True, append_images=frames[1:], duration=round(1000 / args.fps), loop=0, optimize=True, disposal=2)
                    generated.add(exercise_id); write_manifest(generated)
                    print(f"[{index}/{len(exercises)}] wrote {destination.name}")
                except Exception as error:
                    failures.append(exercise_id); print(f"[{index}/{len(exercises)}] FAILED {exercise_id}: {error}")
            await browser.close()
    finally:
        server.shutdown(); server.server_close()
    print(f"Finished: {len(generated)} GIFs available; {len(failures)} failures.")
    return 1 if failures else 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate local animated Desk Break GIF previews.")
    parser.add_argument("--category", help="Desk Break category ID, such as yoga or chair.")
    parser.add_argument("--limit", type=int, help="Generate only the first N matching previews.")
    parser.add_argument("--force", action="store_true", help="Overwrite GIFs that already exist.")
    parser.add_argument("--width", type=int, default=360)
    parser.add_argument("--height", type=int, default=300)
    parser.add_argument("--colors", type=int, default=256, choices=range(2, 257))
    parser.add_argument("--fps", type=int, default=12)
    parser.add_argument("--frames", type=int, default=24)
    return parser.parse_args()


if __name__ == "__main__":
    with contextlib.suppress(KeyboardInterrupt):
        raise SystemExit(asyncio.run(generate(parse_args())))
