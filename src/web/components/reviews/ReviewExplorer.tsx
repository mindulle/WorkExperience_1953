"use client";

import React, { useState, useMemo } from "react";
import type { ReviewItem } from "@/lib/types";
import { Search } from "lucide-react";

// AI 토픽 필터. 리뷰별 별도 분류 필드가 없어, 키워드/본문에 대한 휴리스틱
// 매칭으로 근사한다 (rule_classifier.py 의 POS/NEG_KEYWORDS 와 같은 성격의
// 규칙 기반 분류이며 정확한 토픽 태깅은 아니다).
const TOPIC_PATTERNS: Record<string, RegExp> = {
  "청결": /위생|청결|더럽|냄새/,
  "서비스": /친절|불친절|서비스/,
  "맛": /맛있|맛없|맛나|맛집|노맛|국물|짜|싱겁/,
  "주차": /주차/,
};

export function ReviewExplorer({ reviews }: { reviews: ReviewItem[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState<string>("전체");
  const [topicFilter, setTopicFilter] = useState<string>("전체");
  const [branchFilter, setBranchFilter] = useState<string>("전체");
  const [sortOrder, setSortOrder] = useState<string>("최신순");

  const uniqueBranches = useMemo(() => {
    const branches = Array.from(new Set(reviews.map(r => r.branch))).filter(Boolean);
    return ["전체", ...branches.sort()];
  }, [reviews]);

  const filtered = useMemo(() => {
    let result = reviews.filter(r => {
      // 1. 텍스트 검색 (본문, 지점명, 키워드)
      const q = search.toLowerCase();
      const matchSearch = q === "" ||
        r.content.toLowerCase().includes(q) ||
        r.branch.toLowerCase().includes(q) ||
        (r.keywords && r.keywords.some(k => k.toLowerCase().includes(q)));

      // 2. 감성 필터
      let matchSent = true;
      if (sentimentFilter !== "전체") {
         if (sentimentFilter === "긍정") matchSent = r.sentiment === "긍정";
         if (sentimentFilter === "부정") matchSent = r.sentiment === "부정";
         if (sentimentFilter === "중립") matchSent = r.sentiment === "중립" || r.sentiment === "혼합";
         if (sentimentFilter === "분석 스킵") matchSent = r.sentiment === "분석 스킵" || r.sentiment === "분석 불가" || !r.sentiment;
      }

      // 3. AI 토픽 필터
      let matchTopic = true;
      if (topicFilter !== "전체") {
        if (r.aspects && r.aspects.length > 0) {
          // 실제 AI가 추출한 토픽(aspect_analysis)이 존재하면 이를 기반으로 필터링
          matchTopic = r.aspects.some(a => a.category.includes(topicFilter) || topicFilter.includes(a.category));
        } else {
          // 데이터 파이프라인에서 AI 처리가 안 된 예전 데이터에 대한 휴리스틱 폴백
          const pattern = TOPIC_PATTERNS[topicFilter];
          const haystack = `${r.content} ${r.keywords ? r.keywords.join(" ") : ""}`;
          matchTopic = pattern ? pattern.test(haystack) : true;
        }
      }

      // 4. 지점 필터
      const matchBranch = branchFilter === "전체" || r.branch === branchFilter;

      return matchSearch && matchSent && matchTopic && matchBranch;
    });

    // 정렬 로직
    if (sortOrder === "최신순") {
      result = result.sort((a, b) => b.date.localeCompare(a.date));
    } else if (sortOrder === "오래된순") {
      result = result.sort((a, b) => a.date.localeCompare(b.date));
    } else if (sortOrder === "별점높은순") {
      result = result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortOrder === "별점낮은순") {
      result = result.sort((a, b) => (a.rating || 5) - (b.rating || 5));
    }

    return result;
  }, [reviews, search, sentimentFilter, topicFilter, branchFilter, sortOrder]);

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
            <h1 className="text-2xl font-bold tracking-tight">AI 리뷰 탐색</h1>
            <p className="text-[12.5px] text-[var(--muted)] mt-1">
              전체 {reviews.length.toLocaleString()}건 중 <strong className="text-[var(--ink)]">{filtered.length.toLocaleString()}건</strong> 검색됨
            </p>
          </div>
          <div className="filters flex items-center gap-2 flex-wrap">
            <select 
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="h-[38px] px-3 bg-[var(--surface)] border border-[var(--hairline)] rounded-[10px] text-[12.5px] text-[var(--ink-2)] font-semibold shadow-[var(--shadow-sm)] outline-none cursor-pointer focus:border-[var(--brand)]"
            >
              {uniqueBranches.map(b => (
                <option key={b} value={b}>{b === "전체" ? "지점 전체" : b}</option>
              ))}
            </select>
            
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="h-[38px] px-3 bg-[var(--surface)] border border-[var(--hairline)] rounded-[10px] text-[12.5px] text-[var(--ink-2)] font-semibold shadow-[var(--shadow-sm)] outline-none cursor-pointer focus:border-[var(--brand)]"
            >
              <option value="최신순">정렬 최신순</option>
              <option value="오래된순">정렬 오래된순</option>
              <option value="별점높은순">별점 높은순</option>
              <option value="별점낮은순">별점 낮은순</option>
            </select>
          </div>
        </div>

        {/* AI 토픽 필터. 정확한 분류 필드가 없어 키워드/본문 매칭 휴리스틱으로 근사한다. */}
        <div className="filter-row" style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <span
            className="pill"
            style={{ borderColor: "var(--brand)", color: "var(--brand)", background: "var(--surface)", cursor: "default" }}
          >
            ✨ AI 토픽 필터:
          </span>
          {["전체", ...Object.keys(TOPIC_PATTERNS)].map((topic) => (
            <span
              key={topic}
              className={`pill ${topicFilter === topic ? "on" : ""}`}
              onClick={() => setTopicFilter(topic)}
            >
              {topic}
            </span>
          ))}
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
        <div className="strip-sep"></div>
        <div className="strip-item">
          <span className="strip-label">부정 리뷰</span>
          <span className="strip-val tnum" style={{ color: "var(--critical)" }}>
            {filtered.filter(r => r.sentiment === "부정").length}건
          </span>
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
            <div className="d-meta-row mb-3 flex flex-wrap gap-1.5 items-center">
              <span className="branch-badge">{selectedReview.branch}</span>
              <span className="d-stars font-bold text-sm text-[var(--s-orange)]">
                ★ {selectedReview.rating || "-"}
              </span>
              <span className="rdate ml-1">{selectedReview.date || "날짜미상"} · {selectedReview.channel}</span>
            </div>

            {/* AI 메타 태그 */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                selectedReview.sentiment === "긍정" ? "bg-[var(--s-blue-soft)] text-[var(--brand)]" :
                selectedReview.sentiment === "부정" ? "bg-[var(--critical-soft)] text-[var(--critical)]" :
                "bg-[var(--surface-3)] text-[var(--ink-2)]"
              }`}>{selectedReview.sentiment}</span>
              {selectedReview.customerType && selectedReview.customerType !== "정보없음" && (
                <span className="text-[10.5px] px-2 py-0.5 bg-[var(--s-yellow-soft)] text-[#b45309] rounded font-medium">👤 {selectedReview.customerType}</span>
              )}
              {selectedReview.menus && selectedReview.menus.length > 0 && (
                <span className="text-[10.5px] px-2 py-0.5 bg-[var(--s-aqua-soft)] text-[#0d9488] rounded font-medium">🍲 {selectedReview.menus.join(', ')}</span>
              )}
            </div>

            <div className="d-label">리뷰 본문</div>
            <div className="d-body mb-6 text-[13.5px] leading-relaxed">
              {selectedReview.content}
            </div>

            {/* AI 발췌 분석 (Aspects) */}
            {selectedReview.aspects && selectedReview.aspects.length > 0 && (
              <div className="d-section mb-6">
                <div className="d-label">AI 발췌 및 분석</div>
                <div className="flex flex-col gap-2 mt-1">
                  {selectedReview.aspects.map((aspect, idx) => (
                    <blockquote key={idx} className={`border-l-[3px] pl-3.5 py-0.5 text-[13px] leading-relaxed m-0 bg-[var(--plane)] ${
                      aspect.sentiment === "긍정" ? "border-[var(--brand)] text-[var(--ink)]" :
                      aspect.sentiment === "부정" ? "border-[var(--critical)] text-[var(--ink)]" :
                      "border-[var(--muted)] text-[var(--ink-2)]"
                    }`}>
                      <span className="font-semibold mr-1">[{aspect.category}]</span> 
                      {aspect.context}
                    </blockquote>
                  ))}
                </div>
              </div>
            )}

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
            
            {/* AI 추천 답글. 자동 답글 생성 로직은 아직 없어 초안 작성 UI만 준비해 둔다. */}
            <div className="d-section">
              <div className="d-label">AI 추천 답글</div>
              <textarea
                readOnly
                placeholder="답글 초안 자동 생성 기능은 준비 중입니다."
                style={{ width: "100%", minHeight: 70, fontSize: 13, padding: 10, border: "1px solid var(--hairline)", borderRadius: 8, resize: "none", background: "var(--surface-2)", color: "var(--muted)" }}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                <button disabled style={{ fontSize: 12, padding: "6px 12px", borderRadius: 6, border: "1px solid var(--hairline)", opacity: 0.5, cursor: "not-allowed" }}>
                  수정
                </button>
                <button disabled style={{ fontSize: 12, padding: "6px 12px", borderRadius: 6, border: "1px solid var(--hairline)", opacity: 0.5, cursor: "not-allowed" }}>
                  등록
                </button>
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
