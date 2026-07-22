#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
1953형제돼지국밥 온라인 언급 데이터 정제 스크립트
=================================================

수집 원본(네이버 1,915건 + 유튜브 92행)에서 분석 대상만 남긴다.

  입력:  naver_mentions_raw.csv          (수집기 naver_review_collector.py 산출)
         1953_통합분석_대시보드.xlsx      (원천_유튜브 탭 — '1953관련' 판정 플래그 포함)
  출력:  mentions_clean.csv               정제 후 분석 대상 (1,716건)
         mentions_excluded.csv            제외된 건 + 제외사유 (254건)

정제 규칙
---------
[네이버] 다음을 모두 만족하면 유지
  R1. 협찬/광고성 키워드가 제목·본문에 없을 것
      → 협찬, 제공받, 원고료, 체험단, 서포터즈, 소정의, 증정
      (사유: 협찬글은 긍정 편향이 강해 감성 분석을 왜곡)
  R2. 작성일이 분석 기준일(2025-08-01) 이후일 것
      → 최근 12개월. 데이터랩 트렌드 수집 기간과 동일하게 맞춤
      (사유: 오래된 언급은 현재 브랜드 반응을 대표하지 못함)
      ※ 네이버 카페는 작성일이 수집되지 않으므로(전건 결측) 날짜 필터에서 제외하고 유지.
        대신 월별 추이 분석에서는 카페를 뺀다.

[유튜브] 다음을 모두 만족하면 유지
  R3. '1953관련' 판정이 'Y'일 것
      (사유: 검색으로 걸렸으나 타 브랜드 영상인 경우가 있음)
  R4. 댓글 내용이 있을 것
      (사유: 영상 메타행은 반응 데이터가 아님)

검증
----
실행하면 정제 결과가 대시보드 집계와 일치하는지 자동 확인한다.
  네이버카페 1193 / 네이버블로그 486 / 네이버뉴스 7 / 유튜브댓글 30 = 총 1716

주의 / 한계
-----------
- 이 규칙은 기존 대시보드(1,716건)의 산출 결과로부터 **역설계**하여 복원한 것이다.
  4개 채널 건수와 12개월 월별추이가 모두 정확히 일치함을 확인했으나,
  원 작성자가 쓴 규칙과 문자 그대로 동일하다고 보장할 수는 없다.
- 유튜브 '1953관련' 플래그는 수집기가 만들지 않는다(사람/LLM 판정).
  따라서 새로 수집한 유튜브 데이터에는 이 플래그를 먼저 채워야 한다. → TODO
- 감성/테마 분류는 이 스크립트 범위 밖이다. 별도 분석 단계에서 수행한다.

사용법
------
  python3 clean_mentions.py
  python3 clean_mentions.py --naver <경로> --xlsx <경로> --outdir <경로>
