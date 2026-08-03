import { getDashboardData } from "@/lib/googleSheets";
import { Topbar } from "@/components/dashboard/Topbar";
import { Card } from "@/components/ui/Card";

export const revalidate = 60;

export default async function BranchesPage() {
  const data = await getDashboardData();
  const updatedAt = new Date(data.fetchedAt).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <>
      <Topbar updatedAt={updatedAt} source={data.source} />
      <div className="flex flex-col gap-5 flex-1 h-full overflow-hidden">
        <h2 className="text-lg font-bold">지점 비교 (경쟁우위 분석)</h2>
        <Card className="flex-1 overflow-auto">
          {data.branchStats.length > 0 ? (
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-[var(--hairline)]">
                  <th className="py-3 font-semibold text-[var(--muted)]">지점명</th>
                  <th className="py-3 font-semibold text-[var(--muted)] text-right">리뷰 수</th>
                  <th className="py-3 font-semibold text-[var(--muted)] text-right">평균 평점</th>
                  <th className="py-3 font-semibold text-[var(--muted)] text-right">긍정률</th>
                  <th className="py-3 font-semibold text-[var(--muted)] text-right">부정률</th>
                </tr>
              </thead>
              <tbody>
                {data.branchStats.map((b) => (
                  <tr key={b.branch} className="border-b border-[var(--hairline)]">
                    <td className="py-4 font-bold">{b.branch}</td>
                    <td className="py-4 text-right [font-variant-numeric:tabular-nums]">{b.reviewCount.toLocaleString()}건</td>
                    <td className="py-4 text-right font-semibold text-[var(--brand)]">{b.avgRating || "-"}</td>
                    <td className="py-4 text-right text-[var(--s-blue)] font-semibold">{b.positivePct}%</td>
                    <td className="py-4 text-right text-[var(--critical)] font-semibold">{b.negativePct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex-1 flex items-center justify-center h-full text-[var(--muted)] text-sm">
              지점별 차원 분석 데이터가 없습니다. (파이프라인 연동 대기)
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
