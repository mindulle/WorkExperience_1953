#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
네이버 검색 오픈 API 기반 블로그·뉴스 언급 수집기
- 1953형제돼지국밥 지점별 온라인 언급을 수집해 표준 원천(raw) CSV로 저장한다.
- 공식 API만 사용(크롤링 아님). 1일 25,000회 한도, 초당 약 10건.

[준비]
1. https://developers.naver.com → 애플리케이션 등록 → '검색' API 추가 → Client ID/Secret 발급
2. 아래 CLIENT_ID / CLIENT_SECRET 에 붙여넣기 (또는 환경변수 NAVER_ID / NAVER_SECRET 사용)
3. 실행:  python3 naver_review_collector.py

[주의]
- 이 스크립트는 '블로그·뉴스에서 매장을 언급한 글'을 모은다(매장 내부 리뷰 아님).
- 개인정보(작성자 실명 등)는 수집하지 않는다. 블로거 닉네임만 저장.
- 결과는 원천 데이터이며, 감성·테마 코딩은 review-insight 스킬로 별도 수행한다.
"""

import os
import csv
import html
import re
import sys
import time
import json
import datetime as dt
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError


def _load_env_file():
    """키를 .env 파일에서 읽어 환경변수로 올린다(의존성 없음).
    우선순위: 이미 설정된 환경변수 > NAVER_ENV_FILE 경로 > 스크립트 폴더의 .env
    보안: .env 는 공유·동기화되는 폴더에 두지 말 것.
    """
    candidates = []
    if os.environ.get("NAVER_ENV_FILE"):
        candidates.append(Path(os.environ["NAVER_ENV_FILE"]))
    candidates.append(Path(__file__).resolve().parent / ".env")
    for path in candidates:
        if not path.is_file():
            continue
        if path.parent.name == "1953_일경험프로젝트_통합자료" or "통합자료" in str(path):
            print(f"⚠ 경고: .env가 공유 폴더 안에 있습니다({path}). 키 유출 위험 — 폴더 밖으로 옮기세요.")
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
        break


_load_env_file()

# ── 설정 ─────────────────────────────────────────────
# 키는 환경변수(NAVER_ID/NAVER_SECRET) 또는 .env 파일에서 읽는다. 코드에 직접 넣지 말 것.
CLIENT_ID = os.environ.get("NAVER_ID", "여기에_CLIENT_ID")
CLIENT_SECRET = os.environ.get("NAVER_SECRET", "여기에_CLIENT_SECRET")

# 지점별 검색어 (브랜드 + 지점). 필요 시 수정/추가.
BRANCHES = {
    "브랜드전체": ["1953형제돼지국밥"],
    "경성대본점": ["1953형제돼지국밥 경성대", "1953형제돼지국밥 본점"],
    "광안리점": ["1953형제돼지국밥 광안리"],
    "부산역점": ["1953형제돼지국밥 부산역", "1953형제돼지국밥 중앙점"],
    "서면점": ["1953형제돼지국밥 서면"],
    "사직점": ["1953형제돼지국밥 사직"],
}

SOURCES = ["blog", "news", "cafearticle"]  # 블로그·뉴스·카페글
DISPLAY = 100                # 요청당 최대 100
MAX_START = 1000             # start 최대 1000 (즉 종류·검색어당 최대 1000건)
SORT = "date"               # date=최신순, sim=정확도순
OUTFILE = "naver_mentions_raw.csv"
REQUEST_PAUSE = 0.2          # 초당 약 10건 한도 → 여유 있게 0.2초
# ────────────────────────────────────────────────────

TAG_RE = re.compile(r"<[^>]+>")

def clean(text: str) -> str:
    """HTML 태그·엔티티 제거."""
    if not text:
        return ""
    return html.unescape(TAG_RE.sub("", text)).strip()

def api_call(source: str, query: str, start: int):
    url = (f"https://openapi.naver.com/v1/search/{source}.json"
           f"?query={quote(query)}&display={DISPLAY}&start={start}&sort={SORT}")
    req = Request(url)
    req.add_header("X-Naver-Client-Id", CLIENT_ID)
    req.add_header("X-Naver-Client-Secret", CLIENT_SECRET)
    with urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))

def parse_date(source: str, item: dict) -> str:
    """블로그 postdate(YYYYMMDD) / 뉴스 pubDate(RFC822) → YYYY-MM-DD."""
    if source == "blog":
        d = item.get("postdate", "")
        return f"{d[:4]}-{d[4:6]}-{d[6:8]}" if len(d) == 8 else ""
    pub = item.get("pubDate", "")
    try:
        return dt.datetime.strptime(pub, "%a, %d %b %Y %H:%M:%S %z").strftime("%Y-%m-%d")
    except Exception:
        return ""

def collect():
    if "여기에_" in CLIENT_ID or "여기에_" in CLIENT_SECRET:
        sys.exit("먼저 CLIENT_ID / CLIENT_SECRET 를 설정하세요 (코드 상단 또는 환경변수 NAVER_ID/NAVER_SECRET).")

    today = dt.date.today().isoformat()
    seen = set()          # URL 기준 중복 제거
    rows = []

    for branch, queries in BRANCHES.items():
        for query in queries:
            for source in SOURCES:
                start = 1
                while start <= MAX_START:
                    try:
                        data = api_call(source, query, start)
                    except HTTPError as e:
                        print(f"[HTTP {e.code}] {source}/{query} start={start} → 중단")
                        break
                    except URLError as e:
                        print(f"[네트워크 오류] {e} → 5초 후 재시도")
                        time.sleep(5)
                        continue

                    items = data.get("items", [])
                    if not items:
                        break

                    for it in items:
                        link = it.get("link", "")
                        if not link or link in seen:
                            continue
                        seen.add(link)
                        rows.append({
                            "지점": branch,
                            "채널": {"blog":"네이버블로그","news":"네이버뉴스","cafearticle":"네이버카페"}[source],
                            "작성자": clean(it.get("bloggername") or it.get("cafename") or ""),  # 뉴스는 공란
                            "작성일": parse_date(source, it),
                            "제목": clean(it.get("title", "")),
                            "본문": clean(it.get("description", "")),
                            "URL": link,
                            "수집일": today,
                            "검색키워드": query,
                        })

                    start += DISPLAY
                    time.sleep(REQUEST_PAUSE)

                print(f"  · {branch} / {source} / '{query}' 누적 {len(rows)}건")

    # 저장
    fields = ["지점", "채널", "작성자", "작성일", "제목", "본문", "URL", "수집일", "검색키워드"]
    with open(OUTFILE, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)

    print(f"\n완료: {len(rows)}건 → {OUTFILE}")
    print("다음 단계: 이 CSV를 review-insight 스킬에 넣어 감성·테마·소구점 코딩을 수행하세요.")

if __name__ == "__main__":
    collect()
