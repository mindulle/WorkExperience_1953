import asyncio
import pandas as pd
from pathlib import Path
from scrapling.fetchers import AsyncDynamicSession

# 대시보드(types.ts)가 요구하는 필수 컬럼에 맞춘 CatchTable 수집기
async def collect_catchtable(shop_id: str, branch_name: str):
    url = f"https://app.catchtable.co.kr/ct/shop/{shop_id}/review"
    print(f"🚀 [{branch_name}] 캐치테이블 리뷰 수집 시작: {url}")
    
    reviews_data = []
    
    try:
        async with AsyncDynamicSession(headless=True) as session:
            page = await session.fetch(url)
            print("✅ 봇 차단 우회 및 페이지 렌더링 성공")
            # 추후 실제 DOM 파싱 (Scrapling 적응형 셀렉터 사용)
    except Exception as e:
        print(f"❌ 수집 중 오류: {e}")
        
    return pd.DataFrame(reviews_data)

if __name__ == "__main__":
    asyncio.run(collect_catchtable("1953bros_gwangan", "광안점"))
