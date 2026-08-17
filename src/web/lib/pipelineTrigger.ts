// 대시보드 "데이터 갱신" 버튼이 호출하는 백엔드 트리거 API 클라이언트.
//
// 백엔드는 이 저장소 밖(관리자가 운영하는 별도 서버)에서 구현된다 (이슈 #164).
// 이 파일이 정의하는 계약(엔드포인트 경로, 요청/응답 모양)이 백엔드 구현의
// 기준이므로, 바꿀 때는 #164 담당자와 맞춰야 한다. 계약 상세 설명은 #164 코멘트 참고.
//
// 이 앱은 next.config.ts에서 output: "export"로 정적 익스포트되므로, 클라이언트에서
// 읽을 수 있는 건 NEXT_PUBLIC_ 접두사가 붙은 환경 변수뿐이고 그 값은 빌드 시점에
// JS 번들에 그대로 박힌다 — 즉 이 토큰은 브라우저에서 완전히 숨겨지지 않는다.
// 스팸성 재실행을 막는 최소한의 장치로만 취급할 것.

export type PipelineStatus = {
  status: "idle" | "running" | "success" | "failed";
  startedAt: string | null;
  finishedAt: string | null;
  /** 실패했거나 일부만 성공한 단계 이름 목록 (예: ["kakaomap_collector.py"]). */
  failedSteps?: string[];
};

const BASE_URL = process.env.NEXT_PUBLIC_PIPELINE_TRIGGER_URL;
const TOKEN = process.env.NEXT_PUBLIC_PIPELINE_TRIGGER_TOKEN;

export function isTriggerConfigured(): boolean {
  return Boolean(BASE_URL);
}

function authHeaders(): HeadersInit {
  return TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {};
}

/** POST {BASE_URL}/run — 파이프라인 실행을 백그라운드로 시작해달라고 요청한다. */
export async function triggerPipelineRun(): Promise<PipelineStatus> {
  if (!BASE_URL) {
    throw new Error("트리거 서버 주소가 아직 설정되지 않았습니다. 관리자에게 문의하세요.");
  }
  const res = await fetch(`${BASE_URL}/run`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`트리거 요청 실패 (HTTP ${res.status})`);
  }
  return res.json();
}

/** GET {BASE_URL}/status — 현재 실행 상태를 조회한다. */
export async function fetchPipelineStatus(): Promise<PipelineStatus> {
  if (!BASE_URL) {
    throw new Error("트리거 서버 주소가 아직 설정되지 않았습니다. 관리자에게 문의하세요.");
  }
  const res = await fetch(`${BASE_URL}/status`, {
    method: "GET",
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`상태 조회 실패 (HTTP ${res.status})`);
  }
  return res.json();
}
