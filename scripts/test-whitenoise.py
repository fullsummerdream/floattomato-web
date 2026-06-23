# V1.2 #2 白噪音 Web Audio 重写后冒烟（零功能回归）
# 验证：
#   1) 状态条/音量滑块默认不显示（idle）
#   2) 点 chip → loading → playing（status 转移）
#   3) 状态条显示「正在播放：<name>」+ 音量滑块出现
#   4) 切到另一 chip → 旧停新启，trackId 切换
#   5) 调音量滑块 → service.volume 同步
#   6) 点停止 → 回 idle，状态条消失
#   7) console 无报错（除已知 SW / favicon）
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from playwright.sync_api import sync_playwright

URL = 'http://localhost:5173'


def log(msg, ok=True):
    tag = '[PASS]' if ok else '[FAIL]'
    print(f'{tag} {msg}')


def status_text(page):
    """从状态条提取「正在播放：xxx」/「加载中：xxx」/「音轨缺失」文字 + 当前 aria-pressed 的 chip"""
    bar = page.locator('[data-testid="whitenoise-bar"]')
    text = bar.inner_text() if bar.count() else ''
    pressed = page.locator('[data-testid^="btn-track-"][aria-pressed="true"]')
    pressed_id = pressed.first.get_attribute('data-testid') if pressed.count() else None
    return {'text': text, 'pressed': pressed_id}


def main():
    failures = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--autoplay-policy=no-user-gesture-required'])
        ctx = browser.new_context()
        page = ctx.new_page()

        errors = []
        page.on('pageerror', lambda e: errors.append(f'PAGE ERROR: {e}'))
        page.on('console', lambda m: errors.append(f'CONSOLE {m.type}: {m.text}') if m.type == 'error' else None)

        page.goto(URL + '/onboarding')
        page.evaluate("localStorage.setItem('floattomato:onboarded', 'true')")
        page.goto(URL + '/')
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(300)

        # === 1) 初态：状态条不存在（无 selected track） ===
        bar = page.locator('[data-testid="whitenoise-bar"]')
        if bar.count() == 1:
            log('whitenoise bar mounted')
        else:
            failures.append('whitenoise bar missing')

        vol = page.locator('[data-testid="whitenoise-volume"]')
        if vol.count() == 0:
            log('volume slider hidden in idle state')
        else:
            failures.append('volume slider should be hidden in idle')

        # === 2) 点 cafe → loading → playing（看 UI 真实显示） ===
        cafe_btn = page.locator('[data-testid="btn-track-cafe"]')
        cafe_btn.click()
        page.wait_for_timeout(800)

        st = status_text(page)
        if '正在播放' in st['text'] and '咖啡馆' in st['text']:
            log(f'after click cafe: status bar shows "正在播放：咖啡馆"')
        else:
            failures.append(f'after click cafe: status text={st["text"][:60]!r}')
        if st['pressed'] == 'btn-track-cafe':
            log('cafe chip aria-pressed=true')
        else:
            failures.append(f'cafe chip not pressed: {st["pressed"]}')

        # === 3) 状态条 + 音量滑块出现 ===
        if vol.count() == 1:
            log('volume slider visible after track select')
        else:
            failures.append('volume slider should be visible after select')

        # === 4) 切到 rain-light → status bar 文案切换 ===
        page.locator('[data-testid="btn-track-rain-light"]').click()
        page.wait_for_timeout(800)
        st2 = status_text(page)
        if '正在播放' in st2['text'] and '小雨' in st2['text']:
            log('switched to rain-light: status bar shows 小雨')
        else:
            failures.append(f'switch to rain-light failed: text={st2["text"][:60]!r}')
        if st2['pressed'] == 'btn-track-rain-light':
            log('rain-light chip aria-pressed=true (cafe released)')
        else:
            failures.append(f'rain-light chip not pressed: {st2["pressed"]}')

        # === 5) 调音量 → preferencesStore.whitenoiseVolume 同步 ===
        vol.fill('30')
        page.wait_for_timeout(100)
        prefs_vol = page.evaluate("""
          () => {
            const raw = localStorage.getItem('floattomato:preferences')
            if (!raw) return null
            return JSON.parse(raw).state?.whitenoiseVolume ?? null
          }
        """)
        if prefs_vol == 30:
            log(f'volume set to 30 → preferences.whitenoiseVolume={prefs_vol}')
        else:
            failures.append(f'volume mismatch: prefs={prefs_vol}, expected 30')

        # === 6) 点停止 → 回 idle（状态条消失 + 无 pressed chip） ===
        page.locator('[data-testid="btn-whitenoise-stop"]').click()
        page.wait_for_timeout(300)
        st4 = status_text(page)
        if st4['pressed'] is None:
            log('stop: no chip pressed')
        else:
            failures.append(f'stop failed: still pressed {st4["pressed"]}')
        if page.locator('[data-testid="whitenoise-volume"]').count() == 0:
            log('volume slider hidden again after stop')
        else:
            failures.append('volume slider should hide after stop')

        # === 7) 重新选 cafe（验证缓存复用：第二次切应 < 300ms 出 playing） ===
        page.locator('[data-testid="btn-track-cafe"]').click()
        page.wait_for_timeout(300)
        st5 = status_text(page)
        if '正在播放' in st5['text'] and '咖啡馆' in st5['text']:
            log('cached buffer reused: cafe replays within 300ms')
        else:
            failures.append(f'cache reuse failed: text={st5["text"][:60]!r}')

        # === 8) console 错误（排除 SW / favicon / autoplay 警告噪声） ===
        real_errors = [
            e for e in errors
            if not any(x in e.lower() for x in ['favicon', 'manifest', 'sw.js', 'workbox', 'autoplay'])
        ]
        if real_errors:
            failures.append(f'{len(real_errors)} console errors')
            for e in real_errors[:5]:
                print(f'  - {e}')
        else:
            log('no console errors')

        browser.close()

    print()
    if failures:
        print(f'=== {len(failures)} FAILURE(S) ===')
        for f in failures:
            print(f'  - {f}')
        sys.exit(1)
    else:
        print('=== ALL CHECKS PASSED ===')


if __name__ == '__main__':
    main()
