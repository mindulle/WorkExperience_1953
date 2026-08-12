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

- 지점별 담당자 이메일 매핑이 아직 없어서, **수신자는 대시보드에서 버튼을 누르기 전에 직접 입력**합니다(마지막 입력값은 브라우저에 기억됩니다). 클라이언트가 `to` 필드를 안 보내면 `wrangler.jsonc`의 `MANAGER_EMAIL`로 폴백합니다.
- 발신자(`FROM_EMAIL`)는 Resend의 테스트용 도메인(`onboarding@resend.dev`)입니다. 실제 운영 시 자체 도메인을 Resend에 인증 등록하고 교체하세요.

## ⚠️ 알려진 남용 위험

이 Worker는 CORS로 브라우저 요청 출처만 제한하고, 수신자(`to`)는 형식만 검증할 뿐 별도 허용 목록이 없습니다. 즉 Worker URL을 아는 사람은 브라우저 없이 직접 요청을 보내 **임의의 주소로 메일을 발송**시킬 수 있습니다(스팸 릴레이 악용, Resend 발송 한도/평판 소진 위험). 지금은 URL이 배포 전이라 아무도 모르는 상태지만, 배포 후 다음 중 하나를 검토하는 걸 권장합니다:
- 수신자 도메인/주소를 화이트리스트로 제한
- Cloudflare Access 등으로 Worker 자체에 인증 추가
- 간단한 요청 빈도 제한(rate limit) 추가
