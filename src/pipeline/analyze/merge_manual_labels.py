#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
수동 검수 결과 병합 스크립트 (AI Engine 대체)
- rule_classifier.py 가 생성한 전체 분석 데이터(reviews_analyzed.csv)에
- 팀원들이 엑셀/스프레드시트 등으로 직접 수정한 불확실/혼합 데이터(reviews_uncertain.csv)의 결과값을 덮어씁니다.
"""

import pandas as pd
from pathlib import Path

# ── 경로 설정 ─────────────────────────────────────────────────────────────────
DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data" / "clean"
MAIN_CSV = DATA_DIR / "reviews_analyzed.csv"         # 전체 데이터 (규칙기반 완료)
MANUAL_CSV = DATA_DIR / "reviews_uncertain.csv"      # 팀원 수동 검수 완료 데이터
OUTPUT_CSV = DATA_DIR / "reviews_analyzed_final.csv" # 최종 병합 완료된 산출물

def main():
    if not MAIN_CSV.exists():
        print(f"❌ 원본 파일이 없습니다: {MAIN_CSV}")
        return
    if not MANUAL_CSV.exists():
        print(f"❌ 수동 검수 파일이 없습니다: {MANUAL_CSV}")
        return

    print(f"[1/3] 원본 데이터 로드 중: {MAIN_CSV.name}")
    main_df = pd.read_csv(MAIN_CSV, encoding="utf-8-sig")
    
    print(f"[2/3] 수동 검수 데이터 로드 중: {MANUAL_CSV.name}")
    manual_df = pd.read_csv(MANUAL_CSV, encoding="utf-8-sig")

    if "URL" not in main_df.columns or "URL" not in manual_df.columns:
        print("❌ 'URL' 컬럼이 없어 데이터를 병합할 수 없습니다.")
        return

    # URL을 기준으로 데이터 덮어쓰기를 위해 인덱스 설정
    main_df.set_index("URL", inplace=True)
    manual_df.set_index("URL", inplace=True)

    # 수동으로 수정될 수 있는 타겟 컬럼들
    target_columns = [
        "sentiment_final", 
        "customer_type", 
        "visit_origin", 
        "mentioned_menu",
        "positive_keywords",
        "negative_keywords"
    ]

    print("[3/3] 수동 검수 결과 병합 중...")
    update_count = 0
    for url, row in manual_df.iterrows():
        # 원본 데이터에 존재하는 URL인 경우에만 덮어쓰기
        if url in main_df.index:
            is_updated = False
            for col in target_columns:
                if col in manual_df.columns and col in main_df.columns:
                    # 빈 값이 아닌 경우에만 덮어쓰기 (NaN 체크)
                    if pd.notna(row[col]):
                        main_df.at[url, col] = row[col]
                        is_updated = True
            
            if is_updated:
                # 수동 검수로 값이 확정되었음을 표시
                main_df.at[url, "confidence"] = "manual_reviewed"
                update_count += 1

    # 인덱스 원복
    main_df.reset_index(inplace=True)

    # 결과 저장
    main_df.to_csv(OUTPUT_CSV, index=False, encoding="utf-8-sig")
    print(f"✅ 병합 완료! 총 {update_count}건의 수동 검수 결과가 반영되었습니다.")
    print(f"💾 최종 결과 저장됨: {OUTPUT_CSV}")

if __name__ == "__main__":
    main()
