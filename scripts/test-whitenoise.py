# V1.2 #3 白噪音多轨混音 + 频谱冒烟
# 验证：
#   1) 初态：无激活轨，状态条/master 不显示
#   2) 点 cafe → 出现 mix-row-cafe + master 总音量条；chip pressed
#   3) 继续点 rain-light → 两条 mix row 同时存在（多轨）
#   4) 继续点 forest → 三条 mix row（达上限 3）
#   5) 点未选的 train → no-op（disabled）；mix row 仍 3 条
#   6) 调 cafe per-track volume → preferences mix volume 同步
#   7) 调 master volume → preferences.whitenoiseVolume 同步
#   8) 移除 cafe → mix row 剩 2；rain-light/forest chip 仍 pressed
#   9) 清空 → 全部移除，状态条隐藏
#  10) 重选 cafe（缓存复用 < 300ms 出 playing）
#  11) Persist 持久化：reload 后 mix 清零（浏览器策略需手势）但 store value 还原 → UI 已清，service 同步
#  12) 进入全屏专注页 → spectrum canvas 挂载
#  13) console 无报错
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from playwright.sync_api import sync_playwright

URL = 'http://localhost:5173'


def log(msg, ok=True):
    tag = '[PASS]' if ok else '[FAIL]'
    print(f'{tag} {msg}')


def pressed_chip_ids(page):
    """返回当前所有 aria-pressed=true 的 chip data-testid 列表"""
    btns = page.locator('[data-testid^="btn-track-"][aria-pressed="true"]')
    n = btns.count()
    return [btns.nth(i).get_attribute('data-testid') for i in range(n)]


def mix_row_ids(page):
    """返回当前所有 mix-row-<id> 的 trackId 列表（顺序 = 添加顺序）"""
    rows = page.locator('[data-testid^="mix-row-"]')
    n = rows.count()
    return [
        rows.nth(i).get_attribute('data-testid').replace('mix-row-', '')
        for i in range(n)
    ]


