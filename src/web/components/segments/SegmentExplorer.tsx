"use client";

import React, { useState } from "react";
import type { DashboardData } from "@/lib/types";
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

export function SegmentExplorer({
  purposes,
  customerTypes,
}: {
  purposes: DashboardData["purposes"];
  customerTypes: DashboardData["customerTypes"];
}) {
  const [selectedSeg, setSelectedSeg] = useState<string>(purposes[0]?.purpose || "");

  const selectedData = purposes.find(p => p.purpose === selectedSeg);
  
  // Calculate max ratio for mini-track
  const maxRatio = Math.max(...purposes.map(p => p.ratio));

  return (
    <div className="flex flex-col h-full">
      <div className="topbar">
        <div className="tb-row">
          <div className="tb-title">
            <h1 className="text-2xl font-bold tracking-tight">고객 세그먼트</h1>
            <p className="text-[12.5px] text-[var(--muted)] mt-1">리뷰에 나타난 고객 유형별 반응을 비교합니다</p>
          </div>
          <div className="filters">
            <div className="chip h-[38px] px-[13px] bg-[var(--surface)] border border-[var(--hairline)] rounded-[10px] text-[12.5px] text-[var(--ink-2)] flex items-center gap-2 shadow-[var(--shadow-sm)]">
              지점 <strong className="text-[var(--ink)] font-semibold">전체</strong>
            </div>
            <div className="chip h-[38px] px-[13px] bg-[var(--surface)] border border-[var(--hairline)] rounded-[10px] text-[12.5px] text-[var(--ink-2)] flex items-center gap-2 shadow-[var(--shadow-sm)]">
              기간 <strong className="text-[var(--ink)] font-semibold">전체 데이터</strong>
            </div>
          </div>
        </div>
        
        {purposes.length > 0 && (
          <div className="seg-tabs">
            {purposes.map(p => {
              const color = PURPOSE_COLORS[p.purpose] || "var(--brand)";
              const isOn = selectedSeg === p.purpose;
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
              <div className="text-[12px] text-[var(--muted)] mt-1">전체 데이터 기반 분석</div>
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

        {/* 방문자 고객 유형(직장인/가족/학생). rule_classifier.py/ai_engine.py의 customer_type
            컬럼이 시트에 반영되기 전까지는 customerTypes가 빈 배열이라 안내 문구로 저하된다. */}
        <div className="bg-[var(--surface)] border border-[var(--hairline)] rounded-[var(--r-lg)] shadow-[var(--shadow-sm)] p-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-[15px] font-bold tracking-[-0.3px]">방문자 고객 유형</h3>
            <span className="text-[11px] font-semibold bg-[var(--surface-2)] px-2 py-1 rounded text-[var(--ink-2)]">
              규칙 기반 분류
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
        <div className="bg-[var(--surface)] border border-[var(--hairline)] rounded-[var(--r-lg)] shadow-[var(--shadow-sm)] p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[15px] font-bold tracking-[-0.3px]">세그먼트 비교</h3>
            <span className="text-[11px] font-semibold bg-[var(--surface-2)] px-2 py-1 rounded text-[var(--ink-2)]">비율순</span>
          </div>
          
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-[var(--hairline)]">
                <th className="py-3 font-semibold text-[var(--muted)]">유형</th>
                <th className="py-3 font-semibold text-[var(--muted)] text-right">리뷰 비중</th>
              </tr>
            </thead>
            <tbody>
              {purposes.map((p) => {
                const color = PURPOSE_COLORS[p.purpose] || "var(--brand)";
                return (
                  <tr key={p.purpose} className="border-b border-[var(--hairline)]">
                    <td className="py-4">
                      <span className="seg-name">
                        <span className="w-2 h-2 rounded-full" style={{ background: color }}></span>
                        {p.purpose}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <span className="mini-track mr-2">
                        <span className="mini-fill" style={{ width: `${(p.ratio / maxRatio) * 100}%`, background: color }}></span>
                      </span>
                      <span className="tnum font-semibold">{p.ratio}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
}
