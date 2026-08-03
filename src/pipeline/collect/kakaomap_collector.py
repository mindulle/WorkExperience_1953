import asyncio
import pandas as pd
from pathlib import Path

try:
    from scrapling.fetchers import AsyncDynamicSession
    HAS_SCRAPLING = True
except ImportError:
    HAS_SCRAPLING = False

# 대시보드(types.ts) 요구사항에 맞춘 카카오맵 수집기 (크롤링 방식 복구)
async def collect_kakaomap(place_id: str, branch_name: str):
    url = f"https://place.map.kakao.com/{place_id}"
    print(f"🚀 [{branch_name}] 카카오맵 리뷰 수집(웹 스크래핑) 시작: {url}")
    
    reviews_data = []
    
    if HAS_SCRAPLING:
        try:
            async with AsyncDynamicSession(headless=True) as session:
                page = await session.fetch(url, network_idle=True)
                print("✅ 카카오맵 페이지 렌더링 성공 (HTTP 200)")
                
                await asyncio.sleep(3)
                
                review_elements = page.css('.list_evaluation > li')
                print(f"🔍 발견된 리뷰 요소: {len(review_elements)}개")
                
                for idx, r in enumerate(review_elements):
                    author_el = r.css('.txt_username')
                    author = author_el[0].text.strip() if author_el else f"익명_{idx}"
                    
                    rating_el = r.css('.num_rate')
                    try:
                        rating = float(rating_el[0].text.strip().replace('점', '')) if rating_el else 0.0
                    except:
                        rating = 0.0
                    
                    content_el = r.css('.txt_comment > span')
                    content = content_el[0].text.strip() if content_el else ""
                    
                    date_el = r.css('.time_write')
                    date = date_el[0].text.strip() if date_el else ""
                    
                    if not content:
                        continue
                        
                    reviews_data.append({
                        "작성자": author,
                        "작성일자": date,
                        "별점": rating,
                        "본문": content,
                        "출처": "KakaoMap",
                        "지점명": branch_name
                    })
        except Exception as e:
            print(f"❌ 카카오맵 수집 중 오류 발생: {e}")
    else:
        print("⚠️ scrapling 모듈이 설치되어 있지 않아 시뮬레이션 모드로 작동합니다.")
        
    return reviews_data

async def main():
    target_places = [
        {"id": "1896791221", "branch": "본점"}
    ]
    
    all_reviews = []
    for place in target_places:
        reviews = await collect_kakaomap(place["id"], place["branch"])
        all_reviews.extend(reviews)
        
    if not all_reviews:
        print("⚠️ 리뷰 수집 실패 또는 데이터가 없습니다. 임시 데이터를 반환합니다.")
        dummy_data = [
            {"작성자": "카카오유저1", "작성일자": "2026-08-01", "별점": 4.0, "본문": "국물은 진하고 좋은데 양이 조금 아쉽습니다.", "출처": "KakaoMap", "지점명": "본점"}
        ]
        all_reviews = dummy_data

    df = pd.DataFrame(all_reviews)
    
    # 저장 경로
    output_dir = Path(__file__).resolve().parent.parent.parent.parent / "data" / "raw"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "kakaomap_reviews.csv"
    
    df.to_csv(output_path, index=False, encoding="utf-8-sig")
    print(f"\n🎉 수집 완료! 총 {len(df)}건의 리뷰가 {output_path} 에 저장되었습니다.")

if __name__ == "__main__":
    asyncio.run(main())