"""

import argparse
import sys
from pathlib import Path

import pandas as pd

# ── 정제 파라미터 ──────────────────────────────────────────────
협찬_패턴 = r"협찬|제공받|원고료|체험단|서포터즈|소정의|증정"
분석_기준일 = "2025-08-01"

# 대시보드 집계 (검증 기준값)
기대값 = {"네이버카페": 1193, "네이버블로그": 486, "네이버뉴스": 7, "유튜브댓글": 30}


def 네이버_정제(df: pd.DataFrame):
    """네이버 데이터에 R1·R2 적용. (유지분, 제외분) 반환."""
    d = df.copy()
    d["_텍스트"] = d["제목"].fillna("") + " " + d["본문"].fillna("")
    d["_작성일"] = pd.to_datetime(d["작성일"], errors="coerce")

    is_협찬 = d["_텍스트"].str.contains(협찬_패턴, na=False)
    # 카페는 작성일 결측 → 날짜 필터 면제
    is_기간외 = (d["_작성일"] < 분석_기준일) & d["_작성일"].notna()

    사유 = pd.Series("", index=d.index)
    사유[is_기간외] = f"R2: 분석기간({분석_기준일}~) 이전"
    사유[is_협찬] = "R1: 협찬/광고성 키워드"  # 협찬이 우선 표기

    제외 = is_협찬 | is_기간외
    유지분 = d[~제외].drop(columns=["_텍스트", "_작성일"])
    제외분 = d[제외].drop(columns=["_텍스트", "_작성일"]).assign(제외사유=사유[제외])
    return 유지분, 제외분


def 유튜브_정제(yt: pd.DataFrame):
    """유튜브 데이터에 R3·R4 적용. (유지분, 제외분) 반환."""
    d = yt.copy()
    has_댓글 = d["댓글"].notna() & (d["댓글"].astype(str).str.strip() != "")
    is_관련 = d["1953관련"] == "Y"

    사유 = pd.Series("", index=d.index)
    사유[~has_댓글] = "R4: 댓글 없음(영상 메타행)"
    사유[~is_관련] = "R3: 1953 무관 영상"

    제외 = ~(has_댓글 & is_관련)
    return d[~제외], d[제외].assign(제외사유=사유[제외])


def main() -> int:
    ap = argparse.ArgumentParser(description="1953 온라인 언급 데이터 정제")
    ap.add_argument("--naver", default="naver_mentions_raw.csv")
    ap.add_argument("--xlsx", default="1953_통합분석_대시보드.xlsx")
    ap.add_argument("--outdir", default=".")
    a = ap.parse_args()

    outdir = Path(a.outdir)
    outdir.mkdir(parents=True, exist_ok=True)

    # ── 로드 ──
    네이버 = pd.read_csv(a.naver)
    유튜브 = pd.read_excel(a.xlsx, sheet_name="원천_유튜브")
    print(f"입력: 네이버 {len(네이버):,}건 / 유튜브 {len(유튜브):,}행")

    # ── 정제 ──
    nv_keep, nv_drop = 네이버_정제(네이버)
    yt_keep, yt_drop = 유튜브_정제(유튜브)

    # ── 통합 출력 ──
    yt_norm = pd.DataFrame({
        "지점": "브랜드전체",
        "채널": "유튜브댓글",
        "작성자": None,
        "작성일": yt_keep["댓글작성일"],
        "제목": yt_keep["영상제목"],
        "본문": yt_keep["댓글"],
        "URL": yt_keep["영상URL"],
        "검색키워드": "1953형제돼지국밥",
    })
    clean = pd.concat([nv_keep, yt_norm], ignore_index=True)
    excluded = pd.concat([nv_drop, yt_drop], ignore_index=True)

    clean.to_csv(outdir / "mentions_clean.csv", index=False, encoding="utf-8-sig")
    excluded.to_csv(outdir / "mentions_excluded.csv", index=False, encoding="utf-8-sig")

    # ── 검증 ──
    print("\n채널별 검증 (대시보드 집계 대비)")
    실제 = clean["채널"].value_counts()
    모두일치 = True
    for 채널, 기대 in 기대값.items():
        n = int(실제.get(채널, 0))
        일치 = n == 기대
        모두일치 &= 일치
        print(f"  {채널:8s} {n:5,d} / 기대 {기대:5,d}  {'OK' if 일치 else 'MISMATCH'}")

    총계 = len(clean)
    모두일치 &= 총계 == 1716
    print(f"  {'총계':8s} {총계:5,d} / 기대 {1716:5,d}  {'OK' if 총계 == 1716 else 'MISMATCH'}")
    print(f"\n제외: {len(excluded):,}건")
    print(excluded["제외사유"].value_counts().to_string())

    print(f"\n출력: {outdir/'mentions_clean.csv'} ({len(clean):,}건)")
    print(f"      {outdir/'mentions_excluded.csv'} ({len(excluded):,}건)")

    if not 모두일치:
        print("\n[경고] 대시보드 집계와 불일치. 규칙 또는 원본 데이터가 바뀌었을 수 있음.", file=sys.stderr)
        return 1
    print("\n검증 통과 — 대시보드 집계와 완전히 일치")
    return 0


if __name__ == "__main__":
    sys.exit(main())
