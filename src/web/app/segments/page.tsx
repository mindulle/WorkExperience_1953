import { ViewPlaceholder } from "@/components/ViewPlaceholder";

export default function Page() {
  return (
    <ViewPlaceholder
      title="고객 세그먼트"
      planned={[
        "세그먼트 개요",
        "세그먼트 비교",
        "세그먼트 인사이트",
        "세그먼트별 주요 키워드",
        "세그먼트별 방문 시간대",
        "세그먼트 × 지점 분포",
      ]}
    />
  );
}
