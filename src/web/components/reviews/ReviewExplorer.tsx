"use client";

import React, { useState, useMemo } from "react";
import type { ReviewItem } from "@/lib/types";
import { Search, ChevronDown } from "lucide-react";

export function ReviewExplorer({ reviews }: { reviews: ReviewItem[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState<string>("전체");

  const filtered = useMemo(() => {
    return reviews.filter(r => {
      // 1. 텍스트 검색 (본문, 지점명, 키워드)
      const q = search.toLowerCase();
      const matchSearch = q === "" || 
        r.content.toLowerCase().includes(q) || 
        r.branch.toLowerCase().includes(q) ||
        r.keywords.some(k => k.toLowerCase().includes(q));
      
      // 2. 감성 필터
      let matchSent = true;
      if (sentimentFilter !== "전체") {
         if (sentimentFilter === "긍정") matchSent = r.sentiment === "긍정";
         if (sentimentFilter === "부정") matchSent = r.sentiment === "부정";
         if (sentimentFilter === "중립") matchSent = r.sentiment === "중립" || r.sentiment === "혼합";
         if (sentimentFilter === "분석 스킵") matchSent = r.sentiment === "분석 스킵" || r.sentiment === "분석 불가" || !r.sentiment;
      }

      return matchSearch && matchSent;
    });
  }, [reviews, search, sentimentFilter]);

  const selectedReview = reviews.find(r => r.id === selectedId) || null;

  // 요약 카운트
  const countPos = reviews.filter(r => r.sentiment === "긍정").length;
  const countNeg = reviews.filter(r => r.sentiment === "부정").length;
  const countNeu = reviews.filter(r => r.sentiment === "중립" || r.sentiment === "혼합").length;
  const countSkip = reviews.filter(r => r.sentiment === "분석 스킵").length;

  const validRatings = filtered.map(r => r.rating).filter(Boolean) as number[];
  const avgRating = validRatings.length > 0 ? (validRatings.reduce((a,b)=>a+b,0) / validRatings.length).toFixed(1) : "-";

  return (
    <div className="flex flex-col h-full">
      <div className="topbar">
        <div className="tb-row">
          <div className="tb-title">
            <h1 className="text-2xl font-bold tracking-tight">리뷰 탐색</h1>
            <p className="text-[12.5px] text-[var(--muted)] mt-1">
              전체 {reviews.length.toLocaleString()}건 중 <strong className="text-[var(--ink)]">{filtered.length.toLocaleString()}건</strong> 검색됨
            </p>
          </div>
          <div className="filters flex items-center gap-2 flex-wrap">
            <div className="chip h-[38px] px-[13px] bg-[var(--surface)] border border-[var(--hairline)] rounded-[10px] text-[12.5px] text-[var(--ink-2)] flex items-center gap-2 shadow-[var(--shadow-sm)] cursor-pointer">
              지점 <strong className="text-[var(--ink)] font-semibold">전체</strong>
              <ChevronDown className="w-3 h-3 text-[var(--muted)]" />
            </div>
            <div className="chip h-[38px] px-[13px] bg-[var(--surface)] border border-[var(--hairline)] rounded-[10px] text-[12.5px] text-[var(--ink-2)] flex items-center gap-2 shadow-[var(--shadow-sm)] cursor-pointer">
              정렬 <strong className="text-[var(--ink)] font-semibold">최신순</strong>
              <ChevronDown className="w-3 h-3 text-[var(--muted)]" />
            </div>
          </div>
        </div>
        
        <div className="search-row">
          <div className="search-box">
            <Search className="ic" />
            <input 
              placeholder="키워드, 본문, 지점명으로 검색" 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          
          <div className="pill-group">
            <span className={`pill ${sentimentFilter === "전체" ? "on" : ""}`} onClick={() => setSentimentFilter("전체")}>
              전체
            </span>
            <span className={`pill ${sentimentFilter === "긍정" ? "on good" : ""}`} onClick={() => setSentimentFilter("긍정")}>
              <span className="dot" style={{ background: "var(--good)" }}></span>긍정 {countPos}
            </span>
            <span className={`pill ${sentimentFilter === "부정" ? "on critical" : ""}`} onClick={() => setSentimentFilter("부정")}>
              <span className="dot" style={{ background: "var(--critical)" }}></span>부정 {countNeg}
            </span>
            <span className={`pill ${sentimentFilter === "중립" ? "on" : ""}`} onClick={() => setSentimentFilter("중립")}>
              <span className="dot" style={{ background: "#cfcec8" }}></span>중립 {countNeu}
            </span>
            <span className={`pill ${sentimentFilter === "분석 스킵" ? "on" : ""}`} onClick={() => setSentimentFilter("분석 스킵")}>
              <span className="dot" style={{ background: "var(--muted)" }}></span>스킵 {countSkip}
            </span>
          </div>
        </div>
      </div>

      <div className="strip">
        <div className="strip-item">
          <span className="strip-label">검색 결과</span>
          <span className="strip-val tnum">{filtered.length}건</span>
        </div>
        <div className="strip-sep"></div>
        <div className="strip-item">
          <span className="strip-label">평균 평점</span>
          <span className="strip-val tnum">{avgRating}</span>
        </div>
      </div>

      <div className="pane-grid">
        <div className="list">
          {filtered.slice(0, 50).map(r => {
            const isSelected = selectedId === r.id;
            let sentClass = "m";
            if (r.sentiment === "긍정") sentClass = "g";
            if (r.sentiment === "부정") sentClass = "c";
            
            return (
              <div 
                key={r.id} 
                className={`rcard ${isSelected ? "selected" : ""}`}
                onClick={() => setSelectedId(r.id)}
              >
                <div className="rcard-top">
                  <div className="rcard-meta">
                    <span className="branch-badge">{r.branch}</span>
                    <span className="rdate">{r.date || "날짜미상"} · {r.channel}</span>
                  </div>
                  <span className={`sent-badge ${sentClass}`}>{r.sentiment}</span>
                </div>
                <div className="rtext">{r.content}</div>
                <div className="rtags">
                  {r.keywords.slice(0,4).map((k, i) => <span key={i} className="tag">{k}</span>)}
                  {r.keywords.length > 4 && <span className="tag customer">+{r.keywords.length - 4}</span>}
                </div>
              </div>
            );
          })}
          {filtered.length > 50 && (
            <div className="py-4 text-center text-sm text-[var(--muted)]">
              + {filtered.length - 50}건의 리뷰가 더 있습니다. 검색을 활용해주세요.
            </div>
          )}
          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-[var(--muted)]">
              조건에 맞는 리뷰가 없습니다.
            </div>
          )}
        </div>

        {selectedReview ? (
          <div className="detail">
            <div className="d-head">
              <div className="d-title">리뷰 상세</div>
              <div className="d-close" onClick={() => setSelectedId(null)}>✕</div>
            </div>
            <div className="d-meta-row">
              <span className="branch-badge">{selectedReview.branch}</span>
              <span className="d-stars font-bold text-sm text-[var(--s-orange)]">
                ★ {selectedReview.rating || "-"}
              </span>
              <span className="rdate">{selectedReview.date || "날짜미상"} · {selectedReview.channel}</span>
            </div>
            <div className="d-body">
              {selectedReview.content}
            </div>

            <div className="d-section">
              <div className="d-label">키워드</div>
              <div className="rtags">
                {selectedReview.keywords.length > 0 ? (
                  selectedReview.keywords.map((k, i) => <span key={i} className="tag">{k}</span>)
                ) : (
                  <span className="text-xs text-[var(--muted)]">키워드 없음</span>
                )}
              </div>
            </div>
            
            {selectedReview.url && (
              <div className="d-section mt-4 pt-4 border-t border-[var(--hairline)]">
                <a href={selectedReview.url} target="_blank" rel="noreferrer" className="text-xs text-[var(--brand)] hover:underline font-semibold">
                  원문 링크로 이동 ↗
                </a>
              </div>
            )}
          </div>
        ) : (
          <div className="detail flex flex-col items-center justify-center text-[var(--muted)] text-sm py-12">
            리뷰를 선택하면 상세 내용이 표시됩니다.
          </div>
        )}
      </div>
    </div>
  );
}
