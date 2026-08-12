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

    const { branch, subject, message } = payload || {};
    if (!branch || !subject || !message) {
      return json({ ok: false, error: "branch, subject, message가 모두 필요합니다." }, 400, headers);
    }

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.FROM_EMAIL,
        // 현재는 지점별 담당자 매핑이 없어 단일 수신자(env.MANAGER_EMAIL)로 보낸다 (이슈 #131 프로토타입 범위).
        to: [env.MANAGER_EMAIL],
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
