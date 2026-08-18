#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import subprocess
from pathlib import Path

# 파이프라인의 기준 경로 설정
PIPELINE_DIR = Path(__file__).parent.resolve()
PROJECT_ROOT = PIPELINE_DIR.parent.parent.resolve()
RAW_DATA_DIR = PROJECT_ROOT / "data" / "raw"
CLEAN_DATA_DIR = PROJECT_ROOT / "data" / "clean"
ENV_FILE = PROJECT_ROOT / ".env"

# 필요한 디렉토리가 없으면 생성
RAW_DATA_DIR.mkdir(parents=True, exist_ok=True)
CLEAN_DATA_DIR.mkdir(parents=True, exist_ok=True)

# 환경 변수 연결 (하위 스크립트들이 루트의 .env를 인식하도록)
os.environ["NAVER_ENV_FILE"] = str(ENV_FILE)

# 이번 실행에서 각 단계의 성공/실패 기록.
# 트리거 서버(#164)가 실행 상태를 조회할 때 이 정보(및 최종 종료 코드)를
# 근거로 쓸 수 있도록, 여기서 사실대로 추적한다.
STEP_RESULTS = []


def run_script(script_path, *args, cwd=None):
    cmd = [sys.executable, str(script_path)] + list(args)
    print(f"\n🚀 실행: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=cwd or PIPELINE_DIR, env=os.environ)
    success = result.returncode == 0
    STEP_RESULTS.append({
        "step": script_path.name,
        "success": success,
        "returncode": result.returncode,
    })
    if not success:
        print(f"⚠️ 경고: {script_path.name} 실행 중 오류 발생 (exit code {result.returncode}, 계속 진행합니다)")
    else:
        print(f"✅ 완료: {script_path.name}")
    return success


def main():
    print("==================================================")
    print(" 1953형제돼지국밥 데이터 수집/정제 파이프라인 v0.2.0")
    print("==================================================")

    # 1. 수집 스크립트 실행
    print("\n[1/6] 데이터 수집 시작...")
    run_script(PIPELINE_DIR / "collect" / "naver_review_collector.py", cwd=RAW_DATA_DIR)
    print("--- [1-1] 네이버 블로그 작성 시간(Time) 스크래핑 복원 ---")
    run_script(PIPELINE_DIR / "collect" / "naver_blog_time_scraper.py", cwd=RAW_DATA_DIR)
    run_script(PIPELINE_DIR / "collect" / "youtube_collector.py", cwd=RAW_DATA_DIR)
    run_script(PIPELINE_DIR / "collect" / "naver_datalab_trend.py", cwd=RAW_DATA_DIR)
    run_script(PIPELINE_DIR / "collect" / "catchtable_collector.py", cwd=RAW_DATA_DIR)
    run_script(PIPELINE_DIR / "collect" / "kakaomap_collector.py", cwd=RAW_DATA_DIR)
    run_script(PIPELINE_DIR / "collect" / "naver_place_collector.py", cwd=RAW_DATA_DIR)

    # 2. 정제 스크립트 실행
    print("\n[2/6] 팀원 데이터 병합 및 데이터 정제 검증 시작...")
    run_script(PIPELINE_DIR / "clean" / "merge_team_data.py", cwd=PIPELINE_DIR)
    run_script(PIPELINE_DIR / "clean" / "clean_mentions.py",
               "--outdir", str(CLEAN_DATA_DIR),
               "--naver", str(RAW_DATA_DIR / "naver_mentions_raw.csv"),
               "--kakao", str(RAW_DATA_DIR / "kakaomap_reviews.csv"),
               "--xlsx", str(PROJECT_ROOT / "data/1953_일경험프로젝트_통합자료/04_프로젝트_실무_및_참고자료/1953_통합분석_대시보드.xlsx"),
               cwd=RAW_DATA_DIR)

    # 3. 규칙 기반 분류 (감성/방문 유형/고객 유형). ai_engine.py 가 이 단계의 출력
    # (reviews_analyzed.csv)을 입력으로 쓰므로 반드시 AI 분석보다 먼저 실행해야 한다.
    print("\n[3/6] 규칙 기반 감성/유형 분류 시작...")
    run_script(PIPELINE_DIR / "analyze" / "rule_classifier.py", cwd=PIPELINE_DIR)

    # 4. AI 분석 실행
    print("\n[4/6] AI 꼼수 모드 (OpenCode Free-riding) 기반 감성/키워드 분석 시작...")
    run_script(PIPELINE_DIR / "analyze" / "ai_engine.py", cwd=PIPELINE_DIR)

    # 5. 거시적(Macro) AI 인사이트 추출
    print("\n[5/6] 비용 최적화를 위한 거시적(Macro) 지점별 AI 리포트 생성 시작...")
    run_script(PIPELINE_DIR / "analyze" / "macro_insight.py", cwd=PIPELINE_DIR)

    # 6. 구글 시트 업로드 실행
    print("\n[6/6] Google Sheets 자동 업로드 시작...")
    run_script(PIPELINE_DIR / "upload" / "google_sheets.py", cwd=PIPELINE_DIR)

    # 실행 요약. 기존처럼 중간에 실패해도 끝까지는 실행하되,
    # 마지막에는 사실대로 요약과 종료 코드를 남긴다.
    failed_steps = [r["step"] for r in STEP_RESULTS if not r["success"]]

    print("\n==================================================")
    if failed_steps:
        print(f"⚠️ 파이프라인 실행이 끝났지만 {len(failed_steps)}개 단계가 실패했습니다: {', '.join(failed_steps)}")
        print("정제된 결과물은 일부만 최신일 수 있습니다. 위 로그에서 실패 원인을 확인하세요.")
    else:
        print("🎉 모든 파이프라인 실행이 완료되었습니다!")
    print(f"정제된 결과물은 '{CLEAN_DATA_DIR}' 폴더에서 확인 가능합니다.")
    print("==================================================")

    return 0 if not failed_steps else 1


if __name__ == "__main__":
    sys.exit(main())
