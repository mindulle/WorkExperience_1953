// 지점 관리 탭 "메일 전송" 버튼의 백엔드. Resend API 키는 여기(서버)에만 존재하고
// 프론트엔드는 이 Worker를 fetch로 호출만 한다 (RULES §3.2 — 프론트엔드에 발송 로직 금지).

const ALLOWED_ORIGINS = new Set([
  "https://workexpr.proto.sonagi.space",
  "http://localhost:3000",
]);

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default {
  async fetch(request, env) {
    const headers = corsHeaders(request.headers.get("Origin") || "");

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }
    if (request.method !== "POST") {
      return json({ ok: false, error: "POST만 지원합니다." }, 405, headers);
    }

    // 아직 Resend 키를 등록하지 않은 상태에서도 엔드포인트 자체는 명확한 사유를 반환한다.
    if (!env.RESEND_API_KEY) {
      return json(
        { ok: false, error: "RESEND_API_KEY가 설정되지 않았습니다. `wrangler secret put RESEND_API_KEY`로 등록하세요." },
        501,
        headers
      );
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ ok: false, error: "잘못된 요청 본문입니다." }, 400, headers);
    }

    const { branch, subject, message, to } = payload || {};
    if (!branch || !subject || !message) {
      return json({ ok: false, error: "branch, subject, message가 모두 필요합니다." }, 400, headers);
    }

    // 지점별 담당자 매핑이 아직 없어(이슈 #131), 클라이언트가 입력한 수신자를 우선 사용하고
    // 없으면 env.MANAGER_EMAIL로 폴백한다. 형식만 검증한다 — 임의 수신자 입력이 가능하다는
    // 뜻이므로, 이 Worker URL이 공개되면 스팸 릴레이로 악용될 수 있다는 점을 알고 있어야 한다
    // (남용 우려 시 허용 수신자 목록을 추가하는 걸 권장, README 참고).
    const recipient = to || env.MANAGER_EMAIL;
    if (!EMAIL_PATTERN.test(recipient)) {
      return json({ ok: false, error: "수신자 이메일 형식이 올바르지 않습니다." }, 400, headers);
    }

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.FROM_EMAIL,
        to: [recipient],
        subject,
        text: `[${branch}]\n\n${message}`,
      }),
    });

    if (!resendRes.ok) {
      const detail = await resendRes.text();
      return json({ ok: false, error: `Resend 전송 실패: ${detail}` }, 502, headers);
    }

    return json({ ok: true }, 200, headers);
  },
};
