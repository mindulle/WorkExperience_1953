import type { DashboardData, VisitPurpose, MonthlyTrend, MenuMention, BranchStat, KeywordMention } from "./types";

// 랭킹 집계 시 서로 다른 표기를 하나로 합친다(원본 값 자체는 건드리지 않음).
// "국밥"은 국밥집 리뷰 대부분에 등장해 랭킹 변별력이 없어 제외한다.
const MENU_ALIAS: Record<string, string> = { "섞어": "섞어국밥" };
const MENU_EXCLUDE = new Set(["국밥"]);

/**
 * 최소 CSV 파서. review_text 등에 콤마·줄바꿈·따옴표가 포함된 필드가 있어
 * 단순 split(',')로는 깨진다 (RFC4180 수준 인용부호 처리 필요).
 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** 카테고리별 개수를 합계 100이 되는 비율(%) 배열로 변환한다 (반올림 오차는 마지막 항목이 흡수). */
function toRatios(counts: Record<string, number>): VisitPurpose[] {
  const entries = Object.entries(counts);
  const total = entries.reduce((sum, [, n]) => sum + n, 0);
  if (total === 0) return [];
  let used = 0;
  return entries.map(([purpose, n], i) => {
    const isLast = i === entries.length - 1;
    const ratio = isLast ? 100 - used : Math.round((n / total) * 100);
    used += ratio;
    return { purpose, ratio };
  });
}

