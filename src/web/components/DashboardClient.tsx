"use client";

import React, { useState } from "react";
import { DatePicker } from "@/components/ui/DatePicker";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";

export function DashboardClient({ initialData }: { initialData: any }) {
  const [branch, setBranch] = useState("all");
  const todayDate = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).replace(/\.$/, '');

  return (
    <>
      {/* 상단 헤더 (지점 및 채널 필터) */}
      <header className="flex justify-between items-center relative z-50 bg-[var(--surface)] p-5 rounded-[var(--r-lg)] border border-[var(--hairline)] [box-shadow:var(--shadow-sm)]">
        <h2 className="text-2xl font-bold whitespace-nowrap">실시간 분석 리포트</h2>
        <div className="flex gap-6 items-center shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold whitespace-nowrap text-[var(--muted)]">지점 선택:</span>
            <Select
              options={[
                { value: "all", label: "전체 지점" },
                { value: "main", label: "경성대본점" },
                { value: "gwangan", label: "광안점" }
              ]}
              selected={branch}
              onSelect={setBranch}
              className="min-w-36"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold whitespace-nowrap text-[var(--muted)]">채널:</span>
            <Select
              options={[
                { value: "all", label: "통합 (네이버+유튜브)" },
                { value: "naver", label: "네이버 리뷰" },
                { value: "youtube", label: "유튜브 댓글" }
              ]}
              selected="all"
              className="min-w-44"
            />
          </div>
        </div>
      </header>

      {/* 조회 기간 툴바.
          프로토타입에서 사이드바는 내비게이션 전용이고 필터는 페이지 상단에 있다. */}
      <section className="flex flex-wrap items-end gap-4 bg-[var(--surface)] p-5 rounded-[var(--r-lg)] border border-[var(--hairline)] [box-shadow:var(--shadow-sm)]">
        <div className="bg-[var(--s-blue-soft)] px-4 py-2.5 rounded-[var(--r-sm)] border border-[var(--hairline)]">
          <p className="font-semibold text-sm text-[var(--brand)]">{todayDate} (오늘)</p>
          <p className="text-xs text-[var(--muted)]">기본값 적용됨</p>
        </div>
        <DatePicker label="시작일" className="w-44" />
        <DatePicker label="종료일" className="w-44" />
        <Button onClick={() => alert('조회 기간 필터 적용!')}>기간 적용</Button>
      </section>

      {/* 대시보드 그리드 영역 */}
      <div className="grid grid-cols-3 gap-5 flex-1">

        {/* 1. 긍정/부정 리뷰 (도넛 그래프) */}
        <Card className="col-span-1 flex flex-col">
          <h3 className="text-base font-bold mb-4">감성 분석 (긍/부정) - {initialData.totalReviews.toLocaleString()}건</h3>
          <div className="flex-1 flex items-center justify-center border border-dashed border-gray-200 rounded-full w-40 h-40 mx-auto my-4 relative">
            <span className="text-[var(--muted)] absolute text-xs text-center">도넛 차트<br/>렌더링 영역</span>
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90 opacity-30">
              <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--brand)" strokeWidth="20" strokeDasharray={`${initialData.positivePct * 2.51} 251`} />
              <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--critical)" strokeWidth="20" strokeDasharray={`${initialData.negativePct * 2.51} 251`} strokeDashoffset={`-${initialData.positivePct * 2.51}`} />
            </svg>
          </div>
          <div className="flex justify-around mt-4 text-sm">
            <span className="text-[var(--brand)] font-semibold">긍정 {initialData.positivePct}%</span>
            <span className="text-[var(--critical)] font-semibold">부정 {initialData.negativePct}%</span>
          </div>
        </Card>

        {/* 2. 월별 추이 (막대 그래프) - 미구현 */}
        <Card className="col-span-2 flex flex-col">
          <h3 className="text-base font-bold mb-4">월별 리뷰 추이 (시즌 비교)</h3>
          <div className="flex-1 flex items-center justify-center border border-dashed border-gray-200 bg-[var(--plane)] rounded-lg text-[var(--muted)] text-sm h-40">
            미구현 (추후 데이터 연동 및 차트 구현 예정)
          </div>
        </Card>

        {/* 3. 메뉴 데이터 (프로그레스 바) - 미구현 */}
        <Card className="col-span-1 flex flex-col">
          <h3 className="text-base font-bold mb-4">긍정 추천 메뉴</h3>
          <div className="flex-1 flex items-center justify-center border border-dashed border-gray-200 bg-[var(--plane)] rounded-lg text-[var(--muted)] text-sm min-h-28">
            미구현 (메뉴 키워드 추출 파이프라인 연동 필요)
          </div>
        </Card>

        {/* 4. 방문 목적 (도넛 차트) - 미구현 */}
        <Card className="col-span-1 flex flex-col">
          <h3 className="text-base font-bold mb-4">방문 목적 (타깃 분석)</h3>
          <div className="flex-1 flex items-center justify-center border border-dashed border-gray-200 bg-[var(--plane)] rounded-lg text-[var(--muted)] text-sm min-h-28">
            미구현 (방문 목적 분류 모델 적용 필요)
          </div>
        </Card>

        {/* 5. 지점별 강점 & 6. 키워드 분석 - 미구현 */}
        <div className="col-span-1 flex flex-col gap-4">
          <Card className="flex-1 flex flex-col">
            <h3 className="text-base font-bold mb-2">지점별 강점 (경쟁우위)</h3>
            <div className="flex-1 border border-dashed border-gray-200 flex items-center justify-center text-[var(--muted)] bg-[var(--plane)] rounded-lg text-center text-sm p-4">
              미구현<br/>(지점별 차원 분석 데이터 필요)
            </div>
          </Card>

          <Card className="flex-1 flex flex-col">
            <h3 className="text-base font-bold mb-2">Top 5 핵심 키워드</h3>
            <div className="flex-1 border border-dashed border-gray-200 flex items-center justify-center text-[var(--muted)] bg-[var(--plane)] rounded-lg text-center text-sm p-4">
              미구현<br/>(워드클라우드/키워드 추출 연동 예정)
            </div>
          </Card>
        </div>

      </div>
    </>
  );
}
