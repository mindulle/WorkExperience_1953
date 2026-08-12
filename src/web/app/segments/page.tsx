import { getDashboardData } from "@/lib/googleSheets";
import { SegmentExplorer } from "@/components/segments/SegmentExplorer";

export const revalidate = 60;

export default async function SegmentsPage() {
  const data = await getDashboardData();

  return (
    <div className="flex-1 h-full -mx-6 px-6 -mt-6 pt-6 overflow-y-auto">
      <SegmentExplorer purposes={data.purposes} customerTypes={data.customerTypes} />
    </div>
  );
}
