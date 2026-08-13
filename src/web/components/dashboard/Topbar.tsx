import { Building2, CalendarRange, Download, Radio, type LucideIcon } from "lucide-react";
import type { DashboardSource } from "@/lib/types";

function ScopeChip({ icon: Icon, label, value, options, onChange }: { icon: LucideIcon; label: string; value: string; options?: string[]; onChange?: (val: string) => void }) {
  if (options && onChange) {
    return (
      <label className="flex items-center gap-2 h-[38px] px-[13px] bg-[var(--surface)] border border-[var(--hairline)] rounded-[10px] text-[12.5px] text-[var(--ink-2)] whitespace-nowrap [box-shadow:var(--shadow-sm)] cursor-pointer hover:bg-[var(--surface-2)] transition-colors">
        <Icon className="w-[14px] h-[14px] text-[var(--muted)]" aria-hidden />
        <span className="text-[var(--muted)]">{label}</span>
        <select
          className="font-medium bg-transparent outline-none cursor-pointer"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <div className="flex items-center gap-2 h-[38px] px-[13px] bg-[var(--surface)] border border-[var(--hairline)] rounded-[10px] text-[12.5px] text-[var(--ink-2)] whitespace-nowrap [box-shadow:var(--shadow-sm)]">
      <Icon className="w-[14px] h-[14px] text-[var(--muted)]" aria-hidden />
      <span className="text-[var(--muted)]">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

// 프리셋 대신 시작일~종료일을 직접 고르는 달력 입력 두 개로 기간을 지정한다.
function DateRangeChip({
  from,
  to,
  onFromChange,
  onToChange,
}: {
  from: string;
  to: string;
  onFromChange: (val: string) => void;
  onToChange: (val: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 h-[38px] px-[13px] bg-[var(--surface)] border border-[var(--hairline)] rounded-[10px] text-[12.5px] text-[var(--ink-2)] whitespace-nowrap [box-shadow:var(--shadow-sm)]">
      <CalendarRange className="w-[14px] h-[14px] text-[var(--muted)] shrink-0" aria-hidden />
      <span className="text-[var(--muted)]">기간</span>
      <input
        type="date"
        value={from}
        max={to || undefined}
        onChange={(e) => onFromChange(e.target.value)}
        className="font-medium bg-transparent outline-none cursor-pointer w-[112px]"
        aria-label="시작일"
      />
      <span className="text-[var(--muted)]">~</span>
      <input
        type="date"
        value={to}
        min={from || undefined}
        onChange={(e) => onToChange(e.target.value)}
        className="font-medium bg-transparent outline-none cursor-pointer w-[112px]"
        aria-label="종료일"
      />
    </div>
  );
}

export function Topbar({
  title = "매장 리뷰 현황",
  subtitle,
  updatedAt,
  source,
  branchFilter,
  onBranchChange,
  branchOptions = ["전체"],
  dateFrom = "",
  dateTo = "",
  onDateFromChange,
  onDateToChange,
}: {
  title?: string;
  subtitle?: string;
  updatedAt: string;
  source: DashboardSource;
  branchFilter?: string;
  onBranchChange?: (val: string) => void;
  branchOptions?: string[];
  dateFrom?: string;
  dateTo?: string;
  onDateFromChange?: (val: string) => void;
  onDateToChange?: (val: string) => void;
}) {
  const isFallback = source === "fallback";

  return (
    <div className="sticky top-0 z-20 -mx-6 px-6 pt-[22px] pb-4 mb-1.5 border-b border-[var(--hairline)] bg-[rgba(246,246,243,0.82)] [backdrop-filter:saturate(180%)_blur(12px)]">
      <div className="flex items-end justify-between gap-5 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.4px]">{title}</h1>
          <p
            className={`mt-1.5 text-[12.5px] ${
              isFallback ? "text-[var(--critical)] font-medium" : "text-[var(--muted)]"
            }`}
          >
            {subtitle ? (
              subtitle
            ) : (
              <>
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
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-[9px] flex-wrap">
          <ScopeChip icon={Building2} label="지점" value={branchFilter || "전체"} options={branchOptions} onChange={onBranchChange} />
          {onDateFromChange && onDateToChange && (
            <DateRangeChip from={dateFrom} to={dateTo} onFromChange={onDateFromChange} onToChange={onDateToChange} />
          )}
          <ScopeChip icon={Radio} label="채널" value="카카오맵 외" />
          <button
            type="button"
            disabled
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
