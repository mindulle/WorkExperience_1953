"use client";

import React, { useMemo, useState } from "react";
import type { ReviewItem } from "@/lib/types";

export function TrendExplorer({ reviews }: { reviews: ReviewItem[] }) {
  const [seg, setSeg] = useState<"일간" | "주간" | "월간">("월간");

  // 월별 집계
  const trendData = useMemo(() => {
    const map = new Map<string, { total: number; pos: number; neg: number; ratingSum: number; ratingCount: number }>();
    
    reviews.forEach(r => {
      const key = r.ym || "Unknown";
      if (key === "Unknown" || !/^\d{4}-\d{2}$/.test(key)) return;
      
      const entry = map.get(key) || { total: 0, pos: 0, neg: 0, ratingSum: 0, ratingCount: 0 };
      entry.total++;
      if (r.sentiment === "긍정") entry.pos++;
      if (r.sentiment === "부정") entry.neg++;
      if (r.rating) {
        entry.ratingSum += r.rating;
        entry.ratingCount++;
      }
      map.set(key, entry);
    });

    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, data]) => ({
        month,
        total: data.total,
        pos: data.pos,
        neg: data.neg,
        avgRating: data.ratingCount > 0 ? data.ratingSum / data.ratingCount : null,
      }));
  }, [reviews]);

  // 상단 KPI 계산 (전체 vs 이전)
  // 단순하게 전체 데이터를 보여주거나, trendData의 마지막 달 vs 그 이전 달로 비교.
  // 여기서는 최신 달 (가장 최근 달) vs 그 이전 달
  const latestMonth = trendData.length > 0 ? trendData[trendData.length - 1] : null;
  const prevMonth = trendData.length > 1 ? trendData[trendData.length - 2] : null;

  const totalReviews = reviews.length;
  const totalPos = reviews.filter(r => r.sentiment === "긍정").length;
  const totalNeg = reviews.filter(r => r.sentiment === "부정").length;
  const totalNeu = reviews.filter(r => r.sentiment === "중립" || r.sentiment === "혼합").length;
  const analyzed = totalPos + totalNeg + totalNeu;
  
  const currentPosPct = analyzed > 0 ? Math.round((totalPos / analyzed) * 100) : 0;
  const currentNegPct = analyzed > 0 ? Math.round((totalNeg / analyzed) * 100) : 0;

  // Polyline Points Generator for mock sparkline
  const generateSpark = (isUp: boolean) => {
    return isUp 
      ? "0,26 14,24 28,25 42,18 56,16 70,10 88,6" 
      : "0,10 14,12 28,11 42,14 56,15 70,17 88,20";
  };

  return (
    <div className="flex flex-col h-full">
      <div className="topbar">
        <div className="tb-row">
          <div className="tb-title">
            <h1 className="text-2xl font-bold tracking-tight">트렌드 분석</h1>
            <p className="text-[12.5px] text-[var(--muted)] mt-1">이전 기간 대비 변화와 흐름을 확인합니다</p>
          </div>
          <div className="filters">
            <div className="chip h-[38px] px-[13px] bg-[var(--surface)] border border-[var(--hairline)] rounded-[10px] text-[12.5px] text-[var(--ink-2)] flex items-center gap-2 shadow-[var(--shadow-sm)]">
              지점 <strong className="text-[var(--ink)] font-semibold">전체</strong>
            </div>
            <div className="seg">
              <button className={seg === "일간" ? "on" : ""} onClick={() => setSeg("일간")}>일간</button>
              <button className={seg === "주간" ? "on" : ""} onClick={() => setSeg("주간")}>주간</button>
              <button className={seg === "월간" ? "on" : ""} onClick={() => setSeg("월간")}>월간</button>
            </div>
          </div>
        </div>
      </div>

      <div className="kpi-row mt-5">
        <div className="kpi-card">
          <div className="kpi-label">누적 리뷰 수</div>
          <div className="kpi-val tnum">{totalReviews.toLocaleString()}</div>
          <div className="kpi-meta">
            <span className="delta up text-[var(--good)] font-semibold text-xs">최신 월 {latestMonth?.total || 0}건</span>
          </div>
          <svg className="spark" viewBox="0 0 88 32" preserveAspectRatio="none"><polyline fill="none" stroke="var(--s-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={generateSpark(true)}/></svg>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">평균 평점</div>
          <div className="kpi-val tnum">{latestMonth?.avgRating ? latestMonth.avgRating.toFixed(1) : "-"}</div>
          <div className="kpi-meta">
            <span className="delta vs font-semibold text-xs">최신 월 기준</span>
          </div>
          <svg className="spark" viewBox="0 0 88 32" preserveAspectRatio="none"><polyline fill="none" stroke="var(--warn)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={generateSpark(true)}/></svg>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">누적 긍정률</div>
          <div className="kpi-val tnum" style={{color:"var(--good)"}}>{currentPosPct}%</div>
          <div className="kpi-meta">
            <span className="delta up text-[var(--good)] font-semibold text-xs">분석된 {analyzed}건 기준</span>
          </div>
          <svg className="spark" viewBox="0 0 88 32" preserveAspectRatio="none"><polyline fill="none" stroke="var(--good)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={generateSpark(true)}/></svg>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">누적 부정률</div>
          <div className="kpi-val tnum" style={{color:"var(--critical)"}}>{currentNegPct}%</div>
          <div className="kpi-meta">
            <span className="delta vs font-semibold text-xs">분석된 {analyzed}건 기준</span>
          </div>
          <svg className="spark" viewBox="0 0 88 32" preserveAspectRatio="none"><polyline fill="none" stroke="var(--critical)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={generateSpark(false)}/></svg>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 pb-12">
        <div className="bg-[var(--surface)] border border-[var(--hairline)] rounded-[var(--r-lg)] shadow-[var(--shadow-sm)] p-6 lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-[15px] font-bold tracking-[-0.3px]">리뷰 추이</h3>
              <p className="text-[12px] text-[var(--muted)] mt-1">월별 집계 (최근 {trendData.length}개월)</p>
            </div>
            <div className="flex gap-4 text-[12px] font-semibold">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[var(--s-blue)]"></span>전체</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[var(--good)]"></span>긍정</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[var(--critical)]"></span>부정</span>
            </div>
          </div>
          
          <div className="h-[250px] flex items-end gap-2 border-b border-[var(--hairline)] pb-2 relative">
            {trendData.length === 0 && <div className="absolute inset-0 flex items-center justify-center text-[var(--muted)] text-sm">연-월을 알 수 있는 데이터가 없습니다.</div>}
            {trendData.map((d, i) => {
              const maxTotal = Math.max(...trendData.map(t => t.total), 1);
              const heightPct = (d.total / maxTotal) * 100;
              const posHeightPct = d.total > 0 ? (d.pos / d.total) * 100 : 0;
              const negHeightPct = d.total > 0 ? (d.neg / d.total) * 100 : 0;

              return (
                <div key={d.month} className="flex-1 flex flex-col items-center h-full justify-end group">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold text-[var(--ink)] mb-1 pb-1 px-1.5 rounded bg-[var(--surface-2)] shadow-sm whitespace-nowrap absolute top-0">
                    {d.month} ({d.total}건)
                  </div>
                  <div className="w-full relative flex items-end justify-center" style={{ height: `${heightPct}%` }}>
                    <div className="w-[60%] mx-auto bg-[var(--s-blue)] opacity-20 absolute inset-0 rounded-t-sm"></div>
                    <div className="w-[60%] mx-auto bg-[var(--good)] opacity-80 absolute bottom-0 rounded-t-sm" style={{ height: `${posHeightPct}%` }}></div>
                    <div className="w-[60%] mx-auto bg-[var(--critical)] opacity-80 absolute bottom-0 z-10 rounded-t-sm" style={{ height: `${negHeightPct}%` }}></div>
                  </div>
                  <div className="text-[10px] text-[var(--muted)] mt-2 whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
                    {d.month.slice(2)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-[var(--surface)] border border-[var(--hairline)] rounded-[var(--r-lg)] shadow-[var(--shadow-sm)] p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[15px] font-bold tracking-[-0.3px]">긍정 / 부정 비율</h3>
            <span className="text-[11px] font-semibold bg-[var(--surface-2)] px-2 py-1 rounded text-[var(--ink-2)]">{analyzed}건</span>
          </div>
          
          <div className="flex flex-col items-center gap-6 mt-4">
            <div className="relative w-[130px] h-[130px]">
              <svg width="130" height="130" viewBox="0 0 42 42" className="transform -rotate-90">
                <circle cx="21" cy="21" r="15.9" fill="none" stroke="#eee" strokeWidth="5"/>
                {analyzed > 0 && (
                  <>
                    <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--good)" strokeWidth="5"
                      strokeDasharray={`${currentPosPct} 100`} strokeDashoffset="0" strokeLinecap="round"/>
                    <circle cx="21" cy="21" r="15.9" fill="none" stroke="#cfcec8" strokeWidth="5"
                      strokeDasharray={`${Math.round(totalNeu/analyzed*100)} 100`} strokeDashoffset={`-${currentPosPct}`} />
                    <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--critical)" strokeWidth="5"
                      strokeDasharray={`${currentNegPct} 100`} strokeDashoffset={`-${currentPosPct + Math.round(totalNeu/analyzed*100)}`} strokeLinecap="round"/>
                  </>
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-xl font-bold">{currentPosPct}%</div>
                <div className="text-[10px] text-[var(--muted)]">긍정</div>
              </div>
            </div>
            
            <div className="w-full flex flex-col gap-2">
              <div className="flex justify-between text-sm py-1 border-b border-[var(--hairline)]">
                <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[var(--good)]"></span>긍정</span>
                <span className="font-semibold">{currentPosPct}% <span className="text-[var(--muted)] font-normal ml-1">{totalPos}건</span></span>
              </div>
              <div className="flex justify-between text-sm py-1 border-b border-[var(--hairline)]">
                <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#cfcec8]"></span>중립</span>
                <span className="font-semibold">{Math.round(totalNeu/analyzed*100) || 0}% <span className="text-[var(--muted)] font-normal ml-1">{totalNeu}건</span></span>
              </div>
              <div className="flex justify-between text-sm py-1 border-b border-[var(--hairline)]">
                <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[var(--critical)]"></span>부정</span>
                <span className="font-semibold">{currentNegPct}% <span className="text-[var(--muted)] font-normal ml-1">{totalNeg}건</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
