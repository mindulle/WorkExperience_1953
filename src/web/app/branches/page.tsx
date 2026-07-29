import { ViewPlaceholder } from "@/components/ViewPlaceholder";

export default function Page() {
  return (
    <ViewPlaceholder
      title="지점 관리"
      planned={[
        "전사 평균 대비 성과",
        "긍정률 추이 비교",
        "개선 액션 체크리스트",
        "지점 주요 키워드",
        "방문 시간대 분포",
        "최근 리뷰",
      ]}
    />
  );
}
