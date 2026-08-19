# camoufox / scrapling Docker화 사전 검증 (스파이크)

> 2026-08-19, 이슈 #178. `docs/mentor-infra-handoff.md` §2에서 가장 큰 리스크로 지목한
> "헤드리스 브라우저 의존성을 Docker 안에서 돌릴 수 있는가"를 실제로 검증한 결과물입니다.
>
> **이 폴더는 검증(spike)용이며 프로덕션 배포 Dockerfile이 아닙니다.** 실제 파이프라인
> 이미지를 만들 때는 `src/pipeline/requirements.txt` 전체(pandas, gspread 등)와
> `main.py`/`trigger_server.py` 실행 환경을 포함해야 하고, 여기서는 브라우저 실행
> 가능 여부만 최소 재현했습니다.

## 검증 환경

- 실행 VM 아키텍처: `aarch64` (arm64) — 멘토님 회사 인프라가 x86_64라면 camoufox/Playwright의
  amd64 지원이 더 오래되고 안정적이므로 여기 결과보다 더 잘 되면 됐지 나빠질 이유는 없습니다.
- 베이스 이미지: **`python:3.10-slim`** (Playwright 공식 이미지 `mcr.microsoft.com/playwright`를
  일부러 안 쓰고, 특수 base 없이도 되는지 확인하려 한 것 — 멘토님 회사가 이미 쓰는 다른
  base 이미지 위에 얹어야 할 가능성을 고려)

## 결과: 성공 (PASS)

```
=== [1/2] camoufox (헤드리스 Firefox) 실행 테스트 ===
OK - camoufox 정상 실행, 페이지 title: 'Example Domain'

=== [2/2] scrapling (Playwright 기반) 실행 테스트 ===
OK - scrapling 정상 실행, HTTP status: 200, body 길이: 559
```

- `camoufox.sync_api.Camoufox` (kakaomap_collector.py·naver_place_collector.py가 사용)
- `scrapling.fetchers.AsyncDynamicSession` (catchtable_collector.py가 사용)

둘 다 컨테이너 안에서 example.com 상대로 정상적으로 브라우저를 띄우고, 페이지 로드, 콘텐츠
수신까지 문제없이 완료됨을 확인했습니다.

## 확인된 요구사항 (실제로 필요했던 것)

1. **apt 시스템 라이브러리** — `python:3.10-slim`에는 기본으로 없어서 `Dockerfile`의
   `RUN apt-get install ...` 목록(libnss3, libatk1.0-0, libgtk-3-0, fonts-liberation 등)을
   직접 명시해야 했습니다. (Playwright 공식 이미지를 베이스로 쓰면 이 단계가 생략 가능)
2. **`python -m camoufox fetch`** — `pip install camoufox`만으로는 패치된 Firefox 바이너리가
   안 딸려오고, 이 명령을 빌드 시점에 따로 실행해야 함 (레이어 크기 약 1.31GB)
3. **`python -m playwright install --with-deps chromium`** — scrapling이 내부적으로 쓰는
   Playwright Chromium 설치 (레이어 크기 약 1.07GB). `--with-deps`가 남은 시스템 라이브러리를
   자동으로 채워주긴 하지만, 이미 위 1번에서 상당수를 apt로 깔아둔 상태였음.
4. **최종 이미지 크기**: 약 **3.27GB** (apt 302MB + pip 441MB + camoufox 1.31GB + playwright
   chromium 1.07GB). 카카오맵/네이버플레이스(camoufox)와 캐치테이블(scrapling→Playwright)이
   서로 다른 브라우저 엔진을 쓰기 때문에 **두 엔진 바이너리가 모두 포함**되어 이미지가 큽니다.
   API 기반 수집기(네이버·유튜브)만 쓰는 이미지라면 이 두 레이어가 통째로 빠져 훨씬 가벼워집니다.
5. **`/dev/shm` 크기** — 이번 스모크 테스트(example.com, 가벼운 페이지)는 Docker 기본
   shm(64MB)에서도 문제없이 통과했습니다. 다만 카카오맵·캐치테이블 같은 실제 대상은 훨씬
   무거운 페이지라 크로미움/Firefox가 크래시할 수 있는 잘 알려진 이슈이므로, 실제 배포 시엔
   `docker run --shm-size=1g` 또는 docker-compose의 `shm_size: '1gb'` 설정을 권장합니다.

## 재현 방법

```bash
cd docs/spikes/docker-camoufox-scrapling
docker build -t camoufox-scrapling-spike .
docker run --rm --shm-size=1g camoufox-scrapling-spike
```

## 결론 (docs/mentor-infra-handoff.md §2 갱신)

"헤드리스 브라우저 의존성"은 이론적 리스크가 아니라 **실제로 재현 가능한 것으로 검증됨**.
Playwright 공식 base 이미지 없이 일반 `python:*-slim` 위에서도 apt 패키지 목록만 맞으면
정상 동작하므로, 멘토님 회사가 이미 쓰는 다른 base 이미지 위에 얹는 것도 무리 없어 보입니다.
남은 변수는 이미지 크기(3GB대)와 실제 대상 사이트(카카오맵/캐치테이블)에서의 봇 차단
우회 성공 여부인데, 후자는 이 VM에서 지금도 정상 동작 중인 것과 동일한 코드이므로 Docker화
자체가 새로운 리스크를 추가하지는 않습니다.
