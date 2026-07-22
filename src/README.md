# 1953형제돼지국밥 데이터 수집 및 정제 스크립트

이 디렉토리는 기존에 흩어져 있던 Python 데이터 수집 및 정제 스크립트들을 통합한 곳입니다.

## 🛠 실행 환경 설정 (Virtual Environment)

스크립트를 실행하기 위해 가상환경을 구성하고 의존성 패키지를 설치해야 합니다.

```bash
# 1. 가상환경 생성 (프로젝트 루트 디렉토리에서 실행)
python3 -m venv venv

# 2. 가상환경 활성화
source venv/bin/activate  # Mac/Linux
# venv\Scripts\activate   # Windows

# 3. 패키지 설치
pip install -r src/requirements.txt
```

## 📁 주요 스크립트

* `clean_mentions.py`: 네이버/유튜브 등에서 수집된 언급 데이터를 규칙에 맞게 정제하고 분석 대상만 남깁니다.
* `naver_review_collector.py`: 네이버 검색 오픈 API를 이용하여 블로그/뉴스 언급을 수집합니다.
* `naver_datalab_trend.py`: 네이버 데이터랩 API를 이용하여 브랜드 및 메뉴의 관심도 추이를 수집합니다.
* `youtube_collector.py`: YouTube Data API v3를 이용하여 관련된 영상 및 댓글을 수집합니다.

## 🚀 실행 방법 예시

가상환경이 활성화된 상태에서 다음과 같이 스크립트를 실행합니다:

```bash
# 데이터 정제 스크립트 실행 예시
python3 src/clean_mentions.py \
    --naver data/1953_일경험프로젝트_통합자료/07_데이터_수집분석_리소스/naver_mentions_raw.csv \
    --xlsx data/1953_일경험프로젝트_통합자료/04_프로젝트_실무_및_참고자료/1953_통합분석_대시보드.xlsx \
    --outdir data/1953_일경험프로젝트_통합자료/07_데이터_수집분석_리소스/
```
