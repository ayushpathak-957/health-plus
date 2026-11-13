"""Browser smoke checks against a running local Health Plus dev server."""
import asyncio, sys
from pathlib import Path
from playwright.async_api import async_playwright, expect

async def main():
    url = sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:5178'
    output=Path(__file__).resolve().parents[1]/'.artifacts'/'avatars';output.mkdir(parents=True,exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=['--use-angle=d3d11'] if sys.platform=='win32' else [])
        page = await browser.new_page(viewport={'width':1365,'height':900})
        errors=[]
        page.on('pageerror', lambda error: (errors.append(str(error)), print(str(error),flush=True)))
        page.on('console', lambda msg: print(msg.text,flush=True) if msg.type=='error' else None)
        await page.goto(url)
        dropdown=page.get_by_role('combobox',name='Avatar',exact=True)
        await expect(dropdown).to_have_value('man-athletic')
        await expect(page.locator('.exercise-card')).to_have_count(435)
        await expect(page.locator('.exercise-card').first.locator('h3')).to_have_text('Jumping jacks (low impact)')
        await expect(page.locator('canvas')).to_have_count(0)
        for avatar in ['man-athletic','woman-casual','wood']:
            await dropdown.select_option(avatar)
            await page.wait_for_function("document.querySelector('.card-preview img')?.naturalWidth > 0")
            first=page.locator('.card-preview img').first
            expected='/previews/' + (avatar+'/' if avatar!='wood' else '')
            assert expected in await first.get_attribute('src')
            await page.locator('.exercise-card').first.click()
            await expect(page.locator('.detail-page')).to_be_visible()
            await expect(page.locator('.viewer-status')).to_have_count(0,timeout=30000)
            await expect(page.locator('canvas')).to_have_count(1)
            await page.get_by_role('button',name='Pause',exact=True).click()
            await expect(page.get_by_role('button',name='Play',exact=True)).to_be_visible()
            await page.locator('.speed-control').click()
            await expect(page.locator('.speed-control')).to_have_text('1.5x')
            await page.get_by_role('button',name='Back to library').click()
            await expect(page.locator('canvas')).to_have_count(0)
        await dropdown.select_option('woman-casual')
        await page.reload()
        await expect(dropdown).to_have_value('woman-casual')
        # Selection can change while the detail scene is open, including while paused.
        await page.locator('.exercise-card').first.click()
        await expect(page.locator('.viewer-status')).to_have_count(0,timeout=30000)
        await page.get_by_role('button',name='Pause',exact=True).click()
        for avatar in ['man-athletic','woman-casual','wood','man-athletic']:
            await dropdown.select_option(avatar)
            await expect(page.locator('.viewer-status')).to_have_count(0,timeout=30000)
            await expect(page.locator('canvas')).to_have_count(1)
            await expect(page.get_by_role('button',name='Play',exact=True)).to_be_visible()
        await page.screenshot(path=str(output/'avatar-detail-review.png'))
        await page.get_by_role('button',name='Back to library').click()
        categories=page.locator('.sidebar nav button')
        for i in range(1,await categories.count()):
            button=categories.nth(i)
            count=int(await button.locator('span').inner_text())
            await button.click()
            await expect(page.locator('.exercise-card')).to_have_count(count)
            await expect(page.locator('canvas')).to_have_count(0)
        await categories.first.click()
        await page.evaluate('window.scrollTo(0,3000)')
        await expect(page.locator('canvas')).to_have_count(0)
        await page.evaluate('window.scrollTo(0,0)')
        await page.wait_for_timeout(1000)
        await page.screenshot(path=str(output/'avatar-grid-review.png'))
        await page.set_viewport_size({'width':390,'height':844})
        assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        await expect(dropdown).to_be_visible()
        assert not errors, errors
        await page.goto(url + '?exercise=standing-cat-cow')
        await expect(page.locator('.viewer-status')).to_have_count(0, timeout=30000)
        await expect(page.locator('canvas')).to_have_count(1)
        await page.screenshot(path=str(output/'standing-cat-cow-detail-review.png'))
        print('PASS: defaults, all avatars, GIF grid, persistence, detail switching, playback, categories, scroll, mobile, no browser exceptions.')
        await browser.close()

asyncio.run(main())
