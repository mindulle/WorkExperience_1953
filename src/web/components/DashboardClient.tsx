"use client";

import React from "react";
import { MessageSquare, Star, ThumbsUp, ThumbsDown, Inbox } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Topbar } from "@/components/dashboard/Topbar";
import { KpiCard } from "@/components/dashboard/KpiCard";
import type { DashboardData } from "@/lib/types";

// "정보없음"은 축소하지 않고 실제 비중대로 muted 색으로 크게 보여준다 (데이터 한계를 숨기지 않음).
const PURPOSE_COLORS: Record<string, string> = {
  "외지/관광 방문": "var(--s-blue)",
  "현지인/단골": "var(--s-aqua)",
  "정보없음": "var(--muted)",
};

export function DashboardClient({
  initialData,
  updatedAt,
}: {
  initialData: DashboardData;
  /**
   * 서버에서 포맷해 내려받는다. 클라이언트 컴포넌트에서 toLocaleString 을
   * 부르면 Node 와 브라우저의 ICU 데이터가 달라("PM" vs "오후")
   * 하이드레이션 불일치가 발생한다.
   */
  updatedAt: string;
}) {
  return (
    <>
      <Topbar updatedAt={updatedAt} source={initialData.source} />

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

        {/* 2. 월별 추이 (막대 그래프) */}
        <Card className="col-span-2 flex flex-col">
          <h3 className="text-base font-bold mb-4">월별 리뷰 추이 (시즌 비교)</h3>
          {initialData.monthlyTrend.length > 0 ? (
            <>
              <div className="flex-1 flex items-end gap-2 h-40 px-1">
                {(() => {
                  const maxCount = Math.max(...initialData.monthlyTrend.map((m) => m.count));
                  return initialData.monthlyTrend.map((m) => {
                    const [year, mon] = m.month.split("-");
                    const heightPct = maxCount > 0 ? (m.count / maxCount) * 100 : 0;
                    return (
                      <div key={m.month} className="flex-1 flex flex-col items-center h-full justify-end gap-1">
                        <span className="text-[10px] text-[var(--muted)] [font-variant-numeric:tabular-nums]">
                          {m.count}
                        </span>
                        <div
                          className="w-full rounded-t-[4px] bg-[var(--brand)]"
                          style={{ height: `${Math.max(heightPct, 2)}%` }}
                          title={`${m.month}: ${m.count}건${m.avgRating ? `, 평균 ${m.avgRating}점` : ""}`}
                        />
                        <span className="text-[10px] text-[var(--muted)] mt-1 whitespace-nowrap">
                          {mon}월{mon === "01" ? ` '${year.slice(2)}` : ""}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
              <p className="mt-3 text-[11px] text-[var(--muted)]">
                연-월을 알 수 있는 리뷰만 집계했습니다 (상대 날짜 &ldquo;N년 전&rdquo;만 있는 리뷰는 월 단위를 알 수 없어 제외 — 자세한 내용은 이슈 #68 참고).
              </p>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center border border-dashed border-gray-200 bg-[var(--plane)] rounded-lg text-[var(--muted)] text-sm h-40">
              미구현 (추후 데이터 연동 및 차트 구현 예정)
            </div>
          )}
        </Card>

        {/* 3. 메뉴 데이터 (프로그레스 바) */}
        <Card className="col-span-1 flex flex-col">
          <h3 className="text-base font-bold mb-4">긍정 추천 메뉴</h3>
          {initialData.menuRanking.length > 0 ? (
            <div className="flex-1 flex flex-col justify-center gap-3">
              {(() => {
                const maxCount = Math.max(...initialData.menuRanking.map((m) => m.count));
                return initialData.menuRanking.map((m) => (
                  <div key={m.menu}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{m.menu}</span>
                      <span className="text-[var(--muted)] [font-variant-numeric:tabular-nums]">{m.count}건</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--plane)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--brand)]"
                        style={{ width: `${maxCount > 0 ? (m.count / maxCount) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ));
              })()}
              <p className="mt-1 text-[11px] text-[var(--muted)]">
                긍정 리뷰에서 언급된 메뉴만 집계했습니다.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center border border-dashed border-gray-200 bg-[var(--plane)] rounded-lg text-[var(--muted)] text-sm min-h-28">
              미구현 (메뉴 키워드 추출 파이프라인 연동 필요)
            </div>
          )}
        </Card>

        {/* 4. 방문 목적 (도넛 차트) */}
        <Card className="col-span-1 flex flex-col">
          <h3 className="text-base font-bold mb-4">방문 목적 (타깃 분석)</h3>
          {initialData.purposes.length > 0 ? (
            <>
              {/* 리뷰 본문에 방문 목적을 알 수 있는 언급이 있는 경우만 분류 가능하다.
                  대부분은 언급이 없어 "정보없음"이 압도적으로 크며, 이는 데이터 한계이지
                  실제로 방문자 대부분의 목적이 불명확하다는 뜻이 아니다 — 축소 표시하지 않는다. */}
              <div className="flex-1 flex items-center justify-center relative w-40 h-40 mx-auto my-4">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  {(() => {
                    let offset = 0;
                    return initialData.purposes.map((p) => {
                      const dash = (p.ratio / 100) * 251;
                      const el = (
                        <circle
                          key={p.purpose}
                          cx="50"
                          cy="50"
                          r="40"
                          fill="transparent"
                          stroke={PURPOSE_COLORS[p.purpose] ?? "var(--muted)"}
                          strokeWidth="20"
                          strokeDasharray={`${dash} ${251 - dash}`}
                          strokeDashoffset={`-${offset}`}
                        />
                      );
                      offset += dash;
                      return el;
                    });
                  })()}
                </svg>
              </div>
              <div className="flex flex-col gap-1.5 mt-2 text-sm">
                {initialData.purposes.map((p) => (
                  <span key={p.purpose} className="flex items-center gap-1.5">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: PURPOSE_COLORS[p.purpose] ?? "var(--muted)" }}
                    />
                    {p.purpose} {p.ratio}%
                  </span>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-[var(--muted)]">
                리뷰 본문에 방문 목적이 직접 언급된 경우만 분류했습니다. 대부분 언급이 없어 &ldquo;정보없음&rdquo;이 큰 비중을 차지합니다.
              </p>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center border border-dashed border-gray-200 bg-[var(--plane)] rounded-lg text-[var(--muted)] text-sm min-h-28">
              미구현 (방문 목적 분류 모델 적용 필요)
            </div>
          )}
        </Card>

        {/* 5. 지점별 강점 & 6. 키워드 분석 */}
        <div className="col-span-1 flex flex-col gap-4">
          <Card className="flex-1 flex flex-col">
            <h3 className="text-base font-bold mb-2">지점별 강점 (경쟁우위)</h3>
            {initialData.branchStats.length > 0 ? (
              <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
                {initialData.branchStats.map((b, i) => (
                  <div key={b.branch} className="flex items-center justify-between text-sm py-1 border-b border-[var(--hairline)] last:border-0">
                    <div>
                      <span className="font-medium">
                        {i === 0 && "🏆 "}
                        {b.branch}
                      </span>
                      <div className="text-[11px] text-[var(--muted)]">
                        {b.reviewCount}건{b.avgRating !== undefined ? ` · 평균 ${b.avgRating}점` : ""}
                        {b.reviewCount < 10 ? " (표본 적음)" : ""}
                      </div>
                    </div>
                    <span className="font-semibold text-[var(--brand)] [font-variant-numeric:tabular-nums]">
                      긍정 {b.positivePct}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 border border-dashed border-gray-200 flex items-center justify-center text-[var(--muted)] bg-[var(--plane)] rounded-lg text-center text-sm p-4">
                미구현<br/>(지점별 차원 분석 데이터 필요)
              </div>
            )}
          </Card>

          <Card className="flex-1 flex flex-col">
            <h3 className="text-base font-bold mb-2">Top 5 핵심 키워드</h3>
            {initialData.topKeywords.length > 0 ? (
              <div className="flex-1 flex flex-wrap content-center items-center justify-center gap-2 p-2">
                {(() => {
                  const maxCount = Math.max(...initialData.topKeywords.map((k) => k.count));
                  return initialData.topKeywords.map((k) => {
                    // 언급량 비례로 칩 크기를 다르게 해 워드클라우드 느낌을 낸다.
                    const scale = maxCount > 0 ? k.count / maxCount : 0;
                    const fontPx = 13 + Math.round(scale * 11); // 13~24px
                    return (
                      <span
                        key={k.keyword}
                        className="inline-flex items-center gap-1 rounded-full bg-[var(--s-blue-soft)] text-[var(--brand)] font-semibold px-3 py-1"
                        style={{ fontSize: `${fontPx}px` }}
                      >
                        {k.keyword}
                        <span className="text-[10px] font-normal text-[var(--muted)]">{k.count}</span>
                      </span>
                    );
                  });
                })()}
              </div>
            ) : (
              <div className="flex-1 border border-dashed border-gray-200 flex items-center justify-center text-[var(--muted)] bg-[var(--plane)] rounded-lg text-center text-sm p-4">
                미구현<br/>(워드클라우드/키워드 추출 연동 예정)
              </div>
            )}
          </Card>
        </div>

      </div>
    </>
  );
}
