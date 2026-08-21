"use client";

import React, { useState, useMemo } from "react";

function ReadMoreText({ text, limit = 200 }: { text: string; limit?: number }) {
  const [expanded, setExpanded] = React.useState(false);
  if (!text) return null;
  if (text.length <= limit) return <div className="whitespace-pre-wrap">{text}</div>;
  
  return (
    <div>
      <div className="whitespace-pre-wrap">
        {expanded ? text : text.slice(0, limit) + "..."}
      </div>
      <button 
        onClick={() => setExpanded(!expanded)} 
        className="text-[var(--brand)] font-semibold mt-2 hover:underline text-[13px]"
      >
        {expanded ? "접기" : "더보기"}
      </button>
    </div>
  );
}

import type { ReviewItem } from "@/lib/types";
import { Search, ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/Card";

// AI 토픽 필터. 리뷰별 별도 분류 필드가 없어, 키워드/본문에 대한 휴리스틱
// 매칭으로 근사한다 (rule_classifier.py 의 POS/NEG_KEYWORDS 와 같은 성격의
// 규칙 기반 분류이며 정확한 토픽 태깅은 아니다).
const TOPIC_PATTERNS: Record<string, RegExp> = {
  "청결": /위생|청결|더럽|냄새/,
  "서비스": /친절|불친절|서비스/,
  "맛": /맛있|맛없|맛나|맛집|노맛|국물|짜|싱겁/,
  "주차": /주차/,
};

// "브랜드전체"는 특정 지점이 아닌 브랜드 전반/미분류 리뷰에 붙는 원본 태그값이다.
// 원본 데이터·필터링은 그대로 두고, AI 리뷰 탐색 화면에 노출되는 텍스트만 "기타"로 바꾼다.
const displayBranch = (branch: string) => (branch === "브랜드전체" ? "기타" : branch);

export function ReviewExplorer({ reviews }: { reviews: ReviewItem[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState<string>("전체");
  const [topicFilter, setTopicFilter] = useState<string>("전체");
  const [channelFilter, setChannelFilter] = useState<string>("전체");
  const [branchFilter, setBranchFilter] = useState<string>("전체");
  const [sortOrder, setSortOrder] = useState<string>("최신순");

  const uniqueChannels = useMemo(() => {
    const channels = Array.from(new Set(reviews.map(r => r.channel))).filter(Boolean);
    return ["전체", ...channels.sort()];
  }, [reviews]);

  const uniqueBranches = useMemo(() => {
    const branches = Array.from(new Set(reviews.map(r => r.branch))).filter(Boolean);
    return ["전체", ...branches.sort()];
  }, [reviews]);

  // 검색어 + AI 토픽 + 채널 + 지점 필터만 적용한 목록. 감성 pill의 개수 표시가 이 목록을
  // 기준으로 계산되어, 검색/토픽/채널/지점을 바꾸면 pill의 숫자도 그에 맞게 바뀐다.
  const bySearchAndTopic = useMemo(() => {
    return reviews.filter(r => {
      const q = search.toLowerCase();
      const matchSearch = q === "" ||
        r.content.toLowerCase().includes(q) ||
        r.branch.toLowerCase().includes(q) ||
        r.keywords.some(k => k.toLowerCase().includes(q));

      let matchTopic = true;
      if (topicFilter !== "전체") {
        const pattern = TOPIC_PATTERNS[topicFilter];
        const haystack = `${r.content} ${r.keywords.join(" ")}`;
        matchTopic = pattern ? pattern.test(haystack) : true;
      }

      const matchChannel = channelFilter === "전체" || r.channel === channelFilter;
      const matchBranch = branchFilter === "전체" || r.branch === branchFilter;

      return matchSearch && matchTopic && matchChannel && matchBranch;
    });
  }, [reviews, search, topicFilter, channelFilter, branchFilter]);

  const filtered = useMemo(() => {
    const bySentiment = sentimentFilter === "전체" ? bySearchAndTopic : bySearchAndTopic.filter(r => {
      if (sentimentFilter === "긍정") return r.sentiment === "긍정";
      if (sentimentFilter === "부정") return r.sentiment === "부정";
      if (sentimentFilter === "중립") return r.sentiment === "중립" || r.sentiment === "혼합";
      return true;
    });

    const sorted = [...bySentiment];
    if (sortOrder === "최신순") sorted.sort((a, b) => b.date.localeCompare(a.date));
    else if (sortOrder === "오래된순") sorted.sort((a, b) => a.date.localeCompare(b.date));
    else if (sortOrder === "별점높은순") sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    else if (sortOrder === "별점낮은순") sorted.sort((a, b) => (a.rating ?? 0) - (b.rating ?? 0));
    return sorted;
  }, [bySearchAndTopic, sentimentFilter, sortOrder]);

  const selectedReview = reviews.find(r => r.id === selectedId) || null;

  // AI 리뷰 분석 파이프라인 (Admin) 카드용 — 가장 최근 작성된 리뷰 1건을 실데이터로 미리보기.
  const latestReview = useMemo(() => {
    if (reviews.length === 0) return null;
    return [...reviews].sort((a, b) => b.date.localeCompare(a.date))[0];
  }, [reviews]);

  // 요약 카운트. 검색/토픽 필터가 바뀌면 이 숫자도 함께 바뀐다 (감성 필터 자체는 제외).
  const countPos = bySearchAndTopic.filter(r => r.sentiment === "긍정").length;
  const countNeg = bySearchAndTopic.filter(r => r.sentiment === "부정").length;
  const countNeu = bySearchAndTopic.filter(r => r.sentiment === "중립" || r.sentiment === "혼합").length;

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
            <label className="chip h-[38px] px-[13px] bg-[var(--surface)] border border-[var(--hairline)] rounded-[10px] text-[12.5px] text-[var(--ink-2)] flex items-center gap-2 shadow-[var(--shadow-sm)] cursor-pointer">
              채널
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                className="appearance-none font-semibold text-[var(--ink)] bg-transparent outline-none cursor-pointer"
              >
                {uniqueChannels.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-[var(--muted)]" />
            </label>
            <label className="chip h-[38px] px-[13px] bg-[var(--surface)] border border-[var(--hairline)] rounded-[10px] text-[12.5px] text-[var(--ink-2)] flex items-center gap-2 shadow-[var(--shadow-sm)] cursor-pointer">
              지점
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="appearance-none font-semibold text-[var(--ink)] bg-transparent outline-none cursor-pointer"
              >
                {uniqueBranches.map(b => (
                  <option key={b} value={b}>{displayBranch(b)}</option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-[var(--muted)]" />
            </label>
            <label className="chip h-[38px] px-[13px] bg-[var(--surface)] border border-[var(--hairline)] rounded-[10px] text-[12.5px] text-[var(--ink-2)] flex items-center gap-2 shadow-[var(--shadow-sm)] cursor-pointer">
              정렬
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="appearance-none font-semibold text-[var(--ink)] bg-transparent outline-none cursor-pointer"
              >
                <option value="최신순">최신순</option>
                <option value="오래된순">오래된순</option>
                <option value="별점높은순">별점 높은순</option>
                <option value="별점낮은순">별점 낮은순</option>
              </select>
              <ChevronDown className="w-3 h-3 text-[var(--muted)]" />
            </label>
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

      {/* AI 리뷰 분석 파이프라인 (Admin). 오너 콘솔용 미리보기 — 프론트엔드는 AI를
          직접 호출하지 않고 배치 파이프라인(rule_classifier.py) 결과만 보여준다 (RULES §3.2). */}
      <Card className="mt-[18px]">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <div className="text-[15px] font-bold">AI 리뷰 분석 파이프라인 (Admin)</div>
            <div className="text-[12px] text-[var(--muted)] mt-0.5">규칙 기반 분류 기준 및 최신 분석 결과 미리보기</div>
          </div>
          <span className="status-tag new">규칙 기반 분류 파이프라인</span>
        </div>
        <div className="flex gap-6 flex-wrap">
          <div className="flex-1 min-w-[260px] flex flex-col md:border-r md:border-dashed md:border-[var(--hairline)] md:pr-6">
            <b className="text-[13px] mb-2 block">키워드 분류 기준 (rule_classifier.py)</b>
            <textarea
              readOnly
              className="flex-1 w-full min-h-[80px] text-[12.5px] p-2.5 border border-[var(--hairline)] rounded-md resize-none bg-[var(--surface-2)]"
              value={"- 긍정: 맛있, 친절, 깔끔, 만족, 재방문 등 90개 키워드\n- 부정: 별로, 불친절, 위생, 냄새, 웨이팅 등 27개 키워드\n- 긍정/부정 키워드가 함께 발견되면 '혼합'으로 분류"}
            />
          </div>
          <div className="flex-[1.5] min-w-[260px] flex flex-col">
            <b className="text-[13px] mb-2 block">최신 발췌 문장 (Live Preview)</b>
            {latestReview ? (
              <div className="bg-[var(--surface-2)] p-4 rounded-lg flex-1">
                <p className="text-[13px] mb-2.5">
                  <b>추출된 핵심 키워드:</b>{" "}
                  {latestReview.keywords.slice(0, 3).map((k, i) => (
                    <span key={i} className="tag mr-1" style={{ background: "#fff" }}>#{k}</span>
                  ))}
                </p>
                <blockquote className="border-l-[3px] border-[var(--brand)] pl-3.5 text-[13.5px] text-[var(--ink-2)] leading-relaxed m-0">
                  <ReadMoreText text={latestReview.content} limit={150} />
                  <span className="text-[11.5px] text-[var(--muted)] mt-2 block">
                    - {displayBranch(latestReview.branch)} 리뷰 원문 ({latestReview.date || "날짜미상"})
                  </span>
                </blockquote>
              </div>
            ) : (
              <div className="bg-[var(--surface-2)] p-4 rounded-lg flex-1 text-[var(--muted)] text-[13px]">
                표시할 리뷰가 없습니다.
              </div>
            )}
          </div>
        </div>
      </Card>

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
                    <span className="branch-badge">{displayBranch(r.branch)}</span>
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
              <span className="branch-badge">{displayBranch(selectedReview.branch)}</span>
              <span className="d-stars font-bold text-sm text-[var(--s-orange)]">
                ★ {selectedReview.rating || "-"}
              </span>
              <span className="rdate">{selectedReview.date || "날짜미상"} · {selectedReview.channel}</span>
            </div>
            <div className="d-body">
              <ReadMoreText text={selectedReview.content} limit={300} />
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
