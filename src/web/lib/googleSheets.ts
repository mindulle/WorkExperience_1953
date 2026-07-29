import type { DashboardData, VisitPurpose } from "./types";

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

export async function getDashboardData(): Promise<DashboardData> {
  // output:"export" 정적 익스포트라 이 함수는 빌드 시점에 한 번 실행된다.
  // 즉 화면에 표시되는 "마지막 조회"는 마지막 배포 시각과 같다.
  const fetchedAt = new Date().toISOString();

  // 조회 실패 시 쓰는 값. 실제 정제 결과(99% / 1%)와 다르므로
  // source: "fallback" 으로 표시해 화면이 실제 값과 구분할 수 있게 한다.
  // purposes 는 이슈 #71에서 594건 리뷰 본문을 직접 읽어 분류한 실측치를 그대로 담는다
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
  };

  const SHEET_ID = process.env.GOOGLE_SHEET_ID || "13Z0VlvkblfBrT7BtNK1iw2dbVsLMkrAh1XgP1SfRnJg";
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=%EC%A0%95%EC%A0%9C_%EC%96%B8%EA%B8%89%EB%8D%B0%EC%9D%B4%ED%84%B0`;

  // 정제_리뷰데이터 탭(이슈 #66~71 산출물)에서 방문 목적 분포를 읽는다.
  // 탭이 아직 없으면(예: 서비스 계정 미설정으로 업로드 전) null을 반환해 FALLBACK 값을 쓴다.
  const purposesUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=%EC%A0%95%EC%A0%9C_%EB%A6%AC%EB%B7%B0%EB%8D%B0%EC%9D%B4%ED%84%B0`;
  async function fetchPurposes(): Promise<VisitPurpose[] | null> {
    try {
      const res = await fetch(purposesUrl, { next: { revalidate: 60 } });
      if (!res.ok) return null;
      const rows = parseCsv(await res.text());
      if (rows.length < 2) return null;
      const header = rows[0];
      const col = header.indexOf("visit_origin");
      if (col === -1) return null; // 탭이 없어 기본(정제_언급데이터) 탭으로 폴백된 경우 등

      const counts: Record<string, number> = {};
      for (const row of rows.slice(1)) {
        const v = row[col];
        if (!v) continue;
        counts[v] = (counts[v] ?? 0) + 1;
      }
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      return total > 0 ? toRatios(counts) : null;
    } catch {
      return null;
    }
  }

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

    const purposes = await fetchPurposes();

    return {
      ...FALLBACK,
      source: "sheet",
      totalReviews: total > 0 ? total : FALLBACK.totalReviews,
      positivePct: posPct,
      negativePct: negPct,
      purposes: purposes ?? FALLBACK.purposes,
    };
  } catch (error) {
    console.error("[ERROR] Public Sheets fetch failed:", error);
    return FALLBACK;
  }
}
