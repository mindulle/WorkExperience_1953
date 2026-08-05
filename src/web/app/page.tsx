import { getDashboardData, getAllReviews } from "@/lib/googleSheets";
import { DashboardClient } from "@/components/DashboardClient";

export const revalidate = 60; // 1분에 한 번씩 ISR 갱신 (서버 환경인 경우)

export default async function Page() {
  const data = await getDashboardData();
  const allReviews = await getAllReviews();

  // 날짜 포맷은 서버에서 끝낸다. 클라이언트 컴포넌트에서 toLocaleString 을
  // 부르면 Node 와 브라우저의 ICU 데이터 차이로 하이드레이션 불일치가 난다.
  const updatedAt = new Date(data.fetchedAt).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short",
  });

  return <DashboardClient initialData={data} updatedAt={updatedAt} allReviews={allReviews} />;
}
