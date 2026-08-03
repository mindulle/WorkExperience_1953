import { getAllReviews } from "@/lib/googleSheets";
import { Topbar } from "@/components/dashboard/Topbar";
import { Card } from "@/components/ui/Card";
import { Star } from "lucide-react";

export const revalidate = 60;

export default async function ReviewsPage() {
  const reviews = await getAllReviews();
  const updatedAt = new Date().toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <>
      <Topbar updatedAt={updatedAt} source="sheet" />
      
      <div className="flex flex-col gap-5 flex-1 h-full overflow-hidden">
        <div className="flex justify-between items-end">
          <h2 className="text-lg font-bold">리뷰 탐색 ({reviews.length.toLocaleString()}건)</h2>
          <span className="text-[var(--muted)] text-sm">필터링 기능은 준비 중입니다.</span>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2 pb-10 flex flex-col gap-4">
          {reviews.map((r) => (
            <Card key={r.id} className="flex flex-col gap-2">
              <div className="flex justify-between items-start border-b border-[var(--hairline)] pb-2 mb-1">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--content)]">{r.branch}</span>
                    <span className="text-xs text-[var(--muted)] px-1.5 py-0.5 bg-[var(--plane)] rounded-md border border-[var(--hairline)]">
                      {r.channel}
                    </span>
                    {r.rating && r.rating > 0 && (
                      <span className="flex items-center text-xs font-semibold text-[var(--brand)] gap-0.5">
                        <Star className="w-3 h-3 fill-current" /> {r.rating}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[var(--muted)]">
                    {r.author} · {r.date}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    r.sentiment === "긍정" ? "bg-[var(--s-blue-soft)] text-[var(--s-blue)]" :
                    r.sentiment === "부정" ? "bg-[var(--critical-soft)] text-[var(--critical)]" :
                    "bg-[var(--plane)] text-[var(--muted)]"
                  }`}>
                    {r.sentiment}
                  </span>
                  {r.url && (
                    <a href={r.url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline">
                      원문 링크 ↗
                    </a>
                  )}
                </div>
              </div>
              
              <p className="text-sm text-[var(--content)] whitespace-pre-wrap leading-relaxed">
                {r.content}
              </p>
              
              {r.keywords && r.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {r.keywords.map((k, idx) => (
                    <span key={idx} className="text-[10px] bg-[var(--plane)] text-[var(--muted)] px-1.5 py-0.5 rounded">
                      #{k}
                    </span>
                  ))}
                </div>
              )}
            </Card>
          ))}
          {reviews.length === 0 && (
            <div className="text-center py-10 text-[var(--muted)]">수집된 리뷰가 없습니다.</div>
          )}
        </div>
      </div>
    </>
  );
}
