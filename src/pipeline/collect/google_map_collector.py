#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
구글맵 공식 리뷰 수집기 (Google Places API)
- 구글의 공식 API를 사용하여 합법적으로 리뷰를 수집합니다.
- 단, 구글 정책상 Place Details API는 "가장 관련성 높은 리뷰" 최대 5개까지만 제공합니다.
- (수백 개의 전체 리뷰를 가져오려면 Google Business Profile API 권한이 필요합니다.)
"""

import os
import requests
import pandas as pd
from pathlib import Path

# 검색할 지점 목록
BRANCHES = [
    "1953형제돼지국밥 본점",
    "1953형제돼지국밥 서면점",
    "1953형제돼지국밥 광안리점",
    "1953형제돼지국밥 중앙동점",
    "1953형제돼지국밥 사직점",
    "1953형제돼지국밥 BIFC문현점"
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

def main():
    api_key = os.environ.get("GOOGLE_MAPS_API_KEY")
    if not api_key or api_key == "여기에_GOOGLE_MAPS_API_KEY_입력":
        print("⏭️ 스킵: GOOGLE_MAPS_API_KEY 환경변수가 없어 구글맵 수집을 건너뜁니다.")
        print("    (샘플 5개를 보려면 .env 파일에 키를 추가하세요)")
        return

    print("🚀 구글맵 리뷰 수집 시작 (Places API - 지점당 최대 5개)")
    
    all_reviews = []
    
    for branch in BRANCHES:
        place_id = search_place_id(api_key, branch)
        if not place_id:
            print(f"⚠️ [{branch}] 검색 결과가 없습니다.")
            continue
            
        reviews = get_place_reviews(api_key, place_id)
        print(f"✅ [{branch}] 리뷰 {len(reviews)}개 수집 완료 (구글 API 최대 5개 제한)")
        
        for r in reviews:
            all_reviews.append({
                "지점명": branch.replace("1953형제돼지국밥 ", ""),
                "출처": "GoogleMap",
                "작성자": r.get("author_name", ""),
                "별점": r.get("rating", 0),
                "본문": r.get("text", "").strip(),
                "작성일자": pd.to_datetime(r.get("time", 0), unit='s').strftime('%Y-%m-%d') if r.get("time") else ""
            })
            
    df = pd.DataFrame(all_reviews)
    if not df.empty:
        # data/raw 에 csv로 저장
        output_file = "googlemap_reviews.csv"
        df.to_csv(output_file, index=False, encoding="utf-8-sig")
        print(f"\n총 {len(df)}개 구글맵 리뷰 수집 완료 -> {output_file}")
    else:
        print("❌ 수집된 구글맵 리뷰가 없습니다.")

if __name__ == "__main__":
    main()
