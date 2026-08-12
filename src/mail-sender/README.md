# 메일 전송 Worker (이슈 #131)

지점 관리 탭 "담당자에게 메일 전송" 버튼이 호출하는 백엔드입니다. 메인 대시보드(`src/web/`)는 정적 export라 서버 코드를 못 돌리기 때문에, 별도의 작은 Cloudflare Worker로 분리했습니다.

## 배포 방법

```bash
cd src/mail-sender
npx wrangler login          # Cloudflare 계정 로그인 (한 번만)
npx wrangler secret put RESEND_API_KEY   # resend.com에서 발급받은 키 입력 (터미널에만 입력, 코드/채팅에 남기지 않기)
npx wrangler deploy
```

배포가 끝나면 `https://work-experience-1953-mail-sender.<계정 서브도메인>.workers.dev` 형태의 URL이 나옵니다.

## 대시보드 연결

`src/web/.env`(또는 빌드 환경변수)에 다음을 추가하고 대시보드를 다시 빌드/배포하세요:

```
NEXT_PUBLIC_MAIL_WORKER_URL=https://work-experience-1953-mail-sender.<계정 서브도메인>.workers.dev
```

이 값이 없으면 대시보드의 "메일 전송" 버튼은 클릭 시 "메일 발송 서버가 설정되지 않았습니다"라고 안내만 하고 동작하지 않습니다(에러 없이 안전하게 저하됨).

## 현재 프로토타입 범위 (이슈 #131)

- 수신자는 지점별 매핑이 아직 없어 `wrangler.jsonc`의 `MANAGER_EMAIL` 단일 값으로 고정되어 있습니다. 실제 지점별 담당자가 정해지면 이 값을 교체하거나, 지점→이메일 매핑을 추가해야 합니다.
- 발신자(`FROM_EMAIL`)는 Resend의 테스트용 도메인(`onboarding@resend.dev`)입니다. 실제 운영 시 자체 도메인을 Resend에 인증 등록하고 교체하세요.
