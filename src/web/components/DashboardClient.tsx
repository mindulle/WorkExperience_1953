"use client";

import React from "react";
import { MessageSquare, Star, ThumbsUp, ThumbsDown, Inbox } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Topbar } from "@/components/dashboard/Topbar";
import { KpiCard } from "@/components/dashboard/KpiCard";

export function DashboardClient({ initialData }: { initialData: any }) {
  const updatedAt = new Date(initialData.fetchedAt).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <>
      <Topbar updatedAt={updatedAt} />

      {/* KPI 행. 데이터가 없는 지표는 값을 지어내지 않고 사유를 표시한다. */}
      <div className="grid grid-cols-5 gap-[18px]">
        <KpiCard
          label="전체 리뷰 수"
          icon={MessageSquare}
          value={initialData.totalReviews.toLocaleString()}
          meta="정제 완료 기준 (RULES §2.3)"
        />
        <KpiCard
          label="평균 평점"
          icon={Star}
          pending="평점 수집 미구현"
        />
        <KpiCard
          label="긍정률"
          icon={ThumbsUp}
          value={String(initialData.positivePct)}
          unit="%"
          meta={`${Math.round(initialData.totalReviews * initialData.positivePct / 100).toLocaleString()}건`}
        />
        <KpiCard
          label="부정률"
          icon={ThumbsDown}
          value={String(initialData.negativePct)}
          unit="%"
          meta={`${Math.round(initialData.totalReviews * initialData.negativePct / 100).toLocaleString()}건`}
        />
        <KpiCard
          label="응답 필요 리뷰"
          icon={Inbox}
          pending="오너 콘솔 연동 필요"
        />
      </div>

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
