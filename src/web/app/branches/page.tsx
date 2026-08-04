import { getDashboardData, getAllReviews } from "@/lib/googleSheets";
import { BranchExplorer } from "@/components/branches/BranchExplorer";

export const revalidate = 60;

export default async function BranchesPage() {
  const data = await getDashboardData();
  const reviews = await getAllReviews();

  return (
    <div className="flex-1 h-full -mx-6 px-6 -mt-6 pt-6 overflow-y-auto">
      <BranchExplorer branchStats={data.branchStats} reviews={reviews} />
    </div>
  );
}
