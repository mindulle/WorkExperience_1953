import pandas as pd
from pathlib import Path
import time

try:
    from camoufox.sync_api import Camoufox
    HAS_CAMOUFOX = True
except ImportError:
    HAS_CAMOUFOX = False

# [설정] 프록시 사용 여부
USE_PROXY = False
PROXY_HOST = "100.82.184.115"
PROXY_PORT = "8888"
PROXY_URL = f"http://{PROXY_HOST}:{PROXY_PORT}"

def collect_naver_place(place_id: str, branch_name: str, max_pages=3):
    url = f"https://m.place.naver.com/restaurant/{place_id}/review/visitor"
    print(f"\n🚀 [{branch_name}] 네이버 지도 영수증 리뷰 수집 시작: {url}")
    
    if not HAS_CAMOUFOX:
        print("⚠️ camoufox 모듈이 설치되어 있지 않아 빈 데이터를 반환합니다.")
        return pd.DataFrame(), pd.DataFrame()
        
    if USE_PROXY:
        print(f"   - 스텔스 브라우저 시작 중... (Proxy: {PROXY_URL} 경유)")
        browser_kwargs = {"headless": True, "os": "windows", "proxy": {"server": PROXY_URL}, "geoip": True}
    else:
        print(f"   - 스텔스 브라우저 시작 중... (로컬 IP 직접 연결)")
        browser_kwargs = {"headless": True, "os": "windows", "geoip": True}
        
    collected_reviews = []
    collected_keywords = []
    seen_review_ids = set()

    def add_review(item, state_dict=None):
        if not item or "id" not in item:
            return
        if item["id"] not in seen_review_ids:
            seen_review_ids.add(item["id"])
            
            # 작성자 닉네임 파싱
            nickname = "알 수 없음"
            author_data = item.get("author", {})
            if isinstance(author_data, dict):
                if "__ref" in author_data and state_dict:
                    ref_id = author_data["__ref"]
                    nickname = state_dict.get(ref_id, {}).get("nickname", "알 수 없음")
                else:
                    nickname = author_data.get("nickname", "알 수 없음")

            body = item.get("body", "")
            if body:
                body = body.replace("\n", " ").strip()
            
            collected_reviews.append({
                "작성자": nickname,
                "작성일자": item.get("created", ""),
                "별점": item.get("rating", 0.0) if item.get("rating") else 0.0,
                "본문": body,
                "출처": "NaverPlace",
                "지점명": branch_name
            })

    try:
        with Camoufox(**browser_kwargs) as browser:
            page = browser.new_page()
            
            # GraphQL 응답 인터셉터
            def handle_response(response):
                if "graphql" in response.url and response.status == 200:
                    try:
                        data = response.json()
                        if isinstance(data, list):
                            data = data[0]
                        if "visitorReviews" in data.get("data", {}):
                            items = data["data"]["visitorReviews"]["items"]
                            for item in items:
                                add_review(item)
                    except Exception:
                        pass

            page.on("response", handle_response)
            page.goto(url, wait_until="networkidle")
            time.sleep(3)
            
            print("   - 초기 리뷰 및 키워드 통계 추출 중...")
            state = page.evaluate("window.__APOLLO_STATE__")
            if state:
                # 1. 텍스트 리뷰 추출
                for key, value in state.items():
                    if key.startswith("VisitorReview:"):
                        add_review(value, state_dict=state)
                
                # 2. 키워드 투표(이런 점이 좋았어요) 통계 추출
                stats_node = state.get(f"VisitorReviewStatsResult:{place_id}", {})
                keyword_details = stats_node.get("analysis", {}).get("votedKeyword", {}).get("details", [])
                
                for kw in keyword_details:
                    display_name = kw.get("displayName")
                    count = kw.get("count", 0)
                    if display_name:
                        collected_keywords.append({
                            "지점명": branch_name,
                            "키워드": display_name,
                            "선택인원": count,
                            "출처": "NaverPlace"
                        })
            
            print(f"   - '더보기' 버튼 클릭하여 추가 리뷰 수집 중... (최대 {max_pages}페이지 분량)")
            for _ in range(max_pages - 1):
                more_button = page.locator("a:has-text('더보기')").last
                if more_button.is_visible():
                    more_button.click()
                    time.sleep(2)
                else:
                    break
                    
    except Exception as e:
        print(f"❌ 네이버 플레이스 수집 오류: {e}")
        
    print(f"✅ 파싱 완료: [{branch_name}] 리뷰 {len(collected_reviews)}건, 키워드 통계 {len(collected_keywords)}건 추출")
    return pd.DataFrame(collected_reviews), pd.DataFrame(collected_keywords)

def main():
    print("==================================================")
    print(" 📍 네이버 지도(플레이스) 방문자 영수증 리뷰 수집기")
    print("==================================================")
    
    target_places = [
        # 지점명은 kakaomap_collector.py / google_map_collector.py와 통일
        # (이전에는 "광안리본점"이라 macro_insight.py의 지점별 그룹화가 어긋났음)
        {"id": "1959901593", "branch": "광안리점"},
        {"id": "19542599", "branch": "경성대본점"}
    ]
    
    all_reviews_df = []
    all_keywords_df = []
    
    for p in target_places:
        r_df, k_df = collect_naver_place(p["id"], p["branch"], max_pages=3)
        if not r_df.empty:
            all_reviews_df.append(r_df)
        if not k_df.empty:
            all_keywords_df.append(k_df)
            
    project_root = Path(__file__).resolve().parent.parent.parent.parent
    output_dir = project_root / "data" / "raw"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # 리뷰 데이터 저장
    if all_reviews_df:
        final_reviews = pd.concat(all_reviews_df, ignore_index=True)
        reviews_path = output_dir / "naver_place_reviews.csv"
        final_reviews.to_csv(reviews_path, index=False, encoding="utf-8-sig")
        print(f"\n🎉 총 {len(final_reviews)}건의 영수증 리뷰가 저장되었습니다: {reviews_path.name}")
    else:
        print("\n⚠️ 수집된 리뷰 데이터가 없습니다.")

    # 키워드 데이터 저장
    if all_keywords_df:
        final_keywords = pd.concat(all_keywords_df, ignore_index=True)
        keywords_path = output_dir / "naver_place_keywords.csv"
        final_keywords.to_csv(keywords_path, index=False, encoding="utf-8-sig")
        print(f"🎉 총 {len(final_keywords)}건의 키워드 통계가 저장되었습니다: {keywords_path.name}")
    else:
        print("⚠️ 수집된 키워드 통계 데이터가 없습니다.")

if __name__ == "__main__":
    main()
