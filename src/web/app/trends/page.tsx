import { getAllReviews } from "@/lib/googleSheets";
import { TrendExplorer } from "@/components/trends/TrendExplorer";

export const revalidate = 60;

export default async function TrendsPage() {
  const reviews = await getAllReviews();

  return (
    <div className="flex-1 h-full -mx-6 px-6 -mt-6 pt-6 overflow-y-auto">
      <TrendExplorer reviews={reviews} />
    </div>
  );
}
