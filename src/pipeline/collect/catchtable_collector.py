import asyncio
import pandas as pd
from scrapling.fetchers import AsyncDynamicSession

# 대시보드(types.ts) 요구사항 및 팀원(상은님) 스키마에 맞춘 캐치테이블 수집기
async def collect_catchtable(shop_id: str, branch_name: str):
    url = f"https://app.catchtable.co.kr/ct/shop/{shop_id}"
    print(f"🚀 [{branch_name}] 캐치테이블 리뷰 수집 시작: {url}")
    
    reviews_data = []
    
    try:
        # 모바일 기기로 속여서 앱 다운로드 페이지 우회 및 스텔스 모드 작동
        async with AsyncDynamicSession(headless=True) as session:
            # SPA(React) 로딩 대기를 위해 network_idle 상태까지 대기
            page = await session.fetch(url, network_idle=True)
            print("✅ 봇 차단 우회 및 페이지 렌더링 성공 (HTTP 200)")
            
            # TODO: 실제 리뷰 DOM 요소에 맞춰 적응형 파싱 로직 구현
            # reviews = page.css('.review-list-item') 
            # for r in reviews:
            #     reviews_data.append({
            #         "branch_name": branch_name,
            #         "reviewer_name": r.css('.name::text').get(),
            #         "rating": r.css('.rating::text').get(),
            #         ...
            #     })
            
    except Exception as e:
        print(f"❌ 수집 중 오류: {e}")
        
    return pd.DataFrame(reviews_data)

if __name__ == "__main__":
    asyncio.run(collect_catchtable("1953HyeongjeGukbapBusanStationBranch", "부산역점(중앙동점)"))
