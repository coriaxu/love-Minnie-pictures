"""对正在预览的画廊重放手机拖动、连续翻画和慢图返回。使用 Python Playwright 和 Chrome。"""

import argparse
from urllib.parse import quote, urlencode, urljoin

from playwright.sync_api import expect, sync_playwright


def touch(session, event, x=None, y=None):
    points = [] if x is None else [{"x": x, "y": y, "id": 1}]
    session.send("Input.dispatchTouchEvent", {"type": event, "touchPoints": points})


def check(base):
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(channel="chrome")
        context = browser.new_context(viewport={"width": 390, "height": 844}, has_touch=True, is_mobile=True)
        catalog = context.request.get(urljoin(base, "data.json"))
        assert catalog.ok, f"作品目录读取失败（{catalog.status}）"
        newest, previous, earlier = sorted(catalog.json(), key=lambda row: row["date"], reverse=True)[:3]
        query = urlencode({"date": newest["date"], "day": newest["date"]})
        url = urljoin(base, "gallery.html") + "?" + query
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(url, wait_until="domcontentloaded")
        art = page.locator("#detail-image")
        media = page.locator(".detail-media")
        expect(art).to_have_attribute("data-date", newest["date"])
        page.wait_for_function("document.getElementById('detail-image').naturalWidth > 0")

        # 手指保持按住时画就应移动。浏览器取消手势后，原来的画应回到原位。
        session = context.new_cdp_session(page)
        rect = media.bounding_box()
        x, y = rect["x"] + rect["width"] * .25, rect["y"] + rect["height"] * .5
        touch(session, "touchStart", x, y)
        touch(session, "touchMove", x + 16, y)
        touch(session, "touchMove", x + 80, y)
        page.wait_for_function("""() => {
            const transform = getComputedStyle(document.querySelector('.detail-media')).transform;
            return transform !== 'none' && new DOMMatrix(transform).m41 > 55;
        }""")
        touch(session, "touchCancel")
        expect(media).to_have_css("transform", "none")
        expect(art).to_have_attribute("data-date", newest["date"])

        # 截住第一张原图，等第二次翻页完成后才放行。先到的操作不能覆盖最后的选择。
        pending = []
        path = urljoin(base, "images/" + quote(previous["filename"]))
        page.route(path, lambda route: pending.append(route))
        with page.expect_request(path):
            page.keyboard.press("ArrowLeft")
        expect(page.locator("#detail-loading")).to_be_visible()
        page.keyboard.press("ArrowLeft")
        expect(art).to_have_attribute("data-date", earlier["date"])
        with page.expect_event("requestfinished", predicate=lambda request: request.url == path):
            pending[0].continue_()
        page.evaluate("() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))")
        expect(art).to_have_attribute("data-date", earlier["date"])
        page.keyboard.press("Escape")
        expect(page.locator("#detail-modal")).to_be_hidden()

        # 手机横屏也没有底部胶卷，旋转到宽屏才需要创建。
        page.set_viewport_size({"width": 844, "height": 390})
        page.goto(url, wait_until="domcontentloaded")
        expect(art).to_have_attribute("data-date", newest["date"])
        expect(page.locator(".timeline-thumb")).to_have_count(0)
        page.set_viewport_size({"width": 1200, "height": 800})
        expect(page.locator(".timeline-thumb.selected")).to_have_attribute("data-date", newest["date"])

        # 动效脚本偶尔断网时，首页和画廊仍应能阅读。
        page.route("**/js/motion.js*", lambda route: route.abort())
        page.goto(base + "?" + urlencode({"date": newest["date"]}), wait_until="domcontentloaded")
        moon = page.locator("#home-moon")
        expect(moon).to_have_attribute("data-date", newest["date"])
        moon.click()
        page.locator("#today-hero-art").click()
        expect(art).to_have_attribute("data-date", newest["date"])
        assert not errors, errors
        browser.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("url", nargs="?", default="http://127.0.0.1:5177/")
    check(parser.parse_args().url.rstrip("/") + "/")
    print("通过：手机跟手、取消回位、慢图连续翻页、横竖屏胶卷、动效断网后拆信。")
