import { Building2, CalendarRange, Download, Radio, type LucideIcon } from "lucide-react";
import type { DashboardSource } from "@/lib/types";

// 규격은 docs/design/wave-and-vibe-console.html 의 .topbar / .chip 을 따른다 (RULES 3.2.1).
// 프로토타입은 제목 · 상태 · 필터를 한 행에 담고 그 아래 KPI 행이 온다.
//
// 프로토타입의 chip 은 드롭다운 필터이나, 현재 파이프라인은 지점·채널별로
// 분리된 데이터를 만들지 않아 필터링할 대상이 없다. 눌러도 아무 일이 없는
// 컨트롤을 두는 대신, 지금 보고 있는 데이터의 범위를 알려주는 표시용으로 둔다.
// 필터링이 구현되면 그때 컨트롤로 바꾼다.
function ScopeChip({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 h-[38px] px-[13px] bg-[var(--surface)] border border-[var(--hairline)] rounded-[10px] text-[12.5px] text-[var(--ink-2)] whitespace-nowrap [box-shadow:var(--shadow-sm)]">
      <Icon className="w-[14px] h-[14px] text-[var(--muted)]" aria-hidden />
      <span className="text-[var(--muted)]">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export function Topbar({
  updatedAt,
  source,
}: {
  updatedAt: string;
  source: DashboardSource;
}) {
  const isFallback = source === "fallback";

  return (
    <div className="sticky top-0 z-20 -mx-6 px-6 pt-[22px] pb-4 mb-1.5 border-b border-[var(--hairline)] bg-[rgba(246,246,243,0.82)] [backdrop-filter:saturate(180%)_blur(12px)]">
      <div className="flex items-end justify-between gap-5 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.4px]">매장 리뷰 현황</h1>
          {/* 시트 조회에 실패하면 기본값이 쓰인다. 그 사실을 숨기면
              보는 사람이 기본값을 실제 수치로 오해한다. */}
          <p
            className={`mt-1.5 text-[12.5px] ${
              isFallback ? "text-[var(--critical)] font-medium" : "text-[var(--muted)]"
            }`}
          >
            <span
              className="inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle"
              style={{
                background: isFallback ? "var(--critical)" : "var(--good)",
                boxShadow: `0 0 0 3px ${isFallback ? "var(--critical-soft)" : "var(--good-soft)"}`,
              }}
              aria-hidden
            />
            {isFallback
              ? `구글 시트 조회 실패 · 기본값 표시 중 (${updatedAt} 시도)`
              : `구글 시트 연동 · 마지막 조회 ${updatedAt}`}
          </p>
        </div>

        <div className="flex items-center gap-[9px] flex-wrap">
          <ScopeChip icon={Building2} label="지점" value="전체 2개" />
          <ScopeChip icon={CalendarRange} label="기간" value="전체" />
          <ScopeChip icon={Radio} label="채널" value="네이버 + 유튜브" />
          <button
            type="button"
            disabled
            title="내보내기 기능은 아직 구현되지 않았습니다"
            className="flex items-center gap-2 h-[38px] px-[13px] rounded-[10px] text-[12.5px] whitespace-nowrap bg-[var(--brand)] border border-[var(--brand)] text-white opacity-40 cursor-not-allowed"
          >
            <Download className="w-[14px] h-[14px]" aria-hidden />
            내보내기
          </button>
        </div>
      </div>
    </div>
  );
}
