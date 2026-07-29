import { ViewPlaceholder } from "@/components/ViewPlaceholder";

export default function Page() {
  return (
    <ViewPlaceholder
      title="리뷰 탐색"
      planned={[
        "필터 바 (지점 · 기간 · 평점 · 정렬 · 채널)",
        "검색 결과 요약 (건수 · 평균 평점 · 미답변 수 · 감성 구성)",
        "리뷰 카드 리스트 (지점 · 날짜 · 채널 · 감성 · 본문 · 키워드 태그)",
      ]}
    />
  );
}
