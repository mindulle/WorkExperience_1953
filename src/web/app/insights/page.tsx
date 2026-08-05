import { getAiInsightsData, getDashboardData } from "@/lib/googleSheets";
import { Topbar } from "@/components/dashboard/Topbar";
import { InsightsDashboard } from "@/components/insights/InsightsDashboard";

export const revalidate = 60; // 1분에 한 번씩 ISR 갱신

export default async function InsightsPage() {
  const insights = await getAiInsightsData();
  const dashboardData = await getDashboardData();
  
  const updatedAt = new Date(dashboardData.fetchedAt).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <>
      <Topbar
        title="✦ AI 추천 액션"
        subtitle="리뷰 데이터를 분석해 우선순위가 높은 개선 과제를 제안합니다"
        updatedAt={updatedAt}
        source={dashboardData.source}
      />

      <InsightsDashboard insights={insights} />
    </>
  );
}
