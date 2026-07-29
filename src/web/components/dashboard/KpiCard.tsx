import type { LucideIcon } from "lucide-react";

// 규격은 docs/design/wave-and-vibe-console.html 의 .kpi-card 를 따른다 (RULES 3.2.1).
// 데이터가 없는 지표는 값을 지어내지 않고 pending 으로 자리만 표시한다.
export type KpiCardProps = {
  label: string;
  icon: LucideIcon;
  /** 표시할 값. pending 이면 무시된다. */
  value?: string;
  /** 값 뒤에 붙는 단위 (%, / 5.0 등) */
  unit?: string;
  /** 값 아래 보조 설명 */
  meta?: string;
  /** 데이터 연동 전 상태. 값 대신 사유를 보여준다. */
  pending?: string;
};

export function KpiCard({ label, icon: Icon, value, unit, meta, pending }: KpiCardProps) {
  return (
    <div
      className={`bg-[var(--surface)] border border-[var(--hairline)] rounded-[var(--r-md)] px-[18px] py-[17px] relative overflow-hidden [box-shadow:var(--shadow)] ${
        pending ? "opacity-60" : ""
      }`}
    >
      <div className="text-xs text-[var(--muted)] flex items-center gap-[7px]">
        <Icon className="w-[14px] h-[14px]" aria-hidden />
        {label}
      </div>

      {pending ? (
        <>
          <div className="mt-[9px] text-[30px] font-bold leading-none tracking-[-1px] text-[var(--hairline)] select-none">
            —
          </div>
          <div className="mt-[11px] text-[11.5px] text-[var(--muted)]">{pending}</div>
        </>
      ) : (
        <>
          <div className="mt-[9px] text-[30px] font-bold leading-none tracking-[-1px] [font-variant-numeric:tabular-nums]">
            {value}
            {unit && <span className="text-base font-semibold text-[var(--muted)] ml-1">{unit}</span>}
          </div>
          {meta && (
            <div className="mt-[11px] flex items-center gap-1.5 text-[11.5px] text-[var(--muted)]">
              {meta}
            </div>
          )}
        </>
      )}
    </div>
  );
}
