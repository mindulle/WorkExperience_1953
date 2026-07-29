import { ViewPlaceholder } from "@/components/ViewPlaceholder";

export default function Page() {
  return (
    <ViewPlaceholder
      title="트렌드 분석"
      planned={[
        "감성 비율 추이",
        "평균 평점 추이",
        "지점별 리뷰량 추이",
        "키워드 트렌드",
        "요일 × 시간대 히트맵",
      ]}
    />
  );
}