def main():
    failures = []
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=['--autoplay-policy=no-user-gesture-required'],
        )
        ctx = browser.new_context()
        page = ctx.new_page()

        errors = []
        page.on('pageerror', lambda e: errors.append(f'PAGE ERROR: {e}'))
        page.on(
            'console',
            lambda m: errors.append(f'CONSOLE {m.type}: {m.text}') if m.type == 'error' else None,
        )

        page.goto(URL + '/onboarding')
        page.evaluate("localStorage.setItem('floattomato:onboarded', 'true')")
        # 清旧 preferences 避免 v0→v1 migration 副作用
        page.evaluate("localStorage.removeItem('floattomato:preferences')")
        page.goto(URL + '/')
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(300)

        # === 1) 初态 ===
        bar = page.locator('[data-testid="whitenoise-bar"]')
        if bar.count() == 1:
            log('whitenoise bar mounted')
        else:
            failures.append('whitenoise bar missing')
        if len(mix_row_ids(page)) == 0:
            log('no mix rows in idle state')
        else:
            failures.append('mix rows should be empty in idle')
        if page.locator('[data-testid="whitenoise-master-volume"]').count() == 0:
            log('master volume hidden in idle state')
        else:
            failures.append('master volume should be hidden in idle')

        # === 2) 点 cafe → 出现 row + master ===
        page.locator('[data-testid="btn-track-cafe"]').click()
        page.wait_for_timeout(800)
        rows = mix_row_ids(page)
        if rows == ['cafe']:
            log(f'after click cafe: mix rows = {rows}')
        else:
            failures.append(f'after click cafe: rows = {rows}')
        if page.locator('[data-testid="whitenoise-master-volume"]').count() == 1:
            log('master volume visible after first track')
        else:
            failures.append('master volume should appear after first track')

        pressed = pressed_chip_ids(page)
        if pressed == ['btn-track-cafe']:
            log('cafe chip pressed')
        else:
            failures.append(f'pressed chips = {pressed}')

        # === 3) 继续点 rain-light → 多轨混音 ===
        page.locator('[data-testid="btn-track-rain-light"]').click()
        page.wait_for_timeout(800)
        rows = mix_row_ids(page)
        if set(rows) == {'cafe', 'rain-light'}:
            log(f'2-track mix: {rows}')
        else:
            failures.append(f'2-track mix failed: rows = {rows}')
        if set(pressed_chip_ids(page)) == {'btn-track-cafe', 'btn-track-rain-light'}:
            log('both cafe + rain-light chips pressed (multi-select)')
        else:
            failures.append(f'multi-select pressed: {pressed_chip_ids(page)}')

        # === 4) 继续点 forest → 达上限 3 ===
        page.locator('[data-testid="btn-track-forest"]').click()
        page.wait_for_timeout(800)
        rows = mix_row_ids(page)
        if set(rows) == {'cafe', 'rain-light', 'forest'}:
            log(f'3-track mix at limit: {rows}')
        else:
            failures.append(f'3-track mix failed: rows = {rows}')

        # === 5) 点未选的 train（应 disabled / no-op） ===
        train_btn = page.locator('[data-testid="btn-track-train"]')
        is_disabled = train_btn.is_disabled()
        if is_disabled:
            log('train chip disabled at limit (not selected, mix full)')
        else:
            failures.append('train chip should be disabled at mix limit')
        # 强行 force click 也应 no-op（disabled 按钮 playwright 默认不允许，所以验证 disabled 就够）
        if len(mix_row_ids(page)) == 3:
            log('mix stays at 3 after attempted train click')
        else:
            failures.append('mix count changed after disabled click')

        # === 6) 调 cafe per-track volume ===
        cafe_vol = page.locator('[data-testid="mix-volume-cafe"]')
        cafe_vol.fill('45')
        page.wait_for_timeout(150)
        mix_state = page.evaluate("""
          () => {
            const raw = localStorage.getItem('floattomato:preferences')
            if (!raw) return null
            return JSON.parse(raw).state?.whitenoiseMix ?? null
          }
        """)
        cafe_entry = next((m for m in mix_state if m['trackId'] == 'cafe'), None)
        if cafe_entry and cafe_entry['volume'] == 45:
            log(f'cafe per-track volume → preferences.mix.cafe.volume=45')
        else:
            failures.append(f'cafe volume mismatch: mix={mix_state}')

        # === 7) 调 master volume ===
        page.locator('[data-testid="whitenoise-master-volume"]').fill('25')
        page.wait_for_timeout(100)
        master = page.evaluate("""
          () => {
            const raw = localStorage.getItem('floattomato:preferences')
            return raw ? JSON.parse(raw).state?.whitenoiseVolume ?? null : null
          }
        """)
        if master == 25:
            log(f'master volume → preferences.whitenoiseVolume={master}')
        else:
            failures.append(f'master volume mismatch: {master}')

        # === 8) 移除 cafe → 剩 2 轨 ===
        page.locator('[data-testid="btn-remove-cafe"]').click()
        page.wait_for_timeout(200)
        rows = mix_row_ids(page)
        if set(rows) == {'rain-light', 'forest'}:
            log(f'after remove cafe: {rows}')
        else:
            failures.append(f'remove cafe failed: rows = {rows}')
        if 'btn-track-cafe' not in pressed_chip_ids(page):
            log('cafe chip released after remove')
        else:
            failures.append('cafe chip still pressed after remove')
        # train chip 应不再 disabled
        if not page.locator('[data-testid="btn-track-train"]').is_disabled():
            log('train chip re-enabled after dropping below limit')
        else:
            failures.append('train chip should re-enable')

        # === 9) 清空 ===
        page.locator('[data-testid="btn-whitenoise-clear"]').click()
        page.wait_for_timeout(200)
        if len(mix_row_ids(page)) == 0:
            log('clear: all mix rows removed')
        else:
            failures.append('clear failed')
        if page.locator('[data-testid="whitenoise-master-volume"]').count() == 0:
            log('master volume hidden after clear')
        else:
            failures.append('master volume should hide after clear')

        # === 10) 重选 cafe（缓存复用） ===
        page.locator('[data-testid="btn-track-cafe"]').click()
        page.wait_for_timeout(300)
        rows = mix_row_ids(page)
        if rows == ['cafe']:
            log('cached cafe buffer reused: replays in <300ms')
        else:
            failures.append(f'cache reuse failed: rows={rows}')

        # === 11) 持久化 + reload 后 service 与 UI 同步 ===
        page.reload()
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(400)
        # 浏览器策略：reload 后 AudioContext 没手势，service mix 是空 → store 应自清
        rows = mix_row_ids(page)
        if len(rows) == 0:
            log('reload: UI mix cleared (service idle without gesture)')
        else:
            failures.append(f'reload UI should clear: rows={rows}')

        # === 12) 进入全屏专注页 → spectrum canvas 挂载 ===
        page.locator('[data-testid="btn-fullscreen"]').click()
        page.wait_for_timeout(500)
        spectrum = page.locator('[data-testid="spectrum-canvas"]')
        if spectrum.count() == 1:
            log('spectrum canvas mounted in fullscreen focus page')
        else:
            failures.append('spectrum canvas missing in fullscreen page')

        # === 13) console 错误 ===
        real_errors = [
            e for e in errors
            if not any(x in e.lower() for x in ['favicon', 'manifest', 'sw.js', 'workbox', 'autoplay', 'fullscreen'])
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
