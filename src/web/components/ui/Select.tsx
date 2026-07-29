"use client";

import React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown } from "lucide-react";

interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  options: Option[];
  selected?: string;
  onSelect?: (value: string) => void;
  className?: string;
}

export function Select({ options, selected, onSelect, className = "" }: SelectProps) {
  const selectedLabel = options.find((o) => o.value === selected)?.label || "선택...";

  return (
    <div className={className}>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          {/* role 을 지정하지 않는다. DropdownMenu.Trigger 가 button 역할과
              aria-haspopup / aria-expanded / aria-controls 를 직접 관리한다.
              combobox 는 선택 위젯의 role 이라 드롭다운 메뉴에 맞지 않고,
              필수 속성(aria-controls, aria-expanded)이 없어 a11y 위반이었다. */}
          <button
            className="flex w-full items-center justify-between border border-[var(--hairline)] rounded-[var(--r-sm)] bg-[var(--surface)] px-4 py-2 font-medium text-[var(--ink-2)] outline-none cursor-pointer hover:bg-[var(--surface-2)] focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all [box-shadow:var(--shadow-sm)]"
          >
            <span className="truncate">{selectedLabel}</span>
            <ChevronDown className="w-5 h-5 ml-2 text-[var(--muted)] shrink-0" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="bg-[var(--surface)] border border-[var(--hairline)] rounded-[var(--r-md)] p-1 min-w-[220px] z-50 [box-shadow:var(--shadow)] animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
            align="start"
            sideOffset={4}
          >
            {options.map((opt) => (
              <DropdownMenu.Item
                key={opt.value}
                className="px-3 py-2 text-sm font-medium text-[var(--ink-2)] rounded-[var(--r-sm)] cursor-pointer outline-none hover:bg-[var(--primary-soft)] focus:bg-[var(--primary-soft)] data-[highlighted]:bg-[var(--primary-soft)] transition-colors"
                onClick={() => onSelect && onSelect(opt.value)}
              >
                {opt.label}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
