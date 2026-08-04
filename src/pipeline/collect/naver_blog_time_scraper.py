#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
네이버 블로그 원문 스크래핑을 통한 작성 시간(Time) 복원 스크립트
- naver_mentions_raw.csv 를 읽어, 블로그 URL(m.blog.naver.com)에 접속 후
  실제 포스팅 시간(HH:MM)을 파싱하여 '작성일' 컬럼을 업데이트합니다.
"""

import pandas as pd
import requests
from bs4 import BeautifulSoup
from pathlib import Path
import time
import re

def scrape_blog_time(url: str) -> str:
    # 모바일 URL로 변환 (iframe을 피하기 위함)
    m_url = url.replace("blog.naver.com", "m.blog.naver.com")
    headers = {"User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X)"}
    try:
        res = requests.get(m_url, headers=headers, timeout=5)
        soup = BeautifulSoup(res.text, "html.parser")
        time_tags = soup.select(".blog_date, .se_publishDate")
        for t in time_tags:
            # 예: "2026. 8. 3. 0:31" -> "2026-08-03 00:31:00" 등 정규화 가능
            raw_text = t.text.strip()
            # 정규화
            match = re.search(r'(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{1,2}):(\d{2})', raw_text)
            if match:
                y, m, d, h, mn = match.groups()
                return f"{y}-{int(m):02d}-{int(d):02d} {int(h):02d}:{int(mn):02d}:00"
    except Exception as e:
        pass
    return ""

def main():
    raw_csv = Path(__file__).resolve().parent.parent.parent.parent / "data" / "raw" / "naver_mentions_raw.csv"
    if not raw_csv.exists():
        print(f"File not found: {raw_csv}")
        return

    df = pd.read_csv(raw_csv, encoding="utf-8-sig")
    
    print(f"총 {len(df)}건 중 네이버 블로그 시간에 대한 파싱을 시작합니다.")
    updated_count = 0
    
    for idx, row in df.iterrows():
        if row["채널"] == "네이버블로그" and "blog.naver.com" in str(row["URL"]):
            # 이미 시간까지 있는지 확인
            if len(str(row["작성일"])) <= 10:  # "YYYY-MM-DD"
                exact_time = scrape_blog_time(row["URL"])
                if exact_time:
                    df.at[idx, "작성일"] = exact_time
                    updated_count += 1
                time.sleep(0.1)  # 서버 부하 방지
        
        if (idx + 1) % 100 == 0:
            print(f"진행 상황: {idx + 1}/{len(df)} ... (업데이트 {updated_count}건)")

    df.to_csv(raw_csv, index=False, encoding="utf-8-sig")
    print(f"✅ 완료! {updated_count}건의 블로그 작성 시간을 복원하여 저장했습니다.")

if __name__ == "__main__":
    main()
