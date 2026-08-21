import sys
import pandas as pd
from pathlib import Path
import time

try:
    from camoufox.sync_api import Camoufox
    HAS_CAMOUFOX = True
except ImportError:
    HAS_CAMOUFOX = False

KAKAOMAP_COLUMNS = ["작성자", "작성일자", "별점", "본문", "출처", "지점명"]


def collect_kakaomap(place_id: str, branch_name: str):
    url = f"https://place.map.kakao.com/{place_id}"
    print(f"\n🚀 [{branch_name}] 카카오맵 리뷰 수집 시작: {url}")

    reviews_data = []

    if not HAS_CAMOUFOX:
        print(f"❌ [{branch_name}] camoufox 모듈이 설치되어 있지 않아 이 지점 수집을 건너뜁니다.")
        return reviews_data

    try:
        # Camoufox를 활용한 렌더링 및 봇 탐지 우회
        with Camoufox(headless=True, os="windows", geoip=True) as browser:
            page = browser.new_page()
            page.goto(url, wait_until="networkidle")
            print("✅ 카카오맵 페이지 렌더링 성공 (HTTP 200)")

            time.sleep(3)  # 동적 콘텐츠 로딩 대기

            # 후기 탭이 숨겨져 있을 수 있으므로 후기 탭 클릭 시도 (선택적)
            try:
                review_tab = page.locator("a[data-viewid='menuEvaluation']")
                if review_tab.is_visible():
                    review_tab.click()
                    time.sleep(2)
            except Exception:
                pass

            # '더보기' 버튼을 눌러 리뷰를 모두 전개
            for _ in range(3):
                try:
                    more_btn = page.locator(".evaluation_review .link_more")
                    if more_btn.is_visible():
                        more_btn.click()
                        time.sleep(1)
                    else:
                        break
                except Exception:
                    break

            review_elements = page.locator('ul.list_review > li').all()
            print(f"🔍 발견된 리뷰 요소: {len(review_elements)}개")

            for idx, r in enumerate(review_elements):
                try:
                    author_loc = r.locator('.name_user')
                    if author_loc.is_visible():
                        author = author_loc.inner_text().replace("리뷰어 이름,", "").strip()
                    else:
                        author = f"익명_{idx}"

                    rating_loc = r.locator('.starred_grade .screen_out')
                    try:
                        if rating_loc.count() >= 2:
                            rating = float(rating_loc.nth(1).inner_text().strip())
                        else:
                            rating = 0.0
                    except Exception:
                        rating = 0.0

                    content_loc = r.locator('.desc_review')
                    content = content_loc.inner_text().strip() if content_loc.is_visible() else ""

                    date_loc = r.locator('.txt_date')
                    date = date_loc.inner_text().strip() if date_loc.is_visible() else ""

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
                except Exception:
                    continue

        if not reviews_data:
            print(f"⚠️ [{branch_name}] 페이지는 정상 렌더링됐지만 리뷰를 하나도 파싱하지 못했습니다.")

    except Exception as e:
        print(f"❌ [{branch_name}] 카카오맵 수집 중 오류 발생: {e}")

    return reviews_data


def main():
    target_places = [
        {"id": "16894037", "branch": "경성대본점"},
        # place_id 1447121016의 실제 주소는 "부산 중구 중앙대로81번길 8-1"로
        # 공식 지점(1953bros.com) "#03 중앙점"과 정확히 일치. 예전 "부산역점" 라벨은
        # 오기였음(2026-08-20 정정, google_map_collector.py의 "중앙점"과 통일).
        {"id": "1447121016", "branch": "중앙점"},
        {"id": "1557477270", "branch": "서면점"},
        {"id": "738253595", "branch": "BIFC문현점"},
        {"id": "2096890217", "branch": "광안리점"},
        {"id": "1506445954", "branch": "사직점"},
    ]

    all_reviews = []
    failed_branches = []
    for place in target_places:
        reviews = collect_kakaomap(place["id"], place["branch"])
        if not reviews:
            failed_branches.append(place["branch"])
        all_reviews.extend(reviews)

    df = pd.DataFrame(all_reviews, columns=KAKAOMAP_COLUMNS) if all_reviews else pd.DataFrame(columns=KAKAOMAP_COLUMNS)

    # 저장 경로
    output_dir = Path(__file__).resolve().parent.parent.parent.parent / "data" / "raw"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "kakaomap_reviews.csv"

    df.to_csv(output_path, index=False, encoding="utf-8-sig")

    if not all_reviews:
        print(f"\n❌ 모든 지점({len(target_places)}곳)에서 리뷰를 하나도 수집하지 못했습니다.")
        print("   camoufox 설치 상태나 카카오맵 접근 차단 여부를 확인하세요. (빈 파일은 저장했습니다)")
        return 1

    if failed_branches:
        print(f"\n⚠️ 일부 지점에서 리뷰를 가져오지 못했습니다: {', '.join(failed_branches)}")

    print(f"\n🎉 수집 완료! 총 {len(df)}건의 리뷰가 {output_path.name} 에 저장되었습니다.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
