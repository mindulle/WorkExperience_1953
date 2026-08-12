import asyncio
from scrapling.fetchers import AsyncDynamicSession

async def test_catchtable():
    review_url = "https://app.catchtable.co.kr/ct/shop/1953HyeongjeGukbapBusanStationBranch/review"
    print(f"🚀 캐치테이블 접속 테스트 시작: {review_url}")
    try:
        async with AsyncDynamicSession(headless=True, network_idle=True) as session:
            page = await session.fetch(review_url)
            print("✅ 봇 차단 우회 및 페이지 렌더링 성공!")
            
            # 페이지에 있는 텍스트들을 추출
            body = page.css('body')
            if body:
                all_text = body[0].text
                
                if "리뷰" in all_text:
                    print("✅ '리뷰' 관련 텍스트가 DOM에 존재합니다.")
                    
                    # '맛' 이라는 글자가 포함된 span, div, p 요소 찾기
                    sample_reviews = page.find_all(['span', 'p', 'div'], string=lambda text: "맛" in text if text else False)
                    
                    print(f"\n🔍 [추출된 텍스트 샘플]")
                    seen = set()
                    for r in sample_reviews:
                        text = r.text.strip().replace('\n', ' ')
                        if len(text) > 15 and text not in seen: # 너무 짧은 UI 텍스트 제외 및 중복 제거
                            seen.add(text)
                            print(f" - {text[:100]}...")
                            if len(seen) >= 5:
                                break
                else:
                    print("⚠️ 페이지에 리뷰 관련 텍스트가 렌더링되지 않았습니다.")
    except Exception as e:
        print(f"❌ 오류 발생: {e}")

if __name__ == "__main__":
    asyncio.run(test_catchtable())
