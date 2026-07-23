"use client";

import React, { useState } from "react";
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

export function Select({ options, selected, onSelect, className }: SelectProps) {
  const selectedLabel = options.find((o) => o.value === selected)?.label || "선택...";

  return (
    <div className={className}>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            className="flex w-full items-center justify-between border-2 border-black rounded-lg bg-white px-4 py-2 font-bold outline-none cursor-pointer hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none transition-all"
            role="combobox"
            aria-haspopup="menu"
          >
            {selectedLabel}
            <ChevronDown className="w-5 h-5 ml-2 text-gray-600" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl p-2 min-w-[220px] z-50 animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
            align="start"
            sideOffset={8}
          >
            {options.map((opt) => (
              <DropdownMenu.Item
                key={opt.value}
                className="px-4 py-3 text-lg font-bold text-gray-800 rounded-lg cursor-pointer outline-none hover:bg-blue-100 focus:bg-blue-100 data-[highlighted]:bg-blue-100"
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
