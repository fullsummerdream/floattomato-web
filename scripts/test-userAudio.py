# V1.2 #4 用户上传音频 + 数字样式扩到 6 种冒烟
# 验证：
#   1) 「我的」组 + 上传按钮存在；初态无 user chip
#   2) 5MB+ 文件上传被拒（inline 错误提示出现）
#   3) 合法 audio/wav 文件上传 → user chip 出现 + IDB userAudios 计数 1
#   4) 点 user chip → 进入 mix（trackId 以 user- 开头）；混音上限规则仍生效
#   5) 删除 user chip → 同时从 mix 移除 + IDB 计数归零 + buffer 失效
#   6) AppearancePage 6 个数字样式按钮都存在（classic/thin/flip/dotmatrix/digital/chunky）
#   7) 切 digital / chunky → store.numberStyle 更新
#   8) console 无报错
import sys, io, struct, math, base64
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from playwright.sync_api import sync_playwright

URL = 'http://localhost:5173'


def log(msg, ok=True):
    tag = '[PASS]' if ok else '[FAIL]'
    print(f'{tag} {msg}')


def make_wav(seconds=1, sample_rate=8000) -> bytes:
    """构造一个最小有效的 PCM WAV（静音 N 秒），返回 bytes。Web Audio decodeAudioData 必须能解码。"""
    n_samples = seconds * sample_rate
    # 16-bit mono
    data = b'\x00\x00' * n_samples
    fmt = b'RIFF' + struct.pack('<I', 36 + len(data)) + b'WAVE'
    fmt += b'fmt ' + struct.pack('<IHHIIHH', 16, 1, 1, sample_rate, sample_rate * 2, 2, 16)
    fmt += b'data' + struct.pack('<I', len(data)) + data
    return fmt


def upload_file_via_dom(page, filename, mime, content_bytes):
    """通过 set_input_files API 上传到隐藏 input"""
    page.set_input_files(
        '[data-testid="input-upload-audio"]',
        files=[{'name': filename, 'mimeType': mime, 'buffer': content_bytes}],
    )


