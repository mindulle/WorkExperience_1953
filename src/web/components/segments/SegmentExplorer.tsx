"use client";

import React, { useState } from "react";
import type { ReviewItem } from "@/lib/types";
import { DonutChart } from "@/components/dashboard/DonutChart";

// Colors for purposes
const PURPOSE_COLORS: Record<string, string> = {
  "외지/관광 방문": "var(--s-blue)",
  "현지인/단골": "var(--s-aqua)",
  "정보없음": "var(--muted)",
};

// 고객 유형별 고정 색상. PURPOSE_COLORS와 같은 컨벤션.
const CUSTOMER_TYPE_COLORS: Record<string, string> = {
  "직장인": "var(--s-blue)",
  "가족": "var(--s-aqua)",
  "학생": "var(--s-yellow)",
  "정보없음": "var(--muted)",
};

/** 값 배열에서 합계 100이 되는 비율(%) 목록을 낸다 (반올림 오차는 마지막 항목이 흡수). */
function toRatioList(values: string[]): Array<{ key: string; ratio: number }> {
  const counts: Record<string, number> = {};
  for (const v of values) {
    if (!v) continue;
    counts[v] = (counts[v] ?? 0) + 1;
  }
  const entries = Object.entries(counts);
  const total = entries.reduce((sum, [, n]) => sum + n, 0);
  if (total === 0) return [];
  let used = 0;
  return entries.map(([key, n], i) => {
    const isLast = i === entries.length - 1;
    const ratio = isLast ? 100 - used : Math.round((n / total) * 100);
    used += ratio;
    return { key, ratio };
  });
}