/** "정제_리뷰데이터" 탭(이슈 #66~71 산출물)을 읽어 헤더+행으로 반환한다. 탭이 없으면 null. */
async function fetchReviewSheet(sheetId: string): Promise<{ header: string[]; rows: string[][] } | null> {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=%EC%A0%95%EC%A0%9C_%EB%A6%AC%EB%B7%B0%EB%8D%B0%EC%9D%B4%ED%84%B0`;
  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const parsed = parseCsv(await res.text());
    if (parsed.length < 2) return null;
    const header = parsed[0];
    // 탭이 없으면 gviz가 조용히 기본(첫) 탭으로 폴백하므로, 이 탭 고유 컬럼으로 실존 여부를 확인한다.
    if (header.indexOf("visit_origin") === -1) return null;
    return { header, rows: parsed.slice(1) };
  } catch {
    return null;
  }
}

function derivePurposes(header: string[], rows: string[][]): VisitPurpose[] | null {
  const col = header.indexOf("visit_origin");
  if (col === -1) return null;
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const v = row[col];
    if (!v) continue;
    counts[v] = (counts[v] ?? 0) + 1;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return total > 0 ? toRatios(counts) : null;
}

/** approx_ym(YYYY-MM) + date_precision(일/월만 인정) + rating으로 월별 건수·평균평점을 낸다. */
function deriveMonthlyTrend(header: string[], rows: string[][]): MonthlyTrend[] | null {
  const ymCol = header.indexOf("approx_ym");
  const precCol = header.indexOf("date_precision");
  const ratingCol = header.indexOf("rating");
  if (ymCol === -1 || precCol === -1) return null;

  const byMonth: Record<string, { count: number; ratingSum: number; ratingN: number }> = {};
  for (const row of rows) {
    const precision = row[precCol];
    if (precision !== "일" && precision !== "월") continue; // "년"/"없음"은 월 단위를 알 수 없어 제외 (#68)
    const ym = row[ymCol];
    if (!/^\d{4}-\d{2}$/.test(ym)) continue;
    const bucket = (byMonth[ym] ??= { count: 0, ratingSum: 0, ratingN: 0 });
    bucket.count += 1;
    const rating = ratingCol === -1 ? NaN : parseFloat(row[ratingCol]);
    if (!Number.isNaN(rating)) {
      bucket.ratingSum += rating;
      bucket.ratingN += 1;
    }
  }

  const months = Object.keys(byMonth).sort();
  if (months.length === 0) return null;
  return months.map((month) => {
    const b = byMonth[month];
    return {
      month,
      count: b.count,
      avgRating: b.ratingN > 0 ? Math.round((b.ratingSum / b.ratingN) * 100) / 100 : undefined,
    };
  });
}

/** mentioned_menu(세미콜론 구분) + sentiment_final == 긍정 인 행만 세어 Top N 랭킹을 만든다. */
function deriveMenuRanking(header: string[], rows: string[][], topN = 5): MenuMention[] | null {
  const menuCol = header.indexOf("mentioned_menu");
  const sentimentCol = header.indexOf("sentiment_final");
  if (menuCol === -1 || sentimentCol === -1) return null;

  const counts: Record<string, number> = {};
  for (const row of rows) {
    if (row[sentimentCol] !== "긍정") continue;
    const raw = row[menuCol];
    if (!raw) continue;
    for (const term of raw.split(";").map((s) => s.trim()).filter(Boolean)) {
      const canonical = MENU_ALIAS[term] ?? term;
      if (MENU_EXCLUDE.has(canonical)) continue;
      counts[canonical] = (counts[canonical] ?? 0) + 1;
    }
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([menu, count]) => ({ menu, count }));
}

/**
 * 지점별 리뷰수·평균평점·긍정률·부정률. "강점"은 긍정률 내림차순으로 정의한다(#72).
 * sentiment_basis == "비리뷰"(수집 불가 메모 등 실제 리뷰가 아닌 행)는 제외.
 */
function deriveBranchStats(header: string[], rows: string[][]): BranchStat[] | null {
  const branchCol = header.indexOf("branch");
  const ratingCol = header.indexOf("rating");
  const sentimentCol = header.indexOf("sentiment_final");
  const basisCol = header.indexOf("sentiment_basis");
  if (branchCol === -1 || sentimentCol === -1) return null;

  const byBranch: Record<
    string,
    { count: number; ratingSum: number; ratingN: number; pos: number; neg: number; judged: number }
  > = {};
  for (const row of rows) {
    if (basisCol !== -1 && row[basisCol] === "비리뷰") continue;
    const branch = row[branchCol];
    if (!branch) continue;
    const b = (byBranch[branch] ??= { count: 0, ratingSum: 0, ratingN: 0, pos: 0, neg: 0, judged: 0 });
    b.count += 1;
    const rating = ratingCol === -1 ? NaN : parseFloat(row[ratingCol]);
    if (!Number.isNaN(rating)) {
      b.ratingSum += rating;
      b.ratingN += 1;
    }
    const s = row[sentimentCol];
    if (s === "긍정" || s === "부정" || s === "중립" || s === "혼합") {
      b.judged += 1;
      if (s === "긍정") b.pos += 1;
      if (s === "부정") b.neg += 1;
    }
  }

  const branches = Object.keys(byBranch);
  if (branches.length === 0) return null;
  return branches
    .map((branch) => {
      const b = byBranch[branch];
      return {
        branch,
        reviewCount: b.count,
        avgRating: b.ratingN > 0 ? Math.round((b.ratingSum / b.ratingN) * 100) / 100 : undefined,
        positivePct: b.judged > 0 ? Math.round((b.pos / b.judged) * 100) : 0,
        negativePct: b.judged > 0 ? Math.round((b.neg / b.judged) * 100) : 0,
      };
    })
    .sort((a, b) => b.positivePct - a.positivePct);
}

/** positive_keywords + negative_keywords(세미콜론 구분)를 합쳐 Top N 언급 키워드를 낸다(#73). */
function deriveTopKeywords(header: string[], rows: string[][], topN = 5): KeywordMention[] | null {
  const posCol = header.indexOf("positive_keywords");
  const negCol = header.indexOf("negative_keywords");
  if (posCol === -1 && negCol === -1) return null;

  const counts: Record<string, number> = {};
  for (const row of rows) {
    for (const col of [posCol, negCol]) {
      if (col === -1) continue;
      const raw = row[col];
      if (!raw) continue;
      for (const kw of raw.split(";").map((s) => s.trim()).filter(Boolean)) {
        counts[kw] = (counts[kw] ?? 0) + 1;
      }
    }
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([keyword, count]) => ({ keyword, count }));
}


export async function getDashboardData(): Promise<DashboardData> {
  const fetchedAt = new Date().toISOString();

  const FALLBACK: DashboardData = {
    fetchedAt,
    source: "fallback",
    totalReviews: 1716,
    positivePct: 80,
    negativePct: 20,
    topKeywords: [
      { keyword: "맛있", count: 177 },
      { keyword: "깔끔", count: 65 },
      { keyword: "친절", count: 39 },
      { keyword: "좋았", count: 33 },
      { keyword: "추천", count: 29 },
    ],
    menuRanking: [
      { menu: "돼지국밥", count: 51 },
      { menu: "수육", count: 18 },
      { menu: "솥밥", count: 17 },
      { menu: "순대", count: 17 },
      { menu: "맑은국밥", count: 14 },
    ],
    purposes: toRatios({ "외지/관광 방문": 11, "현지인/단골": 9, "정보없음": 574 }),
    branchStats: [
      { branch: "서면점", reviewCount: 15, avgRating: 5.0, positivePct: 100, negativePct: 0 },
      { branch: "광안점", reviewCount: 258, avgRating: 4.5, positivePct: 85, negativePct: 9 },
      { branch: "중앙동점", reviewCount: 29, avgRating: 4.42, positivePct: 76, negativePct: 10 },
      { branch: "본점", reviewCount: 276, avgRating: 4.26, positivePct: 75, negativePct: 12 },
      { branch: "사직점", reviewCount: 7, avgRating: 4.43, positivePct: 71, negativePct: 14 },
      { branch: "BIFC문현점", reviewCount: 7, avgRating: 4.36, positivePct: 57, negativePct: 14 },
    ],
    monthlyTrend: [
      { month: "2025-07", count: 9, avgRating: 4.91 },
      { month: "2025-08", count: 18, avgRating: 4.73 },
      { month: "2025-09", count: 12, avgRating: 3.58 },
      { month: "2025-10", count: 24, avgRating: 4.75 },
    ],
  };

  const SHEET_ID = process.env.GOOGLE_SHEET_ID || "13Z0VlvkblfBrT7BtNK1iw2dbVsLMkrAh1XgP1SfRnJg";

  try {
    const reviewSheet = await fetchReviewSheet(SHEET_ID);
    if (!reviewSheet) {
      throw new Error("Failed to fetch review sheet");
    }

    // [정제_리뷰데이터] 탭에서 직접 집계
    let positive = 0;
    let negative = 0;
    let neutral = 0;
    
    const sentimentCol = reviewSheet.header.indexOf("sentiment_final");
    if (sentimentCol !== -1) {
      for (const row of reviewSheet.rows) {
        const s = row[sentimentCol];
        if (s === "긍정") positive++;
        else if (s === "부정") negative++;
        else if (s === "중립" || s === "혼합") neutral++;
      }
    }

    const total = reviewSheet.rows.length;
    const totalPosNeg = positive + negative;
    const posPct = totalPosNeg > 0 ? Math.round((positive / totalPosNeg) * 100) : 80;
    const negPct = totalPosNeg > 0 ? 100 - posPct : 20;

    const purposes = derivePurposes(reviewSheet.header, reviewSheet.rows);
    const monthlyTrend = deriveMonthlyTrend(reviewSheet.header, reviewSheet.rows);
    const menuRanking = deriveMenuRanking(reviewSheet.header, reviewSheet.rows);
    const branchStats = deriveBranchStats(reviewSheet.header, reviewSheet.rows);
    const topKeywords = deriveTopKeywords(reviewSheet.header, reviewSheet.rows);

    return {
      ...FALLBACK,
      source: "sheet",
      totalReviews: total > 0 ? total : FALLBACK.totalReviews,
      positivePct: posPct,
      negativePct: negPct,
      purposes: purposes ?? FALLBACK.purposes,
      monthlyTrend: monthlyTrend ?? FALLBACK.monthlyTrend,
      menuRanking: menuRanking ?? FALLBACK.menuRanking,
      branchStats: branchStats ?? FALLBACK.branchStats,
      topKeywords: topKeywords ?? FALLBACK.topKeywords,
    };
  } catch (error) {
    console.error("[ERROR] Public Sheets fetch failed:", error);
    return FALLBACK;
  }
}

export async function getAllReviews(): Promise<ReviewItem[]> {
  const SHEET_ID = process.env.GOOGLE_SHEET_ID || "13Z0VlvkblfBrT7BtNK1iw2dbVsLMkrAh1XgP1SfRnJg";
  try {
    const reviewSheet = await fetchReviewSheet(SHEET_ID);
    if (!reviewSheet) return [];
    
    const h = reviewSheet.header;
    const branchIdx = h.indexOf("지점");
    const channelIdx = h.indexOf("채널");
    const authorIdx = h.indexOf("작성자");
    const dateIdx = h.indexOf("작성일");
    const contentIdx = h.indexOf("review_text");
    const sentimentIdx = h.indexOf("sentiment_final");
    const ratingIdx = h.indexOf("rating");
    const urlIdx = h.indexOf("URL");
    const pKeyIdx = h.indexOf("positive_keywords");
    const nKeyIdx = h.indexOf("negative_keywords");

    return reviewSheet.rows.map((row, i) => {
      const getStr = (idx: number) => (idx >= 0 && row[idx]) ? row[idx] : "";
      
      const pos = getStr(pKeyIdx).split(';').map(k => k.trim()).filter(Boolean);
      const neg = getStr(nKeyIdx).split(';').map(k => k.trim()).filter(Boolean);
      const ratingStr = getStr(ratingIdx);

      return {
        id: `rev-${i}`,
        branch: getStr(branchIdx) || "본점",
        channel: getStr(channelIdx) || "Unknown",
        author: getStr(authorIdx) || "익명",
        date: getStr(dateIdx),
        content: getStr(contentIdx),
        sentiment: getStr(sentimentIdx) || "분석 스킵",
        rating: ratingStr ? parseFloat(ratingStr) : undefined,
        url: getStr(urlIdx),
        keywords: [...pos, ...neg],
      };
    }).filter(r => r.content.trim().length > 0);
  } catch (e) {
    console.error("Failed to fetch all reviews", e);
    return [];
  }
}
