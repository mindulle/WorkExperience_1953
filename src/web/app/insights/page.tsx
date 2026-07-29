import { ViewPlaceholder } from "@/components/ViewPlaceholder";

export default function Page() {
  return (
    <ViewPlaceholder
      title="AI 추천 액션"
      planned={[
        "우선순위별 액션 카드 (긴급 · 주의 · 기회 · 모니터링)",
        "각 카드: 근거 지표 · 권장 조치 · 상세 링크",
      ]}
    />
  );
}
