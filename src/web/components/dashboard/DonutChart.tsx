"use client";

import React from "react";

export type DonutSegment = {
  label: string;
  ratio: number; // 0~100, 합계 100 을 기대한다
  color: string;
};

/**
 * stroke-dasharray 기반 도넛 차트. 대시보드의 감성 비율 / 방문 목적 도넛에서
 * 중복 구현되던 SVG 로직을 하나로 모은다.
 */
export function DonutChart({ segments }: { segments: DonutSegment[] }) {
  const arcs = segments.reduce<{ label: string; color: string; dash: number; offset: number }[]>(
    (acc, s) => {
      const prevEnd = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].dash : 0;
      const dash = (s.ratio / 100) * 251;
      return [...acc, { label: s.label, color: s.color, dash, offset: prevEnd }];
    },
    []
  );

  return (
    <div className="flex items-center justify-center relative w-40 h-40 mx-auto my-4">
      <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
        {arcs.map((a) => (
          <circle
            key={a.label}
            cx="50"
            cy="50"
            r="40"
            fill="transparent"
            stroke={a.color}
            strokeWidth="20"
            strokeDasharray={`${a.dash} ${251 - a.dash}`}
            strokeDashoffset={`-${a.offset}`}
          />
        ))}
      </svg>
    </div>
  );
}