def user_audio_count(page):
    """从 IDB 直接数 userAudios 表行数"""
    return page.evaluate("""
      async () => {
        const req = indexedDB.open('floattomato')
        return await new Promise((res, rej) => {
          req.onsuccess = () => {
            const db = req.result
            if (!db.objectStoreNames.contains('userAudios')) { db.close(); return res(0) }
            const tx = db.transaction(['userAudios'], 'readonly')
            const store = tx.objectStore('userAudios')
            const countReq = store.count()
            countReq.onsuccess = () => { db.close(); res(countReq.result) }
            countReq.onerror = () => { db.close(); rej(countReq.error) }
          }
          req.onerror = () => rej(req.error)
        })
      }
    """)


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
        page.evaluate("localStorage.removeItem('floattomato:preferences')")
        # 清空 userAudios 表避免上次残留
        page.evaluate("""
          async () => {
            const req = indexedDB.open('floattomato')
            await new Promise((res, rej) => {
              req.onsuccess = () => {
                const db = req.result
                if (!db.objectStoreNames.contains('userAudios')) { db.close(); return res(null) }
                const tx = db.transaction(['userAudios'], 'readwrite')
                tx.objectStore('userAudios').clear()
                tx.oncomplete = () => { db.close(); res(null) }
                tx.onerror = () => { db.close(); rej(tx.error) }
              }
              req.onerror = () => rej(req.error)
            })
          }
        """)
        page.goto(URL + '/')
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(400)

        # === 1) 我的组 + 上传按钮存在 ===
        user_group = page.locator('[data-testid="whitenoise-group-user"]')
        if user_group.count() == 1:
            log('user group "我的" present')
        else:
            failures.append('user group missing')

        upload_btn = page.locator('[data-testid="btn-upload-audio"]')
        if upload_btn.count() == 1:
            log('upload button present')
        else:
            failures.append('upload button missing')

        # 初态 user chip 0 条
        user_chips = page.locator('[data-testid^="btn-track-user-"]')
        if user_chips.count() == 0:
            log('no user chips initially')
        else:
            failures.append(f'unexpected user chips: {user_chips.count()}')

        # === 2) 5MB+ 文件被拒 ===
        big_buf = bytes(5 * 1024 * 1024 + 100)  # 略大于 5MB
        upload_file_via_dom(page, 'too-big.mp3', 'audio/mpeg', big_buf)
        page.wait_for_timeout(200)
        err = page.locator('[data-testid="upload-error"]')
        if err.count() == 1 and '5MB' in err.inner_text():
            log(f'5MB+ rejected with inline error: "{err.inner_text()}"')
        else:
            failures.append(f'5MB+ should be rejected, got err count {err.count()}')
        # 等错误自消
        page.wait_for_timeout(2600)

        # === 3) 合法 WAV 上传 ===
        wav = make_wav(seconds=1, sample_rate=8000)
        upload_file_via_dom(page, 'my-rain.wav', 'audio/wav', wav)
        page.wait_for_timeout(500)
        count = user_audio_count(page)
        if count == 1:
            log(f'wav upload OK → userAudios count = {count}')
        else:
            failures.append(f'wav upload failed: count={count}')

        user_chips = page.locator('[data-testid^="btn-track-user-"]')
        if user_chips.count() == 1:
            log('user chip appeared after upload')
        else:
            failures.append(f'user chip count after upload: {user_chips.count()}')

        # 抓 chip id（user-<timestamp-uuid>）
        chip_testid = user_chips.first.get_attribute('data-testid')
        user_id = chip_testid.replace('btn-track-', '')
        log(f'user track id = {user_id[:30]}...')

        # === 4) 点 user chip → 进入 mix ===
        user_chips.first.click()
        page.wait_for_timeout(600)
        mix_row = page.locator(f'[data-testid="mix-row-{user_id}"]')
        if mix_row.count() == 1:
            log('user track added to mix')
        else:
            failures.append('user track did not add to mix')

        # 顺手再点两个内置轨 → 应达上限 3
        page.locator('[data-testid="btn-track-cafe"]').click()
        page.wait_for_timeout(400)
        page.locator('[data-testid="btn-track-forest"]').click()
        page.wait_for_timeout(400)
        if page.locator('[data-testid="btn-track-rain-light"]').is_disabled():
            log('mix limit still works with user track in mix (rain-light disabled)')
        else:
            failures.append('rain-light should be disabled at mix limit')

        # === 5) 删除 user chip → 从 mix 移除 + IDB 归零 ===
        del_btn = page.locator(f'[data-testid="btn-delete-user-{user_id}"]')
        del_btn.click()
        page.wait_for_timeout(400)
        if page.locator(f'[data-testid="mix-row-{user_id}"]').count() == 0:
            log('user track removed from mix after delete')
        else:
            failures.append('user track still in mix after delete')
        count2 = user_audio_count(page)
        if count2 == 0:
            log(f'userAudios count after delete = {count2}')
        else:
            failures.append(f'userAudios count after delete: {count2}')
        if page.locator('[data-testid^="btn-track-user-"]').count() == 0:
            log('user chip disappeared after delete')
        else:
            failures.append('user chip still present after delete')

        # === 6) AppearancePage 6 个数字样式按钮 ===
        page.goto(URL + '/settings')  # settings 入口跳外观
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(200)
        # 直接路由到外观页
        page.goto(URL + '/appearance')
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(300)
        styles = ['classic', 'thin', 'flip', 'dotmatrix', 'digital', 'chunky']
        missing = [
            s for s in styles
            if page.locator(f'[data-testid="number-{s}"]').count() == 0
        ]
        if not missing:
            log(f'all 6 number style buttons present: {styles}')
        else:
            failures.append(f'missing number style buttons: {missing}')

        # === 7) 切 digital / chunky → store 更新 ===
        page.locator('[data-testid="number-digital"]').click()
        page.wait_for_timeout(150)
        digit_store = page.evaluate("""
          () => {
            const raw = localStorage.getItem('floattomato:appearance')
            return raw ? JSON.parse(raw).state?.numberStyle ?? null : null
          }
        """)
        if digit_store == 'digital':
            log('numberStyle="digital" persisted')
        else:
            failures.append(f'digital not persisted: {digit_store}')

        page.locator('[data-testid="number-chunky"]').click()
        page.wait_for_timeout(150)
        chunky_store = page.evaluate("""
          () => {
            const raw = localStorage.getItem('floattomato:appearance')
            return raw ? JSON.parse(raw).state?.numberStyle ?? null : null
          }
        """)
        if chunky_store == 'chunky':
            log('numberStyle="chunky" persisted')
        else:
            failures.append(f'chunky not persisted: {chunky_store}')

        # === 8) console 错误 ===
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
