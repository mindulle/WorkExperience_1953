import { getAiInsightsData } from "@/lib/googleSheets";
import { Card } from "@/components/ui/Card";

export const revalidate = 60; // 1분에 한 번씩 ISR 갱신

export default async function InsightsPage() {
  const insights = await getAiInsightsData();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI 추천 액션</h1>
        <p className="text-[var(--muted)] text-sm mt-1">
          ※ 이 화면은 실시간으로 AI를 호출하지 않으며, 백엔드 파이프라인이 분석해 구글 시트에 적재해둔 결과를 보여줍니다.
        </p>
      </div>

      {insights.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {insights.map((insight, idx) => (
            <Card key={idx} className="flex flex-col gap-4">
              <h2 className="text-lg font-bold border-b border-[var(--hairline)] pb-2 text-[var(--s-blue)]">
                {insight.branch}
              </h2>
              
              <div>
                <h3 className="text-sm font-semibold text-[var(--foreground)] mb-1">리뷰 요약</h3>
                <p className="text-sm text-[var(--muted)] leading-relaxed bg-[var(--plane)] p-3 rounded-md">
                  {insight.summary}
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[var(--critical)] mb-1">주요 이슈</h3>
                <p className="text-sm text-[var(--muted)] leading-relaxed">
                  {insight.keyIssues}
                </p>
              </div>

              <div className="mt-auto pt-4 border-t border-[var(--hairline)]">
                <h3 className="text-sm font-semibold text-[var(--brand)] mb-1">추천 액션</h3>
                <p className="text-sm font-medium leading-relaxed">
                  {insight.recommendedAction}
                </p>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center p-12 text-center text-[var(--muted)]">
          <p className="text-lg font-medium mb-2">데이터가 없습니다.</p>
          <p className="text-sm">구글 시트의 [AI_주간리포트] 탭에 분석 결과가 적재되지 않았거나 조회할 수 없습니다.</p>
        </Card>
      )}
    </div>
  );
}
