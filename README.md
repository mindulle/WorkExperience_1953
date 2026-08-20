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

## 📦 인프라 이관 (Handoff) 및 도커 배포 가이드

이 프로젝트는 멘토님 회사의 사내 인프라에 즉시 배포할 수 있도록 **All-in-One Docker 패키징**이 완료되어 있습니다. 코드를 넘겨받으신 담당자분께서는 다음 절차만 진행하시면 됩니다.

### 1. API 키 및 서비스 계정 재발급 (필수)
기존에 사용된 네이버, 유튜브, 구글 서비스 계정 키 등은 개발자 개인 소유이므로 이관 시 폐기됩니다. 반드시 **귀사 명의로 키를 새로 발급**하셔야 합니다.

1. 최상단 폴더의 `.env.example` 파일을 복사하여 `.env` 파일을 생성합니다.
2. 구글 서비스 계정(Google Sheets API 접근용) 키를 발급받아 `service_account.json` 이름으로 최상단 폴더에 둡니다.
3. `.env` 파일 안에 새로 발급받은 유튜브, 네이버, Groq API 키 등을 채워 넣습니다.

### 2. 서버 실행
도커가 설치된 서버 환경에서 터미널을 열고 다음 명령어 한 줄만 입력하세요.

```bash
docker-compose up -d
```

* **포트 8081**: 데이터 파이프라인 트리거 서버 (수집/분석 통제)
* **포트 3000**: Next.js 웹 대시보드 (데이터가 갱신될 때마다 자동으로 최신화됨)

> 💡 **참고**: 카카오맵, 캐치테이블 수집기가 브라우저 엔진을 구동하므로 초기 빌드 시 3GB 가량의 데이터를 다운로드하며, `docker-compose.yml` 내 `shm_size: 1gb` 설정이 반드시 유지되어야 합니다.


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
