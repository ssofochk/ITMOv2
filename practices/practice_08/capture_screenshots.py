from pathlib import Path
import sys
from playwright.sync_api import sync_playwright, expect

out = Path(sys.argv[1]) if len(sys.argv)>1 else Path('screenshots')
out.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width':1100,'height':850}, device_scale_factor=1)
    def reset():
        page.unroute_all()
        page.goto('http://127.0.0.1:8000/')
    def fill(a='24',b='5',op='multiply'):
        page.locator('#a').fill(a)
        page.locator('#b').fill(b)
        page.locator(f'label[for={op}]').click()
    def snap(name):
        page.screenshot(path=str(out/name),full_page=True)
    prototype=Path('docs/prototype.html').resolve()
    page.goto(prototype.as_uri()); snap('01-prototype.png')
    reset(); snap('02-initial.png')
    fill(); page.locator('#submit').click(); expect(page.locator('.result-value')).to_have_text('120'); snap('03-success.png')
    reset(); page.locator('#submit').click(); expect(page.locator('#a-error')).to_be_visible(); snap('04-validation.png')
    reset(); fill('8','0','divide'); page.locator('#submit').click(); expect(page.get_by_role('alert')).to_have_text('Cannot divide by zero'); snap('05-error.png')
    reset(); routes=[]; page.route('**/api/calculate',lambda route: routes.append(route)); fill(); page.locator('#submit').click(); expect(page.locator('#submit')).to_be_disabled(); expect(page.get_by_text('Calculating your answer…')).to_be_visible(); snap('06-loading.png'); routes[0].fulfill(json={'result':120}); expect(page.locator('.result-value')).to_have_text('120')
    reset(); page.route('**/api/calculate',lambda route: route.fulfill(status=204)); fill(); page.locator('#submit').click(); expect(page.get_by_text('No result returned. Please try again.')).to_be_visible(); snap('07-empty.png')
    reset(); page.set_viewport_size({'width':375,'height':812}); fill('8','2','divide'); page.locator('#submit').click(); expect(page.locator('.result-value')).to_have_text('4'); snap('08-mobile.png')
    browser.close()
print(f'Screenshots saved to {out.resolve()}')
