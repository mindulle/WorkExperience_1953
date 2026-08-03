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
  R2. (2026-07-29 폐지 — RULES.md §2.2 개정, 멘토 사전 협의 완료)
      과거에는 작성일이 분석 기준일(2025-08-01) 이후인 것만 유지했으나,
      기간 제한을 없앴다. 작성일은 계속 파싱해 남겨두되(월별 추이 분석 등에 사용),
      날짜를 이유로 행을 제외하지는 않는다.
      ※ 네이버 카페는 작성일 자체가 수집되지 않아(전건 결측) 여전히 월별 추이 분석에서는 제외한다.

[유튜브] 다음을 모두 만족하면 유지
  R3. '1953관련' 판정이 'Y'일 것
      (사유: 검색으로 걸렸으나 타 브랜드 영상인 경우가 있음)
  R4. 댓글 내용이 있을 것
      (사유: 영상 메타행은 반응 데이터가 아님)

검증
----
과거에는 정제 결과가 기존 대시보드 집계(네이버카페 1193/블로그 486/뉴스 7/유튜브댓글 30 = 1716)와
일치하는지 자동 확인했다. **이 기준값은 R2(기간 필터) 적용 시점에 역설계한 것이라 R2 폐지 이후에는
더 이상 유효하지 않다** — R2를 없애면 오래된 언급이 더 포함되어 건수가 늘어나는 게 정상이다.
따라서 지금은 채널별 건수를 출력만 하고, 과거 기준값과의 불일치를 오류로 취급하지 않는다.
실제 데이터로 재실행해 새 기준값이 정해지면 이 스크립트의 `기대값`을 갱신하고 엄격 검증을 다시 켤 것.

주의 / 한계
-----------
- 위 규칙은 기존 대시보드(1,716건, R2 적용 시절) 산출 결과로부터 **역설계**하여 복원한 것이다.
  R1·R3·R4와 채널 구성은 여전히 유효하나, R2는 폐지되어 더 이상 적용하지 않는다.
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
# R2(작성일 2025-08-01 이후 필터)는 2026-07-29 RULES.md §2.2 개정으로 폐지됨. 상수는 유지하지 않는다.

# 대시보드 집계 (검증 기준값) — R2 폐지 이전 시절 값. 더 이상 엄격 검증에 쓰지 않음(아래 참고).
기대값_구버전_참고용 = {"네이버카페": 1193, "네이버블로그": 486, "네이버뉴스": 7, "유튜브댓글": 30}


def 네이버_정제(df: pd.DataFrame):
    """네이버 데이터에 R1 적용. (유지분, 제외분) 반환.

    R2(기간 필터)는 폐지되어 더 이상 날짜로 제외하지 않는다. 작성일은 계속 파싱해
    결과에 남기되(월별 추이 등 후속 분석용), 네이버 카페는 작성일 자체가 결측이라
    그런 분석에서는 여전히 제외 대상이다.
    """
    d = df.copy()
    d["_텍스트"] = d["제목"].fillna("") + " " + d["본문"].fillna("")
    d["작성일"] = pd.to_datetime(d["작성일"], errors="coerce")

    is_협찬 = d["_텍스트"].str.contains(협찬_패턴, na=False)

    사유 = pd.Series("", index=d.index)
    사유[is_협찬] = "R1: 협찬/광고성 키워드"

    제외 = is_협찬
    유지분 = d[~제외].drop(columns=["_텍스트"])
    제외분 = d[제외].drop(columns=["_텍스트"]).assign(제외사유=사유[제외])
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
    ap.add_argument("--kakao", default="kakaomap_reviews.csv")
    ap.add_argument("--xlsx", default="1953_통합분석_대시보드.xlsx")
    ap.add_argument("--outdir", default=".")
    a = ap.parse_args()

    outdir = Path(a.outdir)
    outdir.mkdir(parents=True, exist_ok=True)

    # ── 로드 ──
    네이버 = pd.read_csv(a.naver)
    유튜브 = pd.read_excel(a.xlsx, sheet_name="원천_유튜브")
    try:
        카카오 = pd.read_csv(Path(a.kakao))
        print(f"입력: 카카오 {len(카카오):,}건")
    except Exception as e:
        print(f"카카오맵 데이터 로드 실패 (무시됨): {e}")
        카카오 = pd.DataFrame()
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
    if not 카카오.empty:
        # 카카오 스키마 맞추기
        kakao_norm = pd.DataFrame({
            "지점": 카카오.get("지점명", "본점"),
            "채널": 카카오.get("출처", "KakaoMap"),
            "작성자": 카카오.get("작성자", ""),
            "작성일": 카카오.get("작성일자", ""),
            "제목": "",
            "본문": 카카오.get("본문", ""),
            "URL": "",
            "검색키워드": "",
            "별점": 카카오.get("별점", 0.0)
        })
        clean = pd.concat([clean, kakao_norm], ignore_index=True)
    excluded = pd.concat([nv_drop, yt_drop], ignore_index=True)

    clean.to_csv(outdir / "mentions_clean.csv", index=False, encoding="utf-8-sig")
    excluded.to_csv(outdir / "mentions_excluded.csv", index=False, encoding="utf-8-sig")

    # ── 채널별 건수 출력 ──
    # R2(기간 필터) 폐지로 구버전 기대값과는 더 이상 맞지 않는 게 정상이다(오래된 언급이 늘어나므로).
    # 엄격 검증(exit 1)은 하지 않고, 참고용으로 구버전 값과 나란히 보여주기만 한다.
    print("\n채널별 건수 (R2 폐지 이후 — 구버전 기대값은 참고용, 불일치가 정상)")
    실제 = clean["채널"].value_counts()
    for 채널, 구버전 in 기대값_구버전_참고용.items():
        n = int(실제.get(채널, 0))
        print(f"  {채널:8s} {n:5,d}  (R2 폐지 전 구버전 참고값 {구버전:5,d})")

    총계 = len(clean)
    print(f"  {'총계':8s} {총계:5,d}  (R2 폐지 전 구버전 참고값 {1716:5,d})")
    print(f"\n제외: {len(excluded):,}건")
    print(excluded["제외사유"].value_counts().to_string())

    print(f"\n출력: {outdir/'mentions_clean.csv'} ({len(clean):,}건)")
    print(f"      {outdir/'mentions_excluded.csv'} ({len(excluded):,}건)")
    print("\n[안내] 실제 데이터로 재실행해 새 기준값이 정해지면 `기대값_구버전_참고용`을 교체하고")
    print("       엄격 검증(불일치 시 exit 1)을 다시 넣는 것을 권장합니다.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
