"use client";

import React, { useState, useMemo } from "react";
import { Mail } from "lucide-react";
import type { ReviewItem, BranchStat } from "@/lib/types";

// 별도 Cloudflare Worker(src/mail-sender/)를 통해서만 실제 발송이 이뤄진다.
// RULES §3.2: 프론트엔드는 트리거만 하고, 발송 로직/키는 백엔드(Worker)에만 둔다.
const MAIL_WORKER_URL = process.env.NEXT_PUBLIC_MAIL_WORKER_URL || "";
// 지점별 담당자 이메일 매핑이 아직 없어(이슈 #131 프로토타입 범위), 보낼 때마다 직접 입력받는다.
const RECIPIENT_STORAGE_KEY = "1953-dashboard-mail-recipient";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SortKey = "reviewCount" | "avgRating" | "positivePct";
const SORT_LABELS: Record<SortKey, string> = {
  reviewCount: "리뷰 수",
  avgRating: "평점",
  positivePct: "긍정률",
};

export function BranchExplorer({
  branchStats,
  reviews
}: {
  branchStats: BranchStat[];
  reviews: ReviewItem[];
}) {
  const [selectedBranch, setSelectedBranch] = useState<string | null>(branchStats[0]?.branch || null);
  const [sortKey, setSortKey] = useState<SortKey>("reviewCount");
  const [mailStatus, setMailStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [mailError, setMailError] = useState<string | null>(null);
  // 마지막으로 입력했던 수신자 이메일을 기억해 매번 다시 칠 필요가 없게 한다.
  // 정적 export라 서버에는 이 값이 없고, 클라이언트 최초 렌더에서만 채워진다.
  const [recipientEmail, setRecipientEmail] = useState(
    () => (typeof window !== "undefined" ? window.localStorage.getItem(RECIPIENT_STORAGE_KEY) ?? "" : "")
  );

  async function handleSendMail(branch: string) {
    if (!MAIL_WORKER_URL) {
      setMailStatus("error");
      setMailError("메일 발송 서버가 설정되지 않았습니다 (src/mail-sender/README.md 참고).");
      return;
    }
    if (!EMAIL_PATTERN.test(recipientEmail)) {
      setMailStatus("error");
      setMailError("올바른 수신자 이메일을 입력해주세요.");
      return;
    }
    window.localStorage.setItem(RECIPIENT_STORAGE_KEY, recipientEmail);
    setMailStatus("sending");
    setMailError(null);
    try {
      const res = await fetch(MAIL_WORKER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branch,
          to: recipientEmail,
          subject: `[1953형제돼지국밥] ${branch} 리뷰 현황 알림`,
          message: `${branch} 지점의 리뷰 현황을 확인해주세요. 대시보드에서 상세 내용을 볼 수 있습니다.`,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "알 수 없는 오류");
      setMailStatus("sent");
    } catch (e) {
      setMailStatus("error");
      setMailError(e instanceof Error ? e.message : "메일 전송에 실패했습니다.");
    }
  }

  // 이슈 #124: 대시보드에 있던 "지점별 강점(경쟁우위)"를 지점 관리 탭으로 이동.
  const rankedStats = useMemo(() => {
    return [...branchStats].sort((a, b) => (b[sortKey] ?? 0) - (a[sortKey] ?? 0));
  }, [branchStats, sortKey]);
  const maxReviewCount = Math.max(1, ...branchStats.map((b) => b.reviewCount));

  // 전사 평균 계산
  const totalReviews = branchStats.reduce((acc, b) => acc + b.reviewCount, 0);
  const companyAvgRating = branchStats.filter(b => b.avgRating !== undefined).reduce((acc, b) => acc + (b.avgRating || 0) * b.reviewCount, 0) / totalReviews;
  const companyPosPct = Math.round(branchStats.reduce((acc, b) => acc + b.positivePct * b.reviewCount, 0) / totalReviews);

  const selectedStat = branchStats.find(b => b.branch === selectedBranch);

  const isLowPos = selectedStat && selectedStat.positivePct < companyPosPct - 5;
  const isLowRating = selectedStat && selectedStat.avgRating && selectedStat.avgRating < companyAvgRating - 0.2;

  return (
    <div className="flex flex-col h-full">
      <div className="topbar">
        <div className="tb-row">
          <div className="tb-title">
            <h1 className="text-2xl font-bold tracking-tight">지점 관리</h1>
            <p className="text-[12.5px] text-[var(--muted)] mt-1">
              {branchStats.length}개 지점 운영 현황 · 카드를 클릭해 상세 정보를 확인하세요
            </p>
          </div>
        </div>
      </div>

      <div className="bcard-row mt-4 pb-2">
        {branchStats.map((b, idx) => {
          const isSelected = b.branch === selectedBranch;
          const statusBg = b.positivePct >= 80 ? "var(--good)" : b.positivePct < 70 ? "var(--critical)" : "var(--warn)";
          const needsAttention = b.positivePct < 70;

          return (
            <div 
              key={b.branch} 
              className={`bcard ${isSelected ? "selected" : ""}`}
              onClick={() => {
                setSelectedBranch(b.branch);
                setMailStatus("idle");
                setMailError(null);
              }}
            >
              {needsAttention && <div className="bcard-badge crit">긴급</div>}
              <div className="bcard-top">
                <span className="bcard-rank">{idx + 1}</span>
                <span className="status-dot" style={{ background: statusBg }}></span>
              </div>
              <div className="bcard-name">{b.branch}</div>
              <div className="bcard-stats">
                <div className="bstat-row">리뷰 수 <b className="tnum">{b.reviewCount.toLocaleString()}</b></div>
                <div className="bstat-row">평점 <b className="tnum">{b.avgRating ? b.avgRating.toFixed(1) : "-"}</b></div>
                <div className="bstat-row">
                  긍정률 <b className="tnum" style={{ color: statusBg }}>{b.positivePct}%</b>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-[var(--surface)] border border-[var(--hairline)] rounded-[var(--r-lg)] shadow-[var(--shadow-sm)] p-6 mb-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <div className="text-[15px] font-bold tracking-[-0.3px]">지점별 강점 (경쟁 우위)</div>
            <div className="text-[12px] text-[var(--muted)] mt-1">리뷰 수 기준 정렬 · 긍정률과 평점 함께 확인</div>
          </div>
          <div className="seg">
            {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
              <button key={key} className={sortKey === key ? "on" : ""} onClick={() => setSortKey(key)}>
                {SORT_LABELS[key]}
              </button>
            ))}
          </div>
        </div>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-[12px] text-[var(--muted)] border-b border-[var(--hairline)]">
              <th className="py-2 font-medium w-[22%]">지점</th>
              <th className="py-2 font-medium w-[26%]">리뷰 수</th>
              <th className="py-2 font-medium w-[12%] text-right">평점</th>
              <th className="py-2 font-medium w-[28%]">감성 구성 (긍정·중립·부정)</th>
              <th className="py-2 font-medium w-[12%] text-right">긍정률</th>
            </tr>
          </thead>
          <tbody>
            {rankedStats.map((b, idx) => {
              const neutralPct = Math.max(0, 100 - b.positivePct - b.negativePct);
              const badgeColor =
                b.positivePct >= 80 ? "var(--good)" : b.positivePct < 70 ? "var(--critical)" : "var(--warn)";
              const badgeBg =
                b.positivePct >= 80 ? "var(--good-soft)" : b.positivePct < 70 ? "var(--critical-soft)" : "var(--warn-soft)";
              return (
                <tr key={b.branch} className="border-b border-[var(--hairline)] last:border-0">
                  <td className="py-2.5">
                    <span className="inline-flex items-center gap-2 font-semibold">
                      <span className="w-5 h-5 rounded-[5px] bg-[var(--surface-2)] border border-[var(--hairline)] flex items-center justify-center text-[11px] font-bold text-[var(--ink-2)]">
                        {idx + 1}
                      </span>
                      {b.branch}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <span className="mini-track mr-2">
                      <span
                        className="mini-fill"
                        style={{ width: `${(b.reviewCount / maxReviewCount) * 100}%`, background: "var(--brand)" }}
                      />
                    </span>
                    <span className="tnum">{b.reviewCount.toLocaleString()}</span>
                  </td>
                  <td className="py-2.5 text-right tnum">{b.avgRating ? b.avgRating.toFixed(1) : "-"}</td>
                  <td className="py-2.5">
                    <span className="inline-flex w-full h-1.5 rounded-full overflow-hidden bg-[var(--plane)]">
                      <span style={{ width: `${b.positivePct}%`, background: "var(--good)" }} />
                      <span style={{ width: `${neutralPct}%`, background: "#cfcec8" }} />
                      <span style={{ width: `${b.negativePct}%`, background: "var(--critical)" }} />
                    </span>
                  </td>
                  <td className="py-2.5 text-right">
                    <span
                      className="inline-flex px-2 py-0.5 rounded-md text-[12px] font-semibold tnum"
                      style={{ color: badgeColor, background: badgeBg }}
                    >
                      {b.positivePct}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedStat && (
        <div className="flex-1 mt-4">
          <div className="detail-header">
            <div className="dh-left">
              <div className="dh-icon">{selectedStat.branch.charAt(0)}</div>
              <div>
                <div className="dh-name">
                  {selectedStat.branch}
                  {(isLowPos || isLowRating) && (
                    <span className="dh-status">● 집중 관리 필요</span>
                  )}
                </div>
                <div className="dh-meta">1953형제돼지국밥 · {selectedStat.reviewCount.toLocaleString()}개의 누적 리뷰</div>
              </div>
            </div>
            <div className="dh-actions flex-col items-end!">
              {mailStatus === "sent" ? (
                <span className="text-[12.5px] font-semibold text-[var(--good)]">✓ 메일을 전송했습니다</span>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="담당자 이메일 입력"
                    className="h-9 px-3 rounded-[10px] text-[12.5px] border border-[var(--hairline)] bg-[var(--surface)] w-[190px]"
                  />
                  <button
                    onClick={() => handleSendMail(selectedStat.branch)}
                    disabled={mailStatus === "sending"}
                    className="inline-flex items-center gap-2 h-9 px-3.5 rounded-[10px] text-[12.5px] font-semibold border border-[var(--hairline)] bg-[var(--surface)] shadow-[var(--shadow-sm)] disabled:opacity-50 shrink-0"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    {mailStatus === "sending" ? "전송 중..." : "메일 전송"}
                  </button>
                </div>
              )}
              {mailStatus === "error" && mailError && (
                <div className="text-[11.5px] text-[var(--critical)] mt-1.5 max-w-[300px] text-right">{mailError}</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 mb-6">
            <div className="bg-[var(--surface)] border border-[var(--hairline)] rounded-[var(--r-lg)] shadow-[var(--shadow-sm)] flex flex-col overflow-hidden">
              <div className="px-6 py-5 border-b border-[var(--hairline)] bg-[var(--surface-2)]">
                <div className="text-[15px] font-bold tracking-[-0.3px]">전사 평균 대비 성과</div>
                <div className="text-[12px] text-[var(--muted)] mt-1">최근 수집된 전체 데이터 기준</div>
              </div>
              <div className="mkpi-row rounded-none border-0 border-t border-[var(--hairline)]">
                <div className="mkpi">
                  <div className="mkpi-label">리뷰 수 비중</div>
                  <div className="mkpi-val tnum">{Math.round((selectedStat.reviewCount / totalReviews) * 100)}%</div>
                  <div className="mkpi-cmp">전체 {totalReviews.toLocaleString()}건 중 {selectedStat.reviewCount.toLocaleString()}건</div>
                </div>
                <div className="mkpi">
                  <div className="mkpi-label">평균 평점</div>
                  <div className="mkpi-val tnum">{selectedStat.avgRating ? selectedStat.avgRating.toFixed(1) : "-"}</div>
                  <div className={`mkpi-cmp ${isLowRating ? "bad" : "good"}`}>
                    {selectedStat.avgRating && selectedStat.avgRating < companyAvgRating ? "▼" : "▲"} 전사 평균 {companyAvgRating.toFixed(1)} 대비
                  </div>
                </div>
                <div className="mkpi">
                  <div className="mkpi-label">긍정률</div>
                  <div className="mkpi-val tnum" style={{ color: selectedStat.positivePct < 70 ? "var(--critical)" : "var(--good)" }}>
                    {selectedStat.positivePct}%
                  </div>
                  <div className={`mkpi-cmp ${isLowPos ? "bad" : "good"}`}>
                    {selectedStat.positivePct < companyPosPct ? "▼" : "▲"} 전사 평균 {companyPosPct}% 대비
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
            <div className="bg-[var(--surface)] border border-[var(--hairline)] rounded-[var(--r-lg)] shadow-[var(--shadow-sm)] p-6">
              <h3 className="text-[15px] font-bold tracking-[-0.3px] mb-4">{selectedStat.branch} 최근 리뷰</h3>
              <div className="flex flex-col gap-3">
                {reviews.filter(r => r.branch === selectedStat.branch).slice(0, 4).map(r => (
                  <div key={r.id} className="p-4 border border-[var(--hairline)] rounded-[10px] bg-[var(--plane)] text-sm leading-relaxed">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          r.sentiment === "긍정" ? "bg-[var(--s-blue-soft)] text-[var(--brand)]" :
                          r.sentiment === "부정" ? "bg-[var(--critical-soft)] text-[var(--critical)]" :
                          "bg-[var(--surface-2)] text-[var(--ink-2)]"
                        }`}>{r.sentiment}</span>
                        <span className="text-[11px] text-[var(--muted)]">{r.date}</span>
                      </div>
                    </div>
                    <div className="line-clamp-3 text-[var(--ink)]">{r.content}</div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-[var(--surface)] border border-[var(--hairline)] rounded-[var(--r-lg)] shadow-[var(--shadow-sm)] p-6">
              <h3 className="text-[15px] font-bold tracking-[-0.3px] mb-4">{selectedStat.branch} 키워드 클라우드</h3>
              <div className="flex flex-wrap gap-2">
                {Array.from(
                  reviews.filter(r => r.branch === selectedStat.branch)
                         .reduce((acc, r) => {
                           r.keywords.forEach(k => acc.set(k, (acc.get(k) || 0) + 1));
                           return acc;
                         }, new Map<string, number>())
                         .entries()
                ).sort((a,b) => b[1] - a[1]).slice(0, 15).map(([kw, count], idx) => (
                  <span key={idx} className="inline-flex items-center px-3 py-1.5 rounded-full bg-[var(--s-blue-soft)] text-[var(--brand)] text-[12px] font-semibold">
                    {kw} <span className="ml-1 text-[10px] font-normal opacity-70">{count}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
}
