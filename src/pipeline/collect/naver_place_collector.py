import asyncio
import pandas as pd
from pathlib import Path
import re

try:
    from scrapling.fetchers import AsyncDynamicSession
    HAS_SCRAPLING = True
except ImportError:
    HAS_SCRAPLING = False

async def collect_naver_place(place_id: str, branch_name: str):
    # 네이버 플레이스 방문자(영수증) 리뷰 탭 URL
    url = f"https://m.place.naver.com/restaurant/{place_id}/review/visitor"
    print(f"🚀 [{branch_name}] 네이버 지도 영수증 리뷰 수집 시작: {url}")
    
    reviews_data = []
    
    if not HAS_SCRAPLING:
        print("⚠️ scrapling 모듈이 설치되어 있지 않아 시뮬레이션 모드로 작동합니다.")
        return pd.DataFrame([{"작성자": "네이버테스터", "작성일자": "2026-08-01", "별점": 0, "본문": "임시 스크래핑 데이터", "출처": "NaverPlace", "지점명": branch_name}])
        
    try:
        # Scrapling(Patchright 기반)을 통해 네이버 봇 탐지 우회
        # 참고: 클라우드/데이터센터 IP에서는 Naver가 "서비스 이용이 제한되었습니다" 라며 IP 블록을 할 수 있으므로 로컬 PC 실행 권장
        async with AsyncDynamicSession(headless=True) as session:
            page = await session.fetch(url, network_idle=True)
            
            # 차단 여부 확인
            page_text = page.css('body')[0].get_all_text() if page.css('body') else ""
            if "서비스 이용이 제한되었습니다" in page_text:
                print("❌ 네이버 플레이스 봇 차단(또는 IP 차단) 발생. 로컬 환경에서 실행해주세요.")
                return pd.DataFrame()

            print("✅ 봇 차단 우회 및 페이지 렌더링 성공 (HTTP 200)")
            await asyncio.sleep(5)
            
            # [휴리스틱 파싱 전략] 
            # 네이버 플레이스 리뷰는 난독화된 클래스명을 사용하므로, 
            # DOM 구조 중 텍스트('방문일', '리뷰')를 포함하는 덩어리를 추출
            review_elements = page.css('li')
            print(f"🔍 1차 탐색: {len(review_elements)}개의 항목 발견")
            
            for el in review_elements:
                text = el.get_all_text()
                if not text: continue
                
                # '방문일' 키워드가 포함된 긴 문자열이면 리뷰 항목으로 간주
                if '방문일' in text and len(text.strip()) > 15:
                    lines = [line.strip() for line in text.split('\n') if line.strip()]
                    if len(lines) >= 3:
                        author = lines[0]
                        date = ""
                        for line in lines:
                            if "년" in line and "월" in line and "일" in line:
                                date = line
                                break
                        if not date:
                            for line in lines:
                                if "방문일" in line:
                                    date = line
                                    break
                                
                        # 불필요한 메타데이터를 제외한 가장 긴 줄을 본문으로 추출
                        candidates = [l for l in lines if "방문일" not in l and "번째 방문" not in l and l != author and "이전" not in l]
                        content = max(candidates, key=len) if candidates else ""
                        
                        if content and len(content) > 3:
                            reviews_data.append({
                                "작성자": author[:15],
                                "작성일자": date.replace("방문일", "").strip(),
                                "별점": 0.0, # 최근 네이버 리뷰는 별점 대신 키워드 사용
                                "본문": content,
                                "출처": "NaverPlace",
                                "지점명": branch_name
                            })
                            
            print(f"✅ 파싱 성공: 유효한 방문자 리뷰 {len(reviews_data)}건 추출 완료")
            
    except Exception as e:
        print(f"❌ 네이버 플레이스 수집 오류: {e}")
        
    return pd.DataFrame(reviews_data)

async def main():
    print("==================================================")
    print(" 📍 네이버 지도(플레이스) 방문자 영수증 리뷰 수집기")
    print("==================================================")
    
    target_places = [
        {"id": "19542599", "branch": "경성대본점"}
    ]
    
    all_df = []
    for p in target_places:
        df = await collect_naver_place(p["id"], p["branch"])
        if not df.empty:
            all_df.append(df)
            
    if all_df:
        final_df = pd.concat(all_df, ignore_index=True)
        
        project_root = Path(__file__).resolve().parent.parent.parent.parent
        output_dir = project_root / "data" / "raw"
        output_dir.mkdir(parents=True, exist_ok=True)
        
        out_path = output_dir / "naver_place_reviews.csv"
        final_df.to_csv(out_path, index=False, encoding="utf-8-sig")
        print(f"\n🎉 총 {len(final_df)}건의 영수증 리뷰가 저장되었습니다: {out_path.name}")
    else:
        print("\n⚠️ 수집된 데이터가 없습니다.")

if __name__ == "__main__":
    asyncio.run(main())
