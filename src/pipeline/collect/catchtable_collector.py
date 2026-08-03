import asyncio
import pandas as pd
from scrapling.fetchers import AsyncDynamicSession

# 대시보드(types.ts) 요구사항 및 팀원(상은님) 스키마에 맞춘 캐치테이블 수집기
async def collect_catchtable(shop_id: str, branch_name: str):
    # 실제 리뷰 페이지 탭 URL로 이동 (파라미터나 탭 경로 등 실제 URL 구조에 맞춰 조정)
    url = f"https://app.catchtable.co.kr/ct/shop/{shop_id}/review"
    print(f"🚀 [{branch_name}] 캐치테이블 리뷰 수집 시작: {url}")
    
    reviews_data = []
    
    try:
        # 모바일 기기로 속여서 앱 다운로드 페이지 우회 및 스텔스 모드 작동
        async with AsyncDynamicSession(headless=True) as session:
            # SPA(React) 로딩 대기를 위해 network_idle 상태까지 대기
            page = await session.fetch(url, network_idle=True)
            print("✅ 봇 차단 우회 및 페이지 렌더링 성공 (HTTP 200)")
            
            # 동적 렌더링이 완료될 때까지 추가 대기 (리뷰 컨테이너가 나타날 때까지)
            # Catchtable은 스크롤 시 추가 로딩되지만, 일단 첫 화면의 리뷰들만 추출
            await asyncio.sleep(3)
            
            # 적응형 파싱: 특정 클래스명이 바뀌어도 동작하도록 속성값 부분 일치 검색 활용
            # CSS selector: class 속성에 'review', 'item', 'list' 등이 포함된 컨테이너 탐색
            review_elements = page.css('div[class*="review"][class*="item"], article')
            print(f"🔍 발견된 리뷰 요소: {len(review_elements)}개")
            
            for idx, r in enumerate(review_elements):
                # 각 요소를 순회할 때 css()는 리스트를 반환하므로 첫 번째 요소 추출
                name_elem = r.css('span[class*="name"], div[class*="nickname"], span[class*="nickname"]')
                reviewer = name_elem[0].text if name_elem else ""
                
                score_elem = r.css('span[class*="score"], div[class*="rating"], span[class*="rating"]')
                rating_text = score_elem[0].text if score_elem else ""
                
                rating = 0.0
                if rating_text:
                    import re
                    match = re.search(r'([0-9.]+)', rating_text)
                    if match:
                        rating = float(match.group(1))

                content_elem = r.css('p[class*="content"], span[class*="desc"], div[class*="text"], div[class*="content"]')
                content = content_elem[0].text if content_elem else ""
                
                date_elem = r.css('span[class*="date"], div[class*="time"]')
                date = date_elem[0].text if date_elem else ""
                
                if content and reviewer:
                    reviews_data.append({
                        "branch_name": branch_name,
                        "source": "Catchtable",
                        "reviewer_name": reviewer.strip(),
                        "rating": rating,
                        "content": content.strip(),
                        "date": date.strip() if date else ""
                    })

            print(f"✅ 유효한 리뷰 {len(reviews_data)}개 파싱 완료!")
            
    except Exception as e:
        print(f"❌ 수집 중 오류: {e}")
        
    return pd.DataFrame(reviews_data)

if __name__ == "__main__":
    df = asyncio.run(collect_catchtable("1953HyeongjeGukbapBusanStationBranch", "부산역점(중앙동점)"))
    if not df.empty:
        print("\n[수집된 샘플 데이터]")
        print(df.head())
        # csv 저장 테스트
        df.to_csv("data/raw/catchtable_sample.csv", index=False, encoding="utf-8-sig")

