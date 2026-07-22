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

def run_script(script_path, *args, cwd=None):
    cmd = [sys.executable, str(script_path)] + list(args)
    print(f"\n🚀 실행: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=cwd or PIPELINE_DIR, env=os.environ)
    if result.returncode != 0:
        print(f"❌ 오류 발생: {script_path.name}")
        sys.exit(result.returncode)
    print(f"✅ 완료: {script_path.name}")

def main():
    print("==================================================")
    print(" 1953형제돼지국밥 데이터 수집/정제 파이프라인 v0.1.0")
    print("==================================================")

    # 1. 수집 스크립트 실행
    print("\n[1/2] 데이터 수집 시작...")
    run_script(PIPELINE_DIR / "collect" / "naver_review_collector.py")
    run_script(PIPELINE_DIR / "collect" / "youtube_collector.py")
    run_script(PIPELINE_DIR / "collect" / "naver_datalab_trend.py")

    # 2. 정제 스크립트 실행
    print("\n[2/2] 데이터 정제 검증 시작...")
    run_script(PIPELINE_DIR / "clean" / "clean_mentions.py", 
               "--outdir", str(CLEAN_DATA_DIR),
               "--naver", str(PIPELINE_DIR / "naver_mentions_raw.csv"),
               "--xlsx", str(PROJECT_ROOT / "data/1953_일경험프로젝트_통합자료/04_프로젝트_실무_및_참고자료/1953_통합분석_대시보드.xlsx"))

    print("\n🎉 모든 파이프라인 실행이 완료되었습니다!")
    print(f"정제된 결과물은 '{CLEAN_DATA_DIR}' 폴더에서 확인 가능합니다.")

if __name__ == "__main__":
    main()
