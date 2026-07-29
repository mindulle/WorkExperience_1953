import type { DashboardData } from "./types";

export async function getDashboardData(): Promise<DashboardData> {
  // output:"export" 정적 익스포트라 이 함수는 빌드 시점에 한 번 실행된다.
  // 즉 화면에 표시되는 "마지막 조회"는 마지막 배포 시각과 같다.
  const fetchedAt = new Date().toISOString();

  // 조회 실패 시 쓰는 값. 실제 정제 결과(99% / 1%)와 다르므로
  // source: "fallback" 으로 표시해 화면이 실제 값과 구분할 수 있게 한다.
  const FALLBACK: DashboardData = {
    fetchedAt,
    source: "fallback",
    totalReviews: 1716,
    positivePct: 80,
    negativePct: 20,
    topKeywords: [],
    menuRanking: [],
    purposes: []
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

    return {
      ...FALLBACK,
      source: "sheet",
      totalReviews: total > 0 ? total : FALLBACK.totalReviews,
      positivePct: posPct,
      negativePct: negPct,
    };
  } catch (error) {
    console.error("[ERROR] Public Sheets fetch failed:", error);
    return FALLBACK;
  }
}
