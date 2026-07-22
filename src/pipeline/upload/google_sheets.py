#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
분석 결과물 ➔ Google Sheets 자동 업로드 스크립트
=================================================
로컬에 저장된 CSV 데이터들을 Google Sheets의 각 탭(시트)으로 완벽하게 분리하여 전송합니다.
"""

import os
import sys
import pandas as pd
from pathlib import Path
from google.oauth2.service_account import Credentials
import gspread

# 경로 설정
PIPELINE_DIR = Path(__file__).parent.parent.resolve()
PROJECT_ROOT = PIPELINE_DIR.parent.parent.resolve()
CLEAN_DATA_DIR = PROJECT_ROOT / "data" / "clean"
RAW_DATA_DIR = PROJECT_ROOT / "data" / "raw"

# 환경변수 로드 (.env 처리)
if os.environ.get("NAVER_ENV_FILE") and Path(os.environ["NAVER_ENV_FILE"]).exists():
    with open(os.environ["NAVER_ENV_FILE"], "r", encoding="utf-8") as f:
        for ln in f:
            ln = ln.strip()
            if ln and not ln.startswith("#") and "=" in ln:
                k, v = ln.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

GOOGLE_CREDENTIALS_PATH = os.environ.get("GOOGLE_CREDENTIALS_PATH")
GOOGLE_SHEET_URL = os.environ.get("GOOGLE_SHEET_URL")

# 분리하여 업로드할 시트 매핑 (파일명 -> 시트 탭 이름)
SHEET_MAPPING = {
    CLEAN_DATA_DIR / "mentions_clean.csv": "정제_언급데이터",
    CLEAN_DATA_DIR / "mentions_excluded.csv": "제외_데이터_로그",
    RAW_DATA_DIR / "datalab_trend.csv": "네이버_검색트렌드",
    RAW_DATA_DIR / "youtube_videos.csv": "유튜브_영상목록"
}

def get_gspread_client():
    if not GOOGLE_CREDENTIALS_PATH:
        print("⚠️ GOOGLE_CREDENTIALS_PATH 가 설정되지 않았습니다. (업로드 스킵)")
        return None
    
    cred_path = Path(GOOGLE_CREDENTIALS_PATH).expanduser()
    if not cred_path.exists():
        print(f"⚠️ 인증 파일을 찾을 수 없습니다: {cred_path} (업로드 스킵)")
        return None
    
    scopes = [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
    ]
    credentials = Credentials.from_service_account_file(cred_path, scopes=scopes)
    client = gspread.authorize(credentials)
    return client

def upload_dataframe_to_sheet(sh, df, sheet_name):
    """데이터프레임을 특정 시트(탭)에 덮어씁니다. 없으면 생성합니다."""
    req_rows = max(100, len(df) + 10)
    req_cols = max(26, len(df.columns) + 5)
    
    try:
        worksheet = sh.worksheet(sheet_name)
        # 기존 데이터 초기화 및 충분한 크기로 리사이즈
        worksheet.clear()
        worksheet.resize(rows=req_rows, cols=req_cols)
    except gspread.exceptions.WorksheetNotFound:
        worksheet = sh.add_worksheet(title=sheet_name, rows=req_rows, cols=req_cols)

    # 결측치 빈 문자열 처리
    df = df.fillna('')
    data_to_upload = [df.columns.values.tolist()] + df.values.tolist()
    
    # 구글 시트 일괄 업데이트
    worksheet.update(values=data_to_upload, range_name='A1')
    print(f"  └ ✅ 시트 갱신 완료: '{sheet_name}' ({len(df)}행)")

def main():
    print("--- 3. Google Sheets 업로드 시작 ---")
    
    if not GOOGLE_SHEET_URL:
        print("⚠️ GOOGLE_SHEET_URL 환경변수가 없어 업로드를 건너뜁니다.")
        return 0

    client = get_gspread_client()
    if not client:
        return 0

    try:
        sh = client.open_by_url(GOOGLE_SHEET_URL)
        print(f"📊 대상 스프레드시트 연결됨: {sh.title}")
    except Exception as e:
        print(f"❌ 구글 시트 연결 실패: {e}")
        return 1

    has_error = False
    for file_path, sheet_name in SHEET_MAPPING.items():
        if not file_path.exists():
            print(f"  └ ⚠️ 파일 없음 스킵: {file_path.name}")
            continue
            
        print(f"  └ 📤 업로드 중: {file_path.name} -> 탭[{sheet_name}]")
        try:
            df = pd.read_csv(file_path, encoding='utf-8-sig')
            upload_dataframe_to_sheet(sh, df, sheet_name)
        except Exception as e:
            print(f"  └ ❌ {sheet_name} 업로드 중 오류 발생: {e}")
            has_error = True

    if has_error:
        print("\n⚠️ 일부 데이터 업로드 중 오류가 발생했습니다.")
        return 1
    else:
        print("\n🎉 모든 데이터가 Google Sheets로 성공적으로 전송되었습니다!")
        return 0

if __name__ == "__main__":
    sys.exit(main())
