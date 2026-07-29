import type { DashboardData, VisitPurpose, MonthlyTrend } from "./types";

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

export async function getDashboardData(): Promise<DashboardData> {
  // output:"export" 정적 익스포트라 이 함수는 빌드 시점에 한 번 실행된다.
  // 즉 화면에 표시되는 "마지막 조회"는 마지막 배포 시각과 같다.
  const fetchedAt = new Date().toISOString();

  // 조회 실패 시 쓰는 값. 실제 정제 결과(99% / 1%)와 다르므로
  // source: "fallback" 으로 표시해 화면이 실제 값과 구분할 수 있게 한다.
  // purposes/monthlyTrend 는 각각 이슈 #71, #69에서 리뷰 데이터를 직접 집계한 실측치를 그대로 담는다
  // (시트에 정제_리뷰데이터 탭이 아직 없을 때도 근거 있는 값을 보여주기 위함 — 지어낸 값이 아니다).
  const FALLBACK: DashboardData = {
    fetchedAt,
    source: "fallback",
    totalReviews: 1716,
    positivePct: 80,
    negativePct: 20,
    topKeywords: [],
    menuRanking: [],
    purposes: toRatios({ "외지/관광 방문": 11, "현지인/단골": 9, "정보없음": 574 }),
    // 594건 중 314건만 연-월을 알 수 있음(#68) — 나머지는 "N년 전"처럼 연 단위뿐이라 집계에서 제외.
    monthlyTrend: [
      { month: "2025-07", count: 9, avgRating: 4.91 },
      { month: "2025-08", count: 18, avgRating: 4.73 },
      { month: "2025-09", count: 12, avgRating: 3.58 },
      { month: "2025-10", count: 24, avgRating: 4.75 },
      { month: "2025-11", count: 36, avgRating: 4.01 },
      { month: "2025-12", count: 40, avgRating: 4.54 },
      { month: "2026-01", count: 44, avgRating: 4.42 },
      { month: "2026-02", count: 24, avgRating: 4.4 },
      { month: "2026-03", count: 22, avgRating: 4.58 },
      { month: "2026-04", count: 21, avgRating: 4.61 },
      { month: "2026-05", count: 11, avgRating: 4.73 },
      { month: "2026-06", count: 15, avgRating: 4.58 },
      { month: "2026-07", count: 38, avgRating: 4.6 },
    ],
  };

  const SHEET_ID = process.env.GOOGLE_SHEET_ID || "13Z0VlvkblfBrT7BtNK1iw2dbVsLMkrAh1XgP1SfRnJg";
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=%EC%A0%95%EC%A0%9C_%EC%96%B8%EA%B8%89%EB%8D%B0%EC%9D%B4%ED%84%B0`;

  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error("Failed to fetch sheet");
    const csv = await res.text();
    
    let positive = 0;
    let negative = 0;
    let neutral = 0;

    const lines = csv.split('\n');
    for (const line of lines) {
      if (line.includes('"긍정"')) {
        const val = line.split(',')[1]?.replace(/"/g, '');
        if (val) positive = parseInt(val, 10);
      }
      if (line.includes('"부정"')) {
        const val = line.split(',')[1]?.replace(/"/g, '');
        if (val) negative = parseInt(val, 10);
      }
      if (line.includes('"중립"')) {
        const val = line.split(',')[1]?.replace(/"/g, '');
        if (val) neutral = parseInt(val, 10);
      }
    }

    const total = positive + neutral + negative;
    const totalPosNeg = positive + negative;
    const posPct = totalPosNeg > 0 ? Math.round((positive / totalPosNeg) * 100) : 80;
    const negPct = totalPosNeg > 0 ? 100 - posPct : 20;

    const reviewSheet = await fetchReviewSheet(SHEET_ID);
    const purposes = reviewSheet ? derivePurposes(reviewSheet.header, reviewSheet.rows) : null;
    const monthlyTrend = reviewSheet ? deriveMonthlyTrend(reviewSheet.header, reviewSheet.rows) : null;

    return {
      ...FALLBACK,
      source: "sheet",
      totalReviews: total > 0 ? total : FALLBACK.totalReviews,
      positivePct: posPct,
      negativePct: negPct,
      purposes: purposes ?? FALLBACK.purposes,
      monthlyTrend: monthlyTrend ?? FALLBACK.monthlyTrend,
    };
  } catch (error) {
    console.error("[ERROR] Public Sheets fetch failed:", error);
    return FALLBACK;
  }
}
