#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
네이버 블로그 원문 및 작성 시간(Time) 수집 스크립트
- 모바일 페이지(m.blog.naver.com)로 접속하여 iframe 우회
- 작성일 및 전체 본문 텍스트를 추출하여 원본 CSV를 업데이트합니다.
"""

import pandas as pd
import requests
from bs4 import BeautifulSoup
from pathlib import Path
import time
import re

def scrape_blog_data(url: str) -> dict:
    """블로그 URL에서 작성일과 본문 텍스트를 추출하여 딕셔너리로 반환"""
    # 모바일 URL로 변환 (iframe 우회 및 텍스트 추출 용이)
    m_url = url.replace("blog.naver.com", "m.blog.naver.com")
    headers = {"User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X)"}
    
    result = {"time": "", "text": ""}
    try:
        res = requests.get(m_url, headers=headers, timeout=5)
        soup = BeautifulSoup(res.text, "html.parser")
        
        # 1. 작성시간 추출
        time_tags = soup.select(".blog_date, .se_publishDate")
        for t in time_tags:
            raw_text = t.text.strip()
            match = re.search(r'(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{1,2}):(\d{2})', raw_text)
            if match:
                y, m, d, h, mn = match.groups()
                result["time"] = f"{y}-{int(m):02d}-{int(d):02d} {int(h):02d}:{int(mn):02d}:00"
                break
        
        # 2. 본문 텍스트 추출 (네이버 블로그 스마트에디터 및 구형 에디터 대응)
        # 보통 본문은 .se-main-container 에 담겨있음
        content_tags = soup.select(".se-main-container, .post_ct, #viewTypeSelector")
        if content_tags:
            # 텍스트만 추출하고 띄어쓰기 정제
            raw_text = content_tags[0].get_text(separator=" ", strip=True)
            # 연속된 공백이나 줄바꿈을 하나의 공백으로 압축
            result["text"] = re.sub(r'\s+', ' ', raw_text)
            
    except Exception as e:
        pass
    
    return result


def scrape_news_data(url: str) -> dict:
    """네이버 뉴스 URL에서 본문 텍스트를 추출하여 딕셔너리로 반환"""
    headers = {"User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X)"}
    result = {"time": "", "text": ""}
    try:
        res = requests.get(url, headers=headers, timeout=5)
        soup = BeautifulSoup(res.text, "html.parser")
        
        # 1. 작성시간 추출 (네이버 뉴스 모바일 기준)
        time_tag = soup.select_one(".media_end_head_info_datestamp_time")
        if time_tag:
            result["time"] = time_tag.get("data-date-time", time_tag.text.strip())
            
        # 2. 본문 추출
        content_tags = soup.select("#dic_area, #newsct_article")
        if content_tags:
            raw_text = content_tags[0].get_text(separator=" ", strip=True)
            result["text"] = re.sub(r'\s+', ' ', raw_text)
    except Exception as e:
        pass
    
    return result

def main():
    raw_csv = Path(__file__).resolve().parent.parent.parent.parent / "data" / "raw" / "naver_mentions_raw.csv"
    if not raw_csv.exists():
        print(f"File not found: {raw_csv}")
        return

    df = pd.read_csv(raw_csv, encoding="utf-8-sig")
    
    print(f"총 {len(df)}건 중 네이버 블로그 및 뉴스 작성일/전체 원문 수집을 시작합니다.")
    updated_count = 0
    
    for idx, row in df.iterrows():
        channel = row.get("채널")
        url = str(row.get("URL", ""))
        
        if channel in ["네이버블로그", "네이버뉴스"]:
            current_time = str(row.get("작성일", ""))
            current_text = str(row.get("본문", ""))
            
            # 10자 이하면 시간이 없는 것, 150자 미만이면 API 요약본으로 간주하고 원문 수집 대상
            if len(current_time) <= 10 or len(current_text) < 150:
                scraped_data = {"time": "", "text": ""}
                
                if channel == "네이버블로그" and "blog.naver.com" in url:
                    scraped_data = scrape_blog_data(url)
                elif channel == "네이버뉴스" and "news.naver.com" in url:
                    scraped_data = scrape_news_data(url)
                
                is_updated = False
                if scraped_data["time"] and len(current_time) <= 10:
                    df.at[idx, "작성일"] = scraped_data["time"]
                    is_updated = True
                
                if scraped_data["text"]:
                    df.at[idx, "본문"] = scraped_data["text"]
                    is_updated = True
                    
                if is_updated:
                    updated_count += 1
                
                # 본문 수집까지 하므로 트래픽 과부하 방지를 위해 딜레이 약간 증가
                time.sleep(0.5)
        
        if (idx + 1) % 100 == 0:
            print(f"진행 상황: {idx + 1}/{len(df)} ... (업데이트 {updated_count}건)")

    df.to_csv(raw_csv, index=False, encoding="utf-8-sig")
    print(f"✅ 완료! {updated_count}건의 블로그/뉴스 원문을 복원하여 저장했습니다.")

if __name__ == "__main__":
    main()
