import { google } from "googleapis";

export async function getDashboardData() {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;

  const mockData = {
    totalReviews: 1716,
    positivePct: 80,
    negativePct: 20,
    topKeywords: ["친절한 서비스", "깔끔한 국물", "넓은 주차장", "가족 외식", "혼밥 추천"],
    menuRanking: [
      { name: "수육백반", score: 85 },
      { name: "맛보기 순대", score: 65 },
      { name: "섞어국밥", score: 40 },
      { name: "내장국밥", score: 25 },
    ],
    purposes: [
      { name: "관광", pct: 48, color: "#10b981" },
      { name: "데이트", pct: 32, color: "#f59e0b" },
      { name: "일상", pct: 20, color: "#6366f1" },
    ]
  };

  if (!sheetId || !privateKey || !clientEmail) {
    console.warn("⚠️ Google Sheets credentials not fully configured. Using mock data.");
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
    const header = rows[0];
    const data = rows.slice(1);
    
    // 단순 집계 예시
    const totalReviews = data.length;
    
    // TODO: 감성/테마 분석 결과 컬럼이 존재한다면 실제 집계
    // 현재는 파이프라인에서 감성 분석 결과 컬럼이 없다고 가정하고 mock 비율 유지
    
    return {
      ...mockData,
      totalReviews: totalReviews > 0 ? totalReviews : mockData.totalReviews,
    };
  } catch (error) {
    console.error("Error fetching Google Sheets data:", error);
    return mockData;
  }
}
