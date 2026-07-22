import { google } from "googleapis";

export async function getDashboardData() {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;

  const mockData = {
    totalReviews: 1716,
    positivePct: 80,
    negativePct: 20,
    topKeywords: [],
    menuRanking: [],
    purposes: []
  };

  if (!sheetId || !privateKey || !clientEmail) {
    console.warn("[WARN] Google Sheets credentials not fully configured. Using mock data.");
    return mockData;
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    
    // 1. 정제_언급데이터 가져오기
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "정제_언급데이터!A:Z",
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return mockData;

    // 실제 데이터 연동 로직 (데이터 스키마에 맞춰 집계 로직을 짜야 하지만, 
    // 현재는 샘플로 행 갯수를 총 리뷰 수로 사용하고, 나머지는 mockData 구조를 반환)
    const data = rows.slice(1);
    const totalReviews = data.length;
    
    return {
      ...mockData,
      totalReviews: totalReviews > 0 ? totalReviews : mockData.totalReviews,
    };
  } catch (error) {
    console.error("[ERROR] Failed to fetch Google Sheets data:", error);
    return mockData;
  }
}
