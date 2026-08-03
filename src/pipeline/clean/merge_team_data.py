import pandas as pd
import numpy as np
from pathlib import Path
import re
from datetime import datetime

# 데이터가 모여있는 폴더 (채팅창에 올려주신 파일들을 이곳에 모아둔다고 가정)
DATA_DIR = Path("data/raw/team_uploads")
OUT_DIR = Path("data/clean")

def parse_date_and_ym(date_str):
    if pd.isna(date_str): return None, None
    s = str(date_str).strip()
    
    # YYYY-MM-DD
    m = re.search(r'(\d{4})[-.](\d{2})[-.](\d{2})', s)
    if m:
        return s, f"{m.group(1)}-{m.group(2)}"
    
    # "N개월 전", "N년 전" 등 처리 (대략적)
    if "개월 전" in s:
        months = int(re.search(r'\d+', s).group())
        # 기준월(2026-07)에서 차감 (단순 근사)
        # 좀 더 정확한 로직은 Jueun님의 approx_ym을 가져다 쓰면 됨
        return s, "2026-06" # 임시
    
    return s, None

def merge_data():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    
    print("🔄 팀원 수집 데이터 병합 스크립트 시작...")
    
    merged_rows = []
    
    # 1. 선영님 데이터 (v2)
    sy_file = DATA_DIR / "형제돼지국밥_리뷰데이터_v2.csv"
    if sy_file.exists():
        df_sy = pd.read_csv(sy_file)
        for _, row in df_sy.iterrows():
            merged_rows.append({
                "review_id": row.get("review_id"),
                "branch": row.get("branch", "본점"),
                "channel": "GOOGLE", # 추정
                "rating": row.get("rating"),
                "review_text": row.get("review_text"),
                "approx_ym": parse_date_and_ym(row.get("review_date"))[1],
                "date_precision": "월",
                "sentiment_final": row.get("sentiment", "분석불가"),
                "positive_keywords": row.get("positive_keywords"),
                "negative_keywords": row.get("negative_keywords"),
                "mentioned_menu": row.get("mentioned_menu"),
                "visit_origin": row.get("customer_type"), # customer_type -> visit_origin 매핑
            })
        print(f"✅ 선영님 데이터 로드 완료: {len(df_sy)}건")
        
    # 2. 상은님 데이터 (구글, 캐치테이블 등)
    se_files = list(DATA_DIR.glob("*상은*.csv")) + list(DATA_DIR.glob("KakaoTalk*.txt"))
    for f in se_files:
        df_se = pd.read_csv(f)
        count = 0
        for _, row in df_se.iterrows():
            branch = row.get("branch_name", "")
            b_name = "본점"
            if "광안" in branch: b_name = "광안점"
            elif "사직" in branch: b_name = "사직점"
            elif "서면" in branch: b_name = "서면점"
            elif "중앙" in branch or "부산역" in branch: b_name = "중앙동점"
            elif "BIFC" in branch: b_name = "BIFC문현점"
            
            merged_rows.append({
                "review_id": f"SE_{f.stem}_{count}",
                "branch": b_name,
                "channel": "CATCHTABLE" if "Kakao" in f.name else "GOOGLE",
                "rating": row.get("rating"),
                "review_text": row.get("review_text"),
                "approx_ym": parse_date_and_ym(row.get("review_date"))[1],
                "date_precision": "월",
                "sentiment_final": "분석필요", # AI 엔진으로 분석해야 함
                "positive_keywords": "",
                "negative_keywords": "",
                "mentioned_menu": "",
                "visit_origin": row.get("visit_type"),
            })
            count += 1
        print(f"✅ 상은님 데이터 로드 완료 ({f.name}): {count}건")

    # 3. 주은님 데이터 (with approx_ym)
    je_file = DATA_DIR / "1953_review_raw_with_approx_ym.csv"
    if je_file.exists():
        df_je = pd.read_csv(je_file)
        for _, row in df_je.iterrows():
            b_name = row.get("branch_name", "").replace("1953형제돼지국밥", "").strip()
            if not b_name: b_name = "본점"
            
            merged_rows.append({
                "review_id": row.get("review_id"),
                "branch": b_name,
                "channel": row.get("channel"),
                "rating": row.get("rating"),
                "review_text": row.get("review_text"),
                "approx_ym": row.get("approx_ym"),
                "date_precision": "월",
                "sentiment_final": row.get("sentiment", "분석필요"),
                "positive_keywords": "",
                "negative_keywords": "",
                "mentioned_menu": "",
                "visit_origin": "",
            })
        print(f"✅ 주은님 데이터 로드 완료: {len(df_je)}건")

    if not merged_rows:
        print("⚠️ 병합할 데이터가 없습니다. DATA_DIR 경로에 파일을 넣어주세요.")
        return

    res_df = pd.DataFrame(merged_rows)
    
    # 중복 제거 (내용 기반 임시 처리)
    res_df.drop_duplicates(subset=["review_text"], keep="first", inplace=True)
    
    out_file = OUT_DIR / "reviews_merged.csv"
    res_df.to_csv(out_file, index=False, encoding="utf-8-sig")
    print(f"\n🎉 병합 완료! 총 {len(res_df)}건의 리뷰가 {out_file} 에 저장되었습니다.")
    print("👉 다음 단계: 'python src/pipeline/analyze/ai_engine.py' 를 실행하여 감성분석 빈칸을 채워주세요.")

if __name__ == "__main__":
    merge_data()
