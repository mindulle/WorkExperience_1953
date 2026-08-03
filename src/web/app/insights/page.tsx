import { ViewPlaceholder } from "@/components/ViewPlaceholder";

export default function Page() {
  return (
    <ViewPlaceholder
      title="AI 추천 액션"
      planned={[
        "우선순위별 액션 카드 (긴급 · 주의 · 기회 · 모니터링)",
        "각 카드: 근거 지표 · 권장 조치 · 상세 링크",
        "※ 주의: 이 화면은 실시간으로 AI를 호출하지 않습니다. 파이프라인(백엔드)이 새벽에 일괄(Batch) 분석해 구글 시트에 적재해둔 사전 분석 결과를 단순히 뷰어(Viewer) 형태로 보여줍니다."
      ]}
    />
  );
}
