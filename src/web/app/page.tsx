import { getDashboardData } from "@/lib/googleSheets";
import { DashboardClient } from "@/components/DashboardClient";

export const revalidate = 60; // 1분에 한 번씩 ISR 갱신 (서버 환경인 경우)

export default async function Page() {
  const data = await getDashboardData();
  
  return <DashboardClient initialData={data} />;
}
