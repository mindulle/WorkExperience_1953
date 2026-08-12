"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 구조와 치수는 docs/design/wave-and-vibe-console.html 의 .side 를 따른다 (RULES 3.2.1).
// 브랜드 명칭만 실제 제품 기준으로 바꾼다 — 프로토타입은 시각 규격의 기준이지
// 콘텐츠 정체성의 기준이 아니다.
const NAV_GROUPS = [
  {
    label: "개요",
    items: [
      { href: "/", label: "대시보드" },
      { href: "/reviews", label: "AI 리뷰 탐색" },
    ],
  },
  {
    label: "매장",
    items: [
      { href: "/branches", label: "지점 관리" },
      { href: "/segments", label: "고객 세그먼트" },
    ],
  },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 shrink-0 sticky top-0 h-screen flex flex-col gap-1 bg-[var(--surface)] border-r border-[var(--hairline)] px-4 py-[22px]">
      <div className="flex items-center gap-[11px] px-2 pt-1.5 pb-5">
        <div
          className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center text-white font-bold text-[15px]"
          style={{
            background: "linear-gradient(150deg, var(--s-blue), var(--s-aqua))",
            boxShadow: "0 2px 6px rgba(42, 120, 214, 0.35)",
          }}
        >
          1953
        </div>
        <div>
          <div className="text-sm font-semibold -tracking-[0.2px]">1953 대시보드</div>
          <div className="text-[11px] text-[var(--muted)] mt-px">리뷰 분석 및 현황</div>
        </div>
      </div>

      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <div className="px-2.5 pt-3.5 pb-1.5 text-[10.5px] font-semibold tracking-[0.06em] text-[var(--muted)] uppercase">
            {group.label}
          </div>
          {group.items.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-[11px] px-2.5 py-[9px] rounded-[var(--r-sm)] text-[13px] transition-colors ${
                  active
                    ? "bg-[var(--s-blue-soft)] text-[var(--brand)] font-semibold"
                    : "text-[var(--ink-2)] hover:bg-[var(--surface-2)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
