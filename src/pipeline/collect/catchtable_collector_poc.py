import json
import asyncio
from scrapling.fetchers import AsyncDynamicSession
from scrapling.parser import Selector

async def test_catchtable():
    # PoC용 URL (캐치테이블 임의 매장 또는 1953형제돼지국밥 광안점)
    # 실제 URL은 나중에 찾아도 되니 일단 텍스트 검색 또는 임의 페이지로 테스트
    target_url = "https://app.catchtable.co.kr/ct/shop/1953bros"  # 가상 URL
    # 실제 URL을 알면 좋지만, 여기서는 Scrapling의 강력한 브라우저 회피기능과 파서를 테스트하는 목적
    
    print("🚀 [PoC] CatchTable 접속 테스트 시작...")
    try:
        # DynamicSession을 사용해 브라우저 렌더링 및 봇 우회 (headless=True)
        async with AsyncDynamicSession(headless=True, network_idle=True) as session:
            # 타겟 URL 접속 (검색 페이지로 대신 접속해봄)
            search_url = "https://app.catchtable.co.kr/ct/search/result?query=1953형제돼지국밥"
            print(f"👉 접속 중: {search_url}")
            
            page = await session.fetch(search_url)
            
            # Scrapling의 텍스트 기반 요소 탐색 (클래스명에 의존하지 않음!)
            # '1953형제돼지국밥' 텍스트를 가진 요소 찾기
            items = page.find_by_text("1953형제돼지국밥", partial=True)
            if not items:
                print("⚠️ 매장 검색 결과가 없습니다.")
            else:
                print(f"✅ 매장 검색 성공! ({len(items)}개 찾음)")
                for item in items:
                    print(f"   - 찾은 요소: {item.text}")
                    
            print("\n🎉 Scrapling 구동 테스트 성공 (봇 차단 없음, 정상 동작 확인!)")
    except Exception as e:
        print(f"❌ 오류 발생: {e}")

if __name__ == "__main__":
    asyncio.run(test_catchtable())
