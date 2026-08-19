# 1953형제돼지국밥 온라인 반응 수집·분석 자동화

로컬웨이브 팀 일경험 프로그램 프로젝트입니다. 네이버·유튜브·구글맵·캐치테이블 등에서 매장 리뷰/언급을 수집·정제·분석해, 지점별 반응을 한눈에 볼 수 있는 대시보드로 제공합니다.

**🔗 라이브 대시보드: https://workexpr.proto.sonagi.space/**

## 무엇을 하는 프로젝트인가요

1. **수집** — 네이버 검색 API·YouTube Data API(공식 API) + 구글맵·캐치테이블(공개 리뷰 페이지 열람) 등에서 리뷰/언급을 모읍니다.
2. **정제·분류** — 협찬 게시물 배제, 지점명 통일, 감성(긍정/부정/중립 등) 및 방문 목적 분류를 거칩니다.
3. **적재** — 결과를 Google Sheets에 업로드합니다.
4. **표시** — 대시보드(Next.js)가 빌드 시점에 시트를 읽어 정적 사이트로 배포됩니다. 대시보드의 "데이터 갱신" 버튼을 누르면 이 전체 흐름이 다시 실행됩니다.

더 자세한 아키텍처 다이어그램은 [`docs/mentor-infra-handoff.md`](docs/mentor-infra-handoff.md)를 참고하세요.

## 저장소 구조

```
RULES.md            프로젝트 규칙 — 데이터 수집 기준, 정제 규칙, Git/PR 워크플로우 (단일 진실 공급원)
src/
  pipeline/          [Python] 수집(collect) → 정제(clean) → 분류·AI 분석(analyze) → 업로드(upload)
    main.py            전체 파이프라인 진입점
    trigger_server.py  대시보드 "데이터 갱신" 버튼이 호출하는 트리거 API (FastAPI)
  web/               [Next.js] 대시보드 프론트엔드 (정적 익스포트, Cloudflare Workers 배포)
docs/
  review-data-schema.md              리뷰 데이터 스키마·지점명·감성 판정 기준
  collection-pipeline-feasibility.md 채널별 수집 방식 검토 기록
  design/README.md                   디자인 프로토타입 및 실제 데이터 갭 설명
  mentor-infra-handoff.md            멘토님 회사 인프라 이관 대비 설계 문서
  spikes/                            기술 검증(스파이크) 결과물
```

## 로컬에서 실행하기

### 파이프라인 (`src/pipeline/`)

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r src/pipeline/requirements.txt
cp .env.example .env   # 필요한 API 키 채우기
python3 src/pipeline/main.py
```

### 대시보드 (`src/web/`)

```bash
cd src/web
npm install
npm run dev   # http://localhost:3000
```

## 더 알아보기

| 문서 | 내용 |
|---|---|
| [`RULES.md`](RULES.md) | 데이터 수집/정제 기준, Git·PR 워크플로우 — 작업 전 필독 |
| [`docs/review-data-schema.md`](docs/review-data-schema.md) | 지점명·컬럼·감성 판정 기준 |
| [`docs/collection-pipeline-feasibility.md`](docs/collection-pipeline-feasibility.md) | 채널별 수집 방식 검토(법적 리스크 포함) |
| [`docs/design/README.md`](docs/design/README.md) | 디자인 프로토타입 vs 실제 데이터 |
| [`docs/mentor-infra-handoff.md`](docs/mentor-infra-handoff.md) | 인프라 이관 설계 문서 |

## 기여하기

이슈 기반 브랜치(`feature/이슈번호-설명`) → PR → CI 통과 후 머지가 원칙입니다. 자세한 내용은 [`RULES.md`](RULES.md) §3.1을 참고하세요.
