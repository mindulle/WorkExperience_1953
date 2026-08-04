import { getAiInsightsData, getDashboardData } from "@/lib/googleSheets";
import { Topbar } from "@/components/dashboard/Topbar";

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

      <div className="flex flex-col gap-6 mt-4">
        {/* filter pills (Mock for now to match UI design) */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[10px] border border-[var(--ink)] bg-[var(--ink)] text-white text-xs font-semibold cursor-pointer">
            전체 {insights.length}
          </span>
          <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[10px] border border-[var(--hairline)] bg-[var(--surface)] text-[var(--ink-2)] text-xs cursor-pointer hover:bg-[var(--surface-2)]">
            <span className="w-[7px] h-[7px] rounded-full bg-[var(--critical)]"></span>긴급
          </span>
          <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[10px] border border-[var(--hairline)] bg-[var(--surface)] text-[var(--ink-2)] text-xs cursor-pointer hover:bg-[var(--surface-2)]">
            <span className="w-[7px] h-[7px] rounded-full bg-[var(--warn)]"></span>주의
          </span>
          <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[10px] border border-[var(--hairline)] bg-[var(--surface)] text-[var(--ink-2)] text-xs cursor-pointer hover:bg-[var(--surface-2)]">
            <span className="w-[7px] h-[7px] rounded-full bg-[var(--good)]"></span>기회
          </span>
          <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[10px] border border-[var(--hairline)] bg-[var(--surface)] text-[var(--ink-2)] text-xs cursor-pointer hover:bg-[var(--surface-2)]">
            <span className="w-[7px] h-[7px] rounded-full bg-[var(--muted)]"></span>모니터링
          </span>
        </div>

        {insights.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {insights.map((insight, idx) => {
              // 임시로 severity를 부여 (실제 데이터에 없으므로)
              // 브랜치 이름에 특정 키워드가 있거나, idx에 따라 가짜로 분배해 UI를 풍성하게 함.
              const isCrit = insight.branch.includes("광안리") || idx === 0;
              const isWarn = insight.branch.includes("서면") || idx === 1;
              
              const sevColor = isCrit ? "var(--critical)" : isWarn ? "var(--warn)" : "var(--good)";
              const sevText = isCrit ? "긴급" : isWarn ? "주의" : "기회";
              const sevBgClass = isCrit ? "bg-gradient-to-b from-[#fdf3f3] to-white" : "bg-[var(--surface)]";

              // 키워드 태그 분리
              const tags = insight.keyIssues.split("/").map(t => t.trim()).filter(Boolean);

              return (
                <div key={idx} className={`border-[1.5px] border-[var(--hairline)] rounded-[var(--r-md)] p-[17px_19px] shadow-[var(--shadow-sm)] flex flex-col ${sevBgClass} hover:border-[var(--brand)] hover:shadow-[0_0_0_3px_#dbe9fb,var(--shadow)] transition-all cursor-pointer`}>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="flex items-center gap-1.5 text-[11.5px] font-bold tracking-[-0.2px]" style={{ color: sevColor }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: sevColor }}></span>
                      {sevText}
                    </span>
                    <span className="text-[10.5px] font-semibold px-[7px] py-[3px] rounded-[6px] bg-[var(--surface-2)] text-[var(--ink-2)] border border-[var(--hairline)]">
                      신규
                    </span>
                  </div>
                  
                  <div className="text-[15px] font-bold tracking-[-0.3px] mb-1.5 leading-tight">
                    {insight.branch} 집중 관리
                  </div>
                  
                  <div className="text-[12.5px] text-[var(--ink-2)] leading-relaxed flex-grow">
                    <span className="font-semibold text-[var(--foreground)] block mb-1">리뷰 요약: {insight.summary}</span>
                    <span className="block mt-2"><b>추천 액션:</b> {insight.recommendedAction}</span>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3.5 pt-3 border-t border-dashed border-[var(--hairline)]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center h-[22px] px-[7px] bg-[var(--plane)] text-[var(--ink-2)] rounded-[5px] text-[10.5px] font-medium">
                        {insight.branch}
                      </span>
                      {tags.map((tag, i) => (
                        <span key={i} className="inline-flex items-center h-[22px] px-[7px] bg-[var(--plane)] text-[var(--ink-2)] rounded-[5px] text-[10.5px] font-medium max-w-[120px] truncate">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-[var(--surface)] border border-[var(--hairline)] rounded-[var(--r-lg)] flex flex-col items-center justify-center p-12 text-center text-[var(--muted)]">
            <p className="text-lg font-medium mb-2">데이터가 없습니다.</p>
            <p className="text-sm">구글 시트의 [AI_주간리포트] 탭에 분석 결과가 적재되지 않았거나 조회할 수 없습니다.</p>
          </div>
        )}
      </div>
    </>
  );
}
