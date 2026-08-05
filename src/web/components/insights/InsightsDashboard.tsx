"use client";

import { useState } from "react";
import type { AiInsightItem } from "@/lib/types";
import { AlertCircle, AlertTriangle, CheckCircle, ListTodo } from "lucide-react";

export function InsightsDashboard({ insights }: { insights: AiInsightItem[] }) {
  const [filter, setFilter] = useState<string>("전체");

  // Calculate counts
  const totalCount = insights.length;
  const critCount = insights.filter(i => (i.severity || "").includes("긴급")).length;
  const warnCount = insights.filter(i => (i.severity || "").includes("주의")).length;
  const goodCount = insights.filter(i => (i.severity || "").includes("기회")).length;
  const monitoringCount = insights.filter(i => (i.severity || "").includes("모니터링") || (!i.severity)).length;

  // Filter items
  const filteredInsights = insights.filter(insight => {
    if (filter === "전체") return true;
    const sev = insight.severity || "모니터링";
    return sev.includes(filter);
  });

  return (
    <div className="flex flex-col gap-6 mt-4">
      {/* Summary Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="flex items-center gap-3 bg-[var(--surface)] border border-[var(--hairline)] rounded-[var(--r-md)] h-[60px] px-5 shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-center w-[30px] h-[30px] rounded-full bg-[var(--surface-2)]">
            <ListTodo className="w-[16px] h-[16px] text-[var(--ink-2)]" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-[17px] font-bold leading-none tracking-[-0.5px]">{totalCount}</div>
            <div className="text-[11px] text-[var(--muted)] font-medium mt-1">전체 추천</div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-[var(--surface)] border border-[var(--hairline)] rounded-[var(--r-md)] h-[60px] px-5 shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-center w-[30px] h-[30px] rounded-full bg-[var(--critical-soft)]">
            <AlertCircle className="w-[16px] h-[16px] text-[var(--critical)]" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-[17px] font-bold leading-none tracking-[-0.5px] text-[var(--critical)]">{critCount}</div>
            <div className="text-[11px] text-[var(--muted)] font-medium mt-1">긴급</div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-[var(--surface)] border border-[var(--hairline)] rounded-[var(--r-md)] h-[60px] px-5 shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-center w-[30px] h-[30px] rounded-full bg-[var(--warn-soft)]">
            <AlertTriangle className="w-[16px] h-[16px] text-[var(--warn)]" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-[17px] font-bold leading-none tracking-[-0.5px] text-[var(--warn)]">{warnCount}</div>
            <div className="text-[11px] text-[var(--muted)] font-medium mt-1">주의 (진행중)</div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-[var(--surface)] border border-[var(--hairline)] rounded-[var(--r-md)] h-[60px] px-5 shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-center w-[30px] h-[30px] rounded-full bg-[var(--good-soft)]">
            <CheckCircle className="w-[16px] h-[16px] text-[var(--good)]" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-[17px] font-bold leading-none tracking-[-0.5px] text-[var(--good)]">{goodCount}</div>
            <div className="text-[11px] text-[var(--muted)] font-medium mt-1">기회 (완료)</div>
          </div>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <button 
          onClick={() => setFilter("전체")}
          className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-[10px] text-xs font-semibold cursor-pointer transition-colors ${filter === "전체" ? "bg-[var(--ink)] text-white border border-[var(--ink)]" : "bg-[var(--surface)] text-[var(--ink-2)] border border-[var(--hairline)] hover:bg-[var(--surface-2)]"}`}
        >
          전체 {totalCount}
        </button>
        <button 
          onClick={() => setFilter("긴급")}
          className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-[10px] text-xs cursor-pointer transition-colors ${filter === "긴급" ? "bg-[var(--ink)] text-white border border-[var(--ink)] font-semibold" : "bg-[var(--surface)] text-[var(--ink-2)] border border-[var(--hairline)] hover:bg-[var(--surface-2)]"}`}
        >
          <span className={`w-[7px] h-[7px] rounded-full ${filter === "긴급" ? "bg-white" : "bg-[var(--critical)]"}`}></span>긴급 {critCount}
        </button>
        <button 
          onClick={() => setFilter("주의")}
          className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-[10px] text-xs cursor-pointer transition-colors ${filter === "주의" ? "bg-[var(--ink)] text-white border border-[var(--ink)] font-semibold" : "bg-[var(--surface)] text-[var(--ink-2)] border border-[var(--hairline)] hover:bg-[var(--surface-2)]"}`}
        >
          <span className={`w-[7px] h-[7px] rounded-full ${filter === "주의" ? "bg-white" : "bg-[var(--warn)]"}`}></span>주의 {warnCount}
        </button>
        <button 
          onClick={() => setFilter("기회")}
          className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-[10px] text-xs cursor-pointer transition-colors ${filter === "기회" ? "bg-[var(--ink)] text-white border border-[var(--ink)] font-semibold" : "bg-[var(--surface)] text-[var(--ink-2)] border border-[var(--hairline)] hover:bg-[var(--surface-2)]"}`}
        >
          <span className={`w-[7px] h-[7px] rounded-full ${filter === "기회" ? "bg-white" : "bg-[var(--good)]"}`}></span>기회 {goodCount}
        </button>
        <button 
          onClick={() => setFilter("모니터링")}
          className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-[10px] text-xs cursor-pointer transition-colors ${filter === "모니터링" ? "bg-[var(--ink)] text-white border border-[var(--ink)] font-semibold" : "bg-[var(--surface)] text-[var(--ink-2)] border border-[var(--hairline)] hover:bg-[var(--surface-2)]"}`}
        >
          <span className={`w-[7px] h-[7px] rounded-full ${filter === "모니터링" ? "bg-white" : "bg-[var(--muted)]"}`}></span>모니터링 {monitoringCount}
        </button>
      </div>

      {/* Cards Grid */}
      {filteredInsights.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredInsights.map((insight, idx) => {
            const sev = insight.severity || "모니터링";
            const isCrit = sev.includes("긴급");
            const isWarn = sev.includes("주의");
            const isGood = sev.includes("기회");
            
            const sevColor = isCrit ? "var(--critical)" : isWarn ? "var(--warn)" : isGood ? "var(--good)" : "var(--muted)";
            const sevText = isCrit ? "긴급" : isWarn ? "주의" : isGood ? "기회" : "모니터링";
            const sevBgClass = isCrit ? "bg-gradient-to-b from-[#fdf3f3] to-white" : "bg-[var(--surface)]";

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
                  {insight.metrics && (
                    <span className="text-[11px] font-semibold text-[var(--ink-2)] whitespace-nowrap ml-3">
                      {insight.metrics}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-[var(--surface)] border border-[var(--hairline)] rounded-[var(--r-lg)] flex flex-col items-center justify-center p-12 text-center text-[var(--muted)]">
          <p className="text-lg font-medium mb-2">필터링된 데이터가 없습니다.</p>
          <p className="text-sm">선택한 조건에 맞는 리뷰 분석 결과가 없습니다.</p>
        </div>
      )}
    </div>
  );
}
