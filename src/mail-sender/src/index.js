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

    const recipient = to || env.MANAGER_EMAIL;
    if (!EMAIL_PATTERN.test(recipient)) {
      return json({ ok: false, error: "수신자 이메일 형식이 올바르지 않습니다." }, 400, headers);
    }

    // 보안 강화: 수신자 화이트리스트 검증 (스팸 릴레이 방어)
    const allowedDomains = (env.ALLOWED_DOMAINS || "sonagi.space,example.com,mindulle.com").split(',').map(d => d.trim());
    const recipientDomain = recipient.split('@')[1];
    
    // MANAGER_EMAIL이거나, 도메인이 허용 목록에 있는 경우만 통과
    const isAllowed = (recipient === env.MANAGER_EMAIL) || allowedDomains.includes(recipientDomain);
    
    if (!isAllowed) {
      return json({ ok: false, error: "허용되지 않은 수신자 도메인입니다. 사내 이메일(화이트리스트)만 허용됩니다." }, 403, headers);
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