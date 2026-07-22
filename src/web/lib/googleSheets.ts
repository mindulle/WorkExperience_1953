export async function getDashboardData() {
  const MOCK_DATA = {
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
      ...MOCK_DATA,
      totalReviews: total > 0 ? total : MOCK_DATA.totalReviews,
      positivePct: posPct,
      negativePct: negPct,
    };
  } catch (error) {
    console.error("[ERROR] Public Sheets fetch failed:", error);
    return MOCK_DATA;
  }
}
