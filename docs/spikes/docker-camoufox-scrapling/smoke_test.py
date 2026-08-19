#!/usr/bin/env python3
"""
camoufox / scrapling Docker화 사전 검증용 스모크 테스트.
실제 대상 사이트(카카오맵/캐치테이블)는 건드리지 않고, 브라우저 바이너리가
컨테이너 안에서 정상적으로 실행/종료되는지만 확인한다 (example.com 대상).
"""
import sys
import traceback


def test_camoufox():
    print("=== [1/2] camoufox (헤드리스 Firefox) 실행 테스트 ===")
    try:
        from camoufox.sync_api import Camoufox

        with Camoufox(headless=True) as browser:
            page = browser.new_page()
            page.goto("https://example.com", timeout=30000)
            title = page.title()
            page.close()
        print(f"OK - camoufox 정상 실행, 페이지 title: {title!r}")
        return True
    except Exception:
        print("FAIL - camoufox 실행 중 예외 발생")
        traceback.print_exc()
        return False


def test_scrapling():
    print("\n=== [2/2] scrapling (Playwright 기반) 실행 테스트 ===")
    try:
        import asyncio
        from scrapling.fetchers import AsyncDynamicSession

        async def run():
            async with AsyncDynamicSession(headless=True) as session:
                page = await session.fetch("https://example.com", network_idle=True)
                status = getattr(page, "status", None)
                body_len = len(page.body) if getattr(page, "body", None) else 0
                return status, body_len

        status, body_len = asyncio.run(run())
        print(f"OK - scrapling 정상 실행, HTTP status: {status}, body 길이: {body_len}")
        return True
    except Exception:
        print("FAIL - scrapling 실행 중 예외 발생")
        traceback.print_exc()
        return False


if __name__ == "__main__":
    ok1 = test_camoufox()
    ok2 = test_scrapling()
    print("\n=== 결과 요약 ===")
    print(f"camoufox: {'PASS' if ok1 else 'FAIL'}")
    print(f"scrapling: {'PASS' if ok2 else 'FAIL'}")
    sys.exit(0 if (ok1 and ok2) else 1)
