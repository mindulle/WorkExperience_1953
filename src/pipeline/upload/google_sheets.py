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
# 각 탭(시트)별 삽입할 메모(안내문)
SHEET_NOTES = {
    "원천_네이버_리뷰": "[자동화 탭] 네이버 리뷰 원천 데이터입니다.\n⚠️ 파이프라인이 덮어쓰므로 직접 수정하지 마세요.",
    "원천_카카오맵": "[자동화 탭] 카카오맵 리뷰 원천 데이터입니다.\n⚠️ 직접 수정하지 마세요.",
    "네이버_검색트렌드": "[자동화 탭] 네이버 검색 트렌드 원천 데이터입니다.\n⚠️ 직접 수정하지 마세요.",
    "유튜브_영상목록": "[자동화 탭] 유튜브 영상 수집 결과입니다.\n⚠️ 직접 수정하지 마세요.",
    "제외_데이터_로그": "[자동화 탭] 정제 과정에서 제외된 데이터 로그입니다.\n⚠️ 직접 수정하지 마세요.",
    "원천_네이버_영수증": "[자동화 탭] 네이버 플레이스 방문자 영수증 리뷰 데이터입니다.\n⚠️ 직접 수정하지 마세요.",
    "정제_리뷰데이터": "[핵심 데이터 탭] 수집 및 AI 분석이 완료된 최종 정제 데이터입니다.\n✅ 대시보드와 직접 연결되어 있습니다.\n⚠️ 열(Header) 이름이나 순서를 임의로 변경하지 마세요.\n(데이터 정정이 필요한 경우 이 시트를 복사해서 사용 권장)",
    "AI_주간리포트": "[대시보드 연결 탭] 비용 최적화를 위해 개별 리뷰가 아닌 '지점별 전체 리뷰 묶음'을 한 번에 분석한 결과입니다.\n✅ 'AI 추천 액션' 대시보드에 직접 띄워지는 내용입니다.",
    "기획": "[마케터/기획자 전용 탭]\n✅ A2 셀에 AI 프롬프트를 작성해두면, 다음 파이프라인 가동 시 해당 룰이 AI 분석에 반영됩니다.\n마음껏 수정하셔도 됩니다!"
}

SHEET_MAPPING = {
    RAW_DATA_DIR / "naver_mentions_raw.csv": "원천_네이버_리뷰",
    RAW_DATA_DIR / "kakaomap_reviews.csv": "원천_카카오맵",
    RAW_DATA_DIR / "naver_place_reviews.csv": "원천_네이버_영수증",
    CLEAN_DATA_DIR / "mentions_excluded.csv": "제외_데이터_로그",
    RAW_DATA_DIR / "datalab_trend.csv": "네이버_검색트렌드",
    RAW_DATA_DIR / "youtube_videos.csv": "유튜브_영상목록",
    CLEAN_DATA_DIR / "reviews_merged.csv": "정제_리뷰데이터",
    CLEAN_DATA_DIR / "macro_insights.csv": "AI_주간리포트",
}

def get_gspread_client():
    if not GOOGLE_CREDENTIALS_PATH:
        print("⚠️ GOOGLE_CREDENTIALS_PATH 가 설정되지 않았습니다. (OpenCode 꼼수 모드: 로컬 엑셀 저장으로 대체)")
        return "MOCK_CLIENT"
    
    cred_path = Path(GOOGLE_CREDENTIALS_PATH)
    if not cred_path.is_absolute():
        cred_path = PROJECT_ROOT / cred_path


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
    
    # 마케터/기획자를 위한 안내 메모(Note) 삽입 (A1 셀)
    if sheet_name in SHEET_NOTES:
        try:
            worksheet.insert_note('A1', SHEET_NOTES[sheet_name])
            print(f"  └ 📝 시트 메모 추가 완료: '{sheet_name}' A1 셀")
        except AttributeError:
            pass # gspread 버전에 따라 지원 안 할 수도 있음
            
    print(f"  └ ✅ 시트 갱신 완료: '{sheet_name}' ({len(df)}행)")

def main():
    print("--- 3. Google Sheets 업로드 시작 ---")
    
    client = get_gspread_client()
    if not client:
        return 0

    if client == "MOCK_CLIENT":
        print("📊 [Mock] 대상 스프레드시트 대신 로컬 엑셀 파일(dashboard_final_mock.xlsx)에 저장합니다.")
        sh = "MOCK_SHEET"
    else:
        try:
            sh = client.open_by_url(GOOGLE_SHEET_URL)
            print(f"📊 대상 스프레드시트 연결됨: {sh.title}")
        except Exception as e:
            print(f"❌ 구글 시트 연결 실패: {e}")
            return 1

    has_error = False
    
    # 엑셀 Writer 객체 (Mock 모드 전용)
    writer = None
    if sh == "MOCK_SHEET":
        mock_out = CLEAN_DATA_DIR / "dashboard_final_mock.xlsx"
        writer = pd.ExcelWriter(mock_out, engine='openpyxl')

    for file_path, sheet_name in SHEET_MAPPING.items():
        if not file_path.exists():
            print(f"  └ ⚠️ 파일 없음 스킵: {file_path.name}")
            continue
            
        print(f"  └ 📤 업로드 중: {file_path.name} -> 탭[{sheet_name}]")
        try:
            df = pd.read_csv(file_path, encoding='utf-8-sig')
            if sh == "MOCK_SHEET":
                df.to_excel(writer, sheet_name=sheet_name, index=False)
                print(f"  └ ✅ [Mock] 로컬 시트 갱신 완료: '{sheet_name}' ({len(df)}행)")
            else:
                upload_dataframe_to_sheet(sh, df, sheet_name)
        except Exception as e:
            print(f"  └ ❌ {sheet_name} 처리 중 오류 발생: {e}")
            has_error = True

    # 기획 탭이 있는지 확인하고 없으면 생성 (메모 추가)
    if sh != "MOCK_SHEET":
        try:
            sh.worksheet("기획")
        except gspread.exceptions.WorksheetNotFound:
            try:
                plan_ws = sh.add_worksheet(title="기획", rows=100, cols=10)
                plan_ws.update(values=[["[AI 프롬프트 설정 (이 아래 A2 셀에 작성)]"], [""]], range_name='A1')
                plan_ws.insert_note('A1', SHEET_NOTES["기획"])
                print("  └ ✅ '기획' 탭이 없어서 새로 생성하고 메모를 남겼습니다.")
            except Exception as e:
                print(f"  └ ⚠️ '기획' 탭 생성 실패: {e}")

    if writer:
        writer.close()
        print(f"\n🎉 [Mock 모드] 모든 데이터가 {mock_out} 파일로 성공적으로 전송(저장)되었습니다!")
        return 0

    if has_error:
        print("\n⚠️ 일부 데이터 업로드 중 오류가 발생했습니다.")
        return 1
    else:
        print("\n🎉 모든 데이터가 Google Sheets로 성공적으로 전송되었습니다!")
        return 0

if __name__ == "__main__":
    sys.exit(main())