export function SegmentExplorer({
  reviews,
}: {
  reviews: ReviewItem[];
}) {
  // "기간"은 이 탭에서 의미가 애매해 걷어냈다 — 지점 필터만 실제로 동작하게 유지한다.
  const [branchFilter, setBranchFilter] = useState<string>("전체");

  const uniqueBranches = React.useMemo(() =>
    ["전체", ...Array.from(new Set(reviews.map(r => r.branch))).filter(Boolean).sort()],
    [reviews]
  );

  const filteredReviews = React.useMemo(() => {
    if (branchFilter === "전체") return reviews;
    return reviews.filter(r => r.branch === branchFilter);
  }, [reviews, branchFilter]);

  const purposes = React.useMemo(
    () => toRatioList(filteredReviews.map(r => r.purpose || "")).map(({ key, ratio }) => ({ purpose: key, ratio })),
    [filteredReviews]
  );
  const customerTypes = React.useMemo(
    () => toRatioList(filteredReviews.map(r => r.customerType || "")).map(({ key, ratio }) => ({ type: key, ratio })),
    [filteredReviews]
  );

  // 지점 필터가 바뀌면 이전에 선택했던 세그먼트가 새 목록에 없을 수 있어, 그럴 때만 첫 항목으로 대체한다.
  const [selectedSeg, setSelectedSeg] = useState<string>("");
  const effectiveSelectedSeg = purposes.some(p => p.purpose === selectedSeg) ? selectedSeg : (purposes[0]?.purpose ?? "");

  const selectedData = purposes.find(p => p.purpose === effectiveSelectedSeg);

  // 유형별 예시 리뷰 (최대 3건). AI가 근거를 남긴 건을 우선하고, 그 다음은 규칙 기반 매칭 건을 채운다.
  const typeSamples = React.useMemo(() => {
    const byType: Record<string, ReviewItem[]> = {};
    for (const type of ["직장인", "가족", "학생"]) {
      const withReason = filteredReviews.filter(r => r.customerType === type && r.customerTypeReason);
      const withoutReason = filteredReviews.filter(r => r.customerType === type && !r.customerTypeReason);
      byType[type] = [...withReason, ...withoutReason].slice(0, 3);
    }
    return byType;
  }, [filteredReviews]);

  return (
    <div className="flex flex-col h-full">
      <div className="topbar">
        <div className="tb-row">
          <div className="tb-title">
            <h1 className="text-2xl font-bold tracking-tight">고객 세그먼트</h1>
            <p className="text-[12.5px] text-[var(--muted)] mt-1">리뷰에 나타난 고객 유형별 반응을 비교합니다</p>
          </div>
          <div className="filters">
            <label className="chip h-[38px] px-[13px] bg-[var(--surface)] border border-[var(--hairline)] rounded-[10px] text-[12.5px] text-[var(--ink-2)] flex items-center gap-2 shadow-[var(--shadow-sm)] cursor-pointer">
              지점
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="font-semibold text-[var(--ink)] bg-transparent outline-none cursor-pointer"
              >
                {uniqueBranches.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
        
        {purposes.length > 0 && (
          <div className="seg-tabs">
            {purposes.map(p => {
              const color = PURPOSE_COLORS[p.purpose] || "var(--brand)";
              const isOn = effectiveSelectedSeg === p.purpose;
              return (
                <div 
                  key={p.purpose} 
                  className={`seg-tab ${isOn ? "on" : ""}`}
                  onClick={() => setSelectedSeg(p.purpose)}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }}></span>
                  <span className="lbl">{p.purpose}</span>
                  <span className="pct">{p.ratio}%</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 mb-6 mt-4">
        {selectedData ? (
          <div className="bg-[var(--surface)] border border-[var(--hairline)] rounded-[var(--r-lg)] shadow-[var(--shadow-sm)] flex flex-col overflow-hidden">
            <div className="px-6 py-5 border-b border-[var(--hairline)] bg-[var(--surface-2)]">
              <div className="text-[15px] font-bold tracking-[-0.3px] flex items-center gap-2">
                <span style={{ color: PURPOSE_COLORS[selectedData.purpose] || "var(--brand)" }}>●</span> 
                {selectedData.purpose} 세그먼트 요약
              </div>
              <div className="text-[12px] text-[var(--muted)] mt-1">{branchFilter === "전체" ? "전체 데이터 기반 분석" : `${branchFilter} 데이터 기반 분석`}</div>
            </div>
            <div className="skpi-row rounded-none border-0 border-t border-[var(--hairline)]">
              <div className="skpi">
                <div className="skpi-label">리뷰 비중</div>
                <div className="skpi-val tnum">{selectedData.ratio}%</div>
                <div className="skpi-cmp">전체 고객 세그먼트 중</div>
              </div>
              <div className="skpi">
                <div className="skpi-label">주 방문 목적</div>
                <div className="skpi-val text-[19px]">{selectedData.purpose}</div>
                <div className="skpi-cmp text-[var(--muted)]">리뷰 내 주요 텍스트 기반 분류</div>
              </div>
              <div className="skpi">
                <div className="skpi-label">데이터 특성</div>
                <div className="skpi-val text-[16px] text-[var(--muted)]">상세 통계 연동 대기</div>
                <div className="skpi-cmp">별점/키워드 등 상세 결합 필요</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-[var(--muted)] text-sm p-4 text-center">세그먼트 데이터가 없습니다.</div>
        )}
      </div>

      {/* 이슈 #124: 방문 목적 도넛(실데이터) + 방문자 고객 유형(연동 대기). */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-[var(--surface)] border border-[var(--hairline)] rounded-[var(--r-lg)] shadow-[var(--shadow-sm)] p-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-[15px] font-bold tracking-[-0.3px]">방문 목적</h3>
            <span className="text-[11px] font-semibold bg-[var(--surface-2)] px-2 py-1 rounded text-[var(--ink-2)]">
              리뷰 본문 언급 기반
            </span>
          </div>
          {purposes.length > 0 ? (
            <>
              <DonutChart
                segments={purposes.map((p) => ({
                  label: p.purpose,
                  ratio: p.ratio,
                  color: PURPOSE_COLORS[p.purpose] ?? "var(--muted)",
                }))}
              />
              <div className="flex flex-col gap-1.5 mt-2 text-sm">
                {purposes.map((p) => (
                  <span key={p.purpose} className="flex items-center gap-1.5">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: PURPOSE_COLORS[p.purpose] ?? "var(--muted)" }}
                    />
                    {p.purpose} {p.ratio}%
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="text-[var(--muted)] text-sm p-4 text-center">데이터가 없습니다.</div>
          )}
        </div>

        {/* 방문자 고객 유형(직장인/가족/학생). rule_classifier.py의 키워드 규칙으로 먼저 분류하고,
            근거가 없던 "정보없음" 리뷰만 AI가 문맥으로 추측해 보완한다 (근거는 아래 카드에서 확인). */}
        <div className="bg-[var(--surface)] border border-[var(--hairline)] rounded-[var(--r-lg)] shadow-[var(--shadow-sm)] p-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-[15px] font-bold tracking-[-0.3px]">방문자 고객 유형</h3>
            <span className="text-[11px] font-semibold bg-[var(--surface-2)] px-2 py-1 rounded text-[var(--ink-2)]">
              규칙 + AI 추측
            </span>
          </div>
          {customerTypes.length > 0 ? (
            <div className="kw mt-2">
              {(() => {
                const maxRatio = Math.max(...customerTypes.map((c) => c.ratio));
                return customerTypes.map((c) => (
                  <div key={c.type} className="kw-row">
                    <span className="kw-name">{c.type}</span>
                    <span className="kw-track">
                      <span
                        className="kw-fill"
                        style={{
                          width: `${maxRatio > 0 ? (c.ratio / maxRatio) * 100 : 0}%`,
                          background: CUSTOMER_TYPE_COLORS[c.type] ?? "var(--muted)",
                        }}
                      />
                    </span>
                    <span className="kw-val tnum">{c.ratio}%</span>
                  </div>
                ));
              })()}
            </div>
          ) : (
            <div className="flex items-center justify-center border border-dashed border-gray-200 bg-[var(--plane)] rounded-lg text-[var(--muted)] text-sm text-center p-4 min-h-[180px]">
              미구현<br />(파이프라인에 customer_type 반영 후 자동 표시됩니다)
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-12">
        {(["직장인", "가족", "학생"] as const).map((type) => {
          const stat = customerTypes.find((c) => c.type === type);
          const samples = typeSamples[type] ?? [];
          return (
            <div key={type} className="bg-[var(--surface)] border border-[var(--hairline)] rounded-[var(--r-lg)] shadow-[var(--shadow-sm)] p-6 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[15px] font-bold tracking-[-0.3px] flex items-center gap-2">
                  <span style={{ color: CUSTOMER_TYPE_COLORS[type] }}>●</span> {type}
                </h3>
                <span className="text-[12px] font-semibold text-[var(--muted)]">{stat ? `${stat.ratio}%` : "-"}</span>
              </div>
              {samples.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {samples.map((r) => (
                    <div key={r.id} className="p-3 border border-[var(--hairline)] rounded-[10px] bg-[var(--plane)]">
                      <p className="text-[12.5px] text-[var(--ink-2)] line-clamp-2">{r.content}</p>
                      {r.customerTypeReason && (
                        <p className="text-[11.5px] text-[var(--brand)] mt-1.5">✨ {r.customerTypeReason}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-[var(--muted)] text-[12.5px] text-center py-6">
                  해당 유형으로 분류된 리뷰가 아직 없습니다.
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
