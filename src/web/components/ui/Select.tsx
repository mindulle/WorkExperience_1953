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
          <button
            className="flex w-full items-center justify-between border border-[var(--hairline)] rounded-[var(--r-sm)] bg-[var(--surface)] px-4 py-2 font-medium text-[var(--ink-2)] outline-none cursor-pointer hover:bg-[var(--surface-2)] focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all [box-shadow:var(--shadow-sm)]"
            role="combobox"
            aria-haspopup="menu"
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
