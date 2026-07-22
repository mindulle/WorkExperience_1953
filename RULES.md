# WorkExperience_1953 (일경험 프로젝트) 프로젝트 컨텍스트 및 규칙

## 📌 1. 프로젝트 개요
* **프로젝트명**: WorkExperience_1953
* **Paperclip 연동**: `cbcf7722-8ae3-4199-a6da-fc76cde44aa0` (WorkExperience_1953)
* **목적**: 기존 로컬 자료와 Notion 기획 문서를 통합하여 프로젝트를 초기화 및 고도화한다.

## 🧠 2. 주요 지식 베이스 (Knowledge Base)
* **Notion 기획/칸반**: [URL 대기 중 - OpenDevBrowser로 스크래핑 예정]
* **로컬 레거시 자료**: `data/` 디렉토리에 위치 (마이그레이션 참고용)

## 🏗️ 3. 디렉토리 구조 규칙
* `docs/`: 추출된 Notion 문서, 구조화된 기획서, 회의록 등
* `data/`: 기존 로컬에서 가져온 엑셀, 참고 파일 등 (읽기 전용)
* `src/`: 실제 초기화 및 개발될 소스 코드

## ⚡ 4. 작업 프로세스 (OpenCode Agent 지침)
1. 모든 새로운 작업은 Paperclip 이슈(Task)를 기준으로 진행한다.
2. 기존 로컬 자료(`data/`)를 참고할 때는 원본을 훼손하지 않고 분석용으로만 사용한다.
3. 문서 기반의 변경 사항이 생기면 이 `RULES.md` 또는 `docs/` 하위 문서를 실시간으로 업데이트한다.

## 📅 5. 리뷰분석 자동화 프로젝트 핵심 룰
* **기술 스택/방향**: n8n 대신 유연한 로컬 개발 환경(클로드 + 로컬 툴링)을 활용하여 데이터 수집/정제 도구를 구축한다.
* **데이터 종착지**: 리뷰 데이터의 최종 출력 및 공유는 **Google Sheet**를 기준으로 한다. (BI 툴 지양)

## 🎨 6. 디자인 및 와이어프레임 (Front-stage)
* **공식 Figma Wireframe Kit**: [https://www.figma.com/design/3pssJdAxAOSLpCT1lf5nnC/Wireframing](https://www.figma.com/design/3pssJdAxAOSLpCT1lf5nnC/Wireframing)
* UI/UX 기획 및 팀원 간의 시각적 소통은 모두 위 피그마 파일에서 진행한다.
