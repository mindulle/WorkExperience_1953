#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
구글맵 리뷰 수집기

- 기본(현재) 경로: Google Places API (Place Details)
  구글 정책상 "가장 관련성 높은" 리뷰 최대 5개까지만 제공합니다. API 키가 없으면
  시연(PoC)용 다국어 mock 리뷰 5개로 대체합니다. → 지금 단계(일경험 프로젝트)엔 충분.

- 핸드오프(기업 이관) 시 경로: Google Business Profile API
  전체 리뷰를 페이지네이션으로 가져올 수 있지만, "API 등급을 올리면" 되는 게 아니라
  ①각 지점이 회사/사장님 명의 Business Profile의 Owner·Manager로 등록되어 있고
  ②그 계정으로 OAuth 인증을 받아야만 접근 가능합니다. (자세한 비교는
  docs/collection-pipeline-feasibility.md의 "D. 구글 공식 Places API" 참고)
  전환 방법: 아래 GOOGLE_MAPS_REVIEW_PROVIDER="business_profile"로 바꾸고
  get_reviews_via_business_profile()을 구현하면 됩니다 (다른 코드 변경 불필요).
"""

import os
import requests
import pandas as pd
from pathlib import Path
from datetime import datetime


# 공식 홈페이지(1953bros.com) 매장 안내 기준(2026-08) 실제 Google Maps 등록명.
# 주의: "본점"은 Google Maps에 "1953형제돼지국밥" 브랜드명이 아니라 옛 상호명
# "형제국밥"으로 등록되어 있음(경성대 상권, 용소로13번길 29-1). 그 외 지점도
# 코드상 라벨과 실제 등록명의 "점/동" 접미사가 달라 정확히 맞춰야 검색됨.
BRANCHES = [
    "형제국밥",                          # 본점(경성대) — Google 등록명이 다름
    "1953형제돼지국밥 서면점",
    "1953형제돼지국밥 광안리",           # "광안리점"이 아니라 "광안리"로 등록됨
    "1953형제돼지국밥 중앙점",           # "중앙동점"이 아니라 "중앙점"으로 등록됨
    "1953형제돼지국밥 사직점",
    "1953형제돼지국밥 벨버디어점",       # 경남 거제 한화리조트 벨버디어점 (기존 누락)
    "1953형제돼지국밥 BIFC문현점"
]

# CSV 등 출력물에 표시할 사람이 읽기 좋은 지점명(검색 쿼리와 별개).
BRANCH_DISPLAY_NAMES = {
    "형제국밥": "본점(경성대)",
    "1953형제돼지국밥 서면점": "서면점",
    "1953형제돼지국밥 광안리": "광안리점",
    "1953형제돼지국밥 중앙점": "중앙점",
    "1953형제돼지국밥 사직점": "사직점",
    "1953형제돼지국밥 벨버디어점": "벨버디어점",
    "1953형제돼지국밥 BIFC문현점": "BIFC문현점",
}

# (핸드오프 후 사용) 지점명 -> Business Profile locationId 매핑.
# accounts.locations.list API로 각 지점의 locationId를 조회해 채워 넣으세요.
BRANCH_LOCATION_IDS = {
    "형제국밥": "",
    "1953형제돼지국밥 서면점": "",
    "1953형제돼지국밥 광안리": "",
    "1953형제돼지국밥 중앙점": "",
    "1953형제돼지국밥 사직점": "",
    "1953형제돼지국밥 벨버디어점": "",
    "1953형제돼지국밥 BIFC문현점": "",
}

def get_mock_foreign_reviews(branch):
    """API 키가 없을 때 시연(PoC)용으로 제공되는 다국어 샘플 리뷰 5개"""
    return [
        {"author_name": "John Doe", "rating": 5, "text": "Best pork soup in Busan! The meat was incredibly tender and the broth was rich. Highly recommended for tourists. (부산 최고의 돼지국밥! 고기가 부드러워요)", "time": 1718000000},
        {"author_name": "Tanaka Yuki", "rating": 4, "text": "スープがとても濃厚で美味しいです。キムチと一緒に食べると最高！少し辛いですが、韓国の味が楽しめました。(수프가 진하고 맛있습니다. 김치와 먹으면 최고!)", "time": 1718100000},
        {"author_name": "Wang Wei", "rating": 5, "text": "非常地道的釜山美食！猪肉汤饭味道浓郁，价格也很实惠。服务员对外国人很友好。(아주 정통 부산 음식! 가격도 저렴하고 외국인에게 친절합니다.)", "time": 1718200000},
        {"author_name": "Sarah Smith", "rating": 3, "text": "The food was good, but the menu didn't have English translations. It was hard to order. (음식은 좋았지만 영어 메뉴판이 없어서 주문하기 어려웠어요.)", "time": 1718300000},
        {"author_name": "Li Na", "rating": 4, "text": "汤底很棒，但是排队等了太久。建议大家避开饭点来。(국물은 훌륭하지만 웨이팅이 너무 깁니다. 식사 시간은 피하세요.)", "time": 1718400000}
    ]

def search_place_id(api_key: str, query: str) -> str:
    url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
    params = {"query": query, "key": api_key, "language": "ko"}
    res = requests.get(url, params=params)
    if res.status_code == 200:
        results = res.json().get("results", [])
        if results:
            return results[0]["place_id"]
    return None

def get_place_reviews(api_key: str, place_id: str) -> list:
    url = "https://maps.googleapis.com/maps/api/place/details/json"
    params = {
        "place_id": place_id,
        "fields": "name,reviews",
        "key": api_key,
        "language": "ko",
        "reviews_sort": "newest"
    }
    res = requests.get(url, params=params)
    if res.status_code == 200:
        return res.json().get("result", {}).get("reviews", [])
    return []

def get_reviews_via_business_profile(branch: str) -> list:
    """
    [핸드오프 전용 · 미구현] Google Business Profile API로 지점당 전체 리뷰를 가져옵니다.
    (엔드포인트: GET mybusiness.googleapis.com/v4/accounts/{accountId}/locations/{locationId}/reviews)

    사전 준비물:
      1. 회사/사장님 명의 Google 계정이 각 지점 Business Profile의 Owner 또는 Manager로 등록
      2. 위 계정으로 Business Profile API OAuth 접근 신청·승인 (Google Cloud Console)
      3. 최초 1회 OAuth 로그인으로 refresh token 발급 (accounts.locations.list로 locationId 확인 겸용)
      4. BRANCH_LOCATION_IDS에 지점별 locationId 채우기
      5. .env에 GOOGLE_BUSINESS_PROFILE_* 값 채우고 GOOGLE_MAPS_REVIEW_PROVIDER="business_profile"로 전환

    준비가 끝나면 이 함수 본문을 구현하세요(OAuth 토큰 획득 → reviews.list 페이지네이션 순회 →
    Places API와 동일한 dict 형태 {author_name, rating, text, time} 리스트 반환). main()의 분기
    로직은 이미 준비되어 있어 다른 코드는 손댈 필요 없습니다.
    """
    raise NotImplementedError(
        "Business Profile API 미구현. 이 함수의 docstring과 "
        "docs/collection-pipeline-feasibility.md의 'D. 구글 공식 Places API' 절 참고."
    )

def main():
    api_key = os.environ.get("GOOGLE_MAPS_API_KEY")
    is_mock = not api_key or api_key == "여기에_GOOGLE_MAPS_API_KEY_입력"
    provider = os.environ.get("GOOGLE_MAPS_REVIEW_PROVIDER", "places").strip().lower()

    if provider == "business_profile":
        print("🚀 구글맵 리뷰 수집 시작 (Business Profile API - 지점당 전체 리뷰)")
    elif is_mock:
        print("⚠️ GOOGLE_MAPS_API_KEY가 설정되지 않아, 구글맵 다국어(외국인) 샘플 데이터를 주입합니다.")
    else:
        print("🚀 구글맵 리뷰 수집 시작 (Places API - 지점당 최대 5개, 핸드오프 시 Business Profile API로 전환 가능)")
    
    all_reviews = []
    
    for branch in BRANCHES:
        if provider == "business_profile":
            reviews = get_reviews_via_business_profile(branch)
            print(f"✅ [{branch}] 리뷰 {len(reviews)}개 수집 완료 (Business Profile API)")
        elif is_mock:
            reviews = get_mock_foreign_reviews(branch)
            print(f"✅ [{branch}] 다국어 샘플 리뷰 5개 생성 완료")
        else:
            place_id = search_place_id(api_key, branch)
            if not place_id:
                print(f"⚠️ [{branch}] 검색 결과가 없습니다.")
                continue
            reviews = get_place_reviews(api_key, place_id)
            print(f"✅ [{branch}] 리뷰 {len(reviews)}개 수집 완료 (구글 API 최대 5개 제한)")
        
        for r in reviews:
            all_reviews.append({
                "지점명": BRANCH_DISPLAY_NAMES.get(branch, branch),
                "출처": "GoogleMap",
                "작성자": r.get("author_name", ""),
                "별점": r.get("rating", 0),
                "본문": r.get("text", "").strip(),
                "작성일자": pd.to_datetime(r.get("time", 0), unit='s').strftime('%Y-%m-%d') if r.get("time") else datetime.today().strftime('%Y-%m-%d')
            })
            
    df = pd.DataFrame(all_reviews)
    if not df.empty:
        output_file = "googlemap_reviews.csv"
        df.to_csv(output_file, index=False, encoding="utf-8-sig")
        print(f"\n총 {len(df)}개 구글맵 리뷰 수집 완료 -> {output_file}")
    else:
        print("❌ 수집된 구글맵 리뷰가 없습니다.")

if __name__ == "__main__":
    main()
