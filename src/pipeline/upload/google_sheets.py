#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
분석 결과물 ➔ Google Sheets 자동 업로드 스크립트
=================================================
로컬에 저장된 CSV 데이터들을 Google Sheets의 각 탭(시트)으로 완벽하게 분리하여 전송합니다.
"""

import os
import sys
import json
import pandas as pd
from pathlib import Path
from google.oauth2.service_account import Credentials
import gspread

# 경로 설정
PIPELINE_DIR = Path(__file__).parent.parent.resolve()
PROJECT_ROOT = PIPELINE_DIR.parent.parent.resolve()
CLEAN_DATA_DIR = PROJECT_ROOT / "data" / "clean"
RAW_DATA_DIR = PROJECT_ROOT / "data" / "raw"

# 환경변수 로드 (.env에서 주입됨)
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
    if not GOOGLE_CREDENTIALS_PATH or not os.path.exists(GOOGLE_CREDENTIALS_PATH):
        print("⚠️ GOOGLE_CREDENTIALS_PATH 가 설정되지 않았거나 파일이 없습니다. (업로드 스킵)")
        return None
    
    scopes = [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
    ]
    credentials = Credentials.from_service_account_file(GOOGLE_CREDENTIALS_PATH, scopes=scopes)
    client = gspread.authorize(credentials)
    return client

def upload_dataframe_to_sheet(sh, df, sheet_name):
    """데이터프레임을 특정 시트(탭)에 덮어씁니다. 없으면 생성합니다."""
    # 시트 존재 여부 확인 및 생성
    try:
        worksheet = sh.worksheet(sheet_name)
        # 기존 데이터 초기화
        worksheet.clear()
    except gspread.exceptions.WorksheetNotFound:
        # 데이터프레임 크기보다 넉넉하게 시트 생성
        rows = max(100, len(df) + 10)
        cols = max(26, len(df.columns) + 5)
        worksheet = sh.add_worksheet(title=sheet_name, rows=rows, cols=cols)

    # 데이터 업로드를 위해 결측치(NaN, NaT 등)를 빈 문자열로 처리
    df = df.fillna('')
    
    # 헤더와 데이터 결합
    data_to_upload = [df.columns.values.tolist()] + df.values.tolist()
    
    # 구글 시트에 일괄 업데이트 (gspread 6.0+ 문법)
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

    print("\n🎉 모든 데이터가 Google Sheets로 성공적으로 전송되었습니다!")
    return 0

if __name__ == "__main__":
    sys.exit(main())
