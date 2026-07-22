"use client";

import dynamic from "next/dynamic";
import React, { useState } from "react";
import { DatePicker } from "@/components/ui/DatePicker";

// 다이나믹 임포트로 클라이언트 사이드 렌더링 강제 (wired-elements 호환성)
const Button = dynamic(() => import("@/components/ui/Button").then((mod) => mod.Button), { ssr: false });
const Input = dynamic(() => import("@/components/ui/Input").then((mod) => mod.Input), { ssr: false });
const Card = dynamic(() => import("@/components/ui/Card").then((mod) => mod.Card), { ssr: false });
const Select = dynamic(() => import("@/components/ui/Select").then((mod) => mod.Select), { ssr: false });
const Progress = dynamic(() => import("@/components/ui/Progress").then((mod) => mod.Progress), { ssr: false });

export function DashboardClient({ initialData }: { initialData: any }) {
  const [branch, setBranch] = useState("all");
  const todayDate = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).replace(/\.$/, '');

  return (
    <div className="flex h-screen bg-[#fdfbf7] text-gray-800 p-4 gap-6 font-sans">
      
      {/* 1. 좌측 사이드바 (메뉴 및 기간 필터) */}
      <aside className="w-64 flex flex-col gap-6">
        <Card elevation={3} className="h-full flex flex-col">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">1953 대시보드</h1>
            <p className="text-sm text-gray-500">리뷰 분석 및 현황</p>
          </div>

          <nav className="flex flex-col gap-4 mb-8">
            <Button className="w-full text-left font-bold text-xl">📊 대시보드 (Page 1)</Button>
            <Button className="w-full text-left text-gray-500">📁 로우 데이터 (Page 2)</Button>
            <Button className="w-full text-left text-gray-500">📝 기획서 (Page 3)</Button>
          </nav>

          <div className="mt-auto border-t border-dashed border-gray-400 pt-6">
            <h3 className="text-xl mb-4 font-semibold">📅 조회 기간</h3>
            {/* 오늘 날짜 파란색 음영 기획 반영 */}
            <div className="bg-blue-100/50 p-4 rounded-xl border border-blue-200 border-dashed mb-4">
              <p className="font-bold text-blue-800">{todayDate} (오늘)</p>
              <p className="text-sm text-blue-600">기본값 적용됨</p>
            </div>
            <DatePicker label="시작일" className="mb-2 w-full" />
            <DatePicker label="종료일" className="w-full" />
            <Button onClick={() => alert('조회 기간 필터 적용!')} className="w-full mt-4">기간 적용</Button>
          </div>
        </Card>
      </aside>

      {/* 우측 메인 영역 */}
      <main className="flex-1 flex flex-col gap-6 overflow-y-auto pr-4 pb-4">
        
        {/* 상단 헤더 (지점 및 채널 필터) */}
        <header className="flex justify-between items-center relative z-50">
          <h2 className="text-3xl font-bold">실시간 분석 리포트</h2>
          <div className="flex gap-4 items-center">
            <span className="text-xl">지점 선택:</span>
            <Select 
              options={[
                { value: "all", label: "전체 지점" },
                { value: "main", label: "경성대본점" },
                { value: "gwangan", label: "광안점" }
              ]} 
              selected={branch}
              onSelect={setBranch}
            />
            <span className="text-xl ml-4">채널:</span>
            <Select 
              options={[
                { value: "all", label: "통합 (네이버+유튜브)" },
                { value: "naver", label: "네이버 리뷰" },
                { value: "youtube", label: "유튜브 댓글" }
              ]} 
              selected="all"
            />
          </div>
        </header>

        {/* 대시보드 그리드 영역 (기획된 6가지 차트 영역) */}
        <div className="grid grid-cols-3 gap-6 flex-1">
          
          {/* 1. 긍정/부정 리뷰 (도넛 그래프) */}
          <Card className="col-span-1 flex flex-col">
            <h3 className="text-2xl font-bold mb-4">😊 감성 분석 (긍/부정) - {initialData.totalReviews.toLocaleString()}건</h3>
            <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-full w-48 h-48 mx-auto my-4 relative">
              <span className="text-gray-400 absolute">도넛 차트 렌더링 영역</span>
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90 opacity-30">
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#3b82f6" strokeWidth="20" strokeDasharray={`${initialData.positivePct * 2.51} 251`} />
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#ef4444" strokeWidth="20" strokeDasharray={`${initialData.negativePct * 2.51} 251`} strokeDashoffset={`-${initialData.positivePct * 2.51}`} />
              </svg>
            </div>
            <div className="flex justify-around mt-4 text-xl">
              <span className="text-blue-600 font-bold">긍정 {initialData.positivePct}%</span>
              <span className="text-red-500 font-bold">부정 {initialData.negativePct}%</span>
            </div>
          </Card>

          {/* 2. 월별 추이 (막대 그래프) */}
          <Card className="col-span-2 flex flex-col">
            <h3 className="text-2xl font-bold mb-4">📈 월별 리뷰 추이 (시즌 비교)</h3>
            <div className="flex-1 flex items-end justify-between border-b-2 border-l-2 border-gray-400 pb-2 pl-2 px-8 h-48 relative">
              <span className="text-gray-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">막대 차트 렌더링 영역</span>
              {/* Dummy Bars */}
              <div className="w-12 h-24 bg-blue-200 border-2 border-blue-400 flex items-start justify-center"><span className="text-sm -mt-6">여름</span></div>
              <div className="w-12 h-32 bg-gray-200 border-2 border-gray-400"></div>
              <div className="w-12 h-16 bg-blue-200 border-2 border-blue-400"></div>
              <div className="w-12 h-40 bg-gray-200 border-2 border-gray-400 flex items-start justify-center"><span className="text-sm -mt-6">겨울</span></div>
              <div className="w-12 h-20 bg-blue-200 border-2 border-blue-400"></div>
              <div className="w-12 h-28 bg-gray-200 border-2 border-gray-400"></div>
            </div>
          </Card>

          {/* 3. 메뉴 데이터 (프로그레스 바) */}
          <Card className="col-span-1 flex flex-col">
            <h3 className="text-2xl font-bold mb-4">🍲 긍정 추천 메뉴</h3>
            <div className="flex flex-col gap-4 mt-2">
              {initialData.menuRanking.map((menu: any, idx: number) => (
                <Progress key={idx} value={menu.score} label={`${idx + 1}위. ${menu.name} (${menu.score}%)`} />
              ))}
            </div>
          </Card>

          {/* 4. 방문 목적 (도넛 차트 - Device Type 형식 차용) */}
          <Card className="col-span-1 flex flex-col">
            <h3 className="text-2xl font-bold mb-4">🎯 방문 목적 (타깃 분석)</h3>
            <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-full w-48 h-48 mx-auto my-4 relative">
              <span className="text-gray-400 absolute text-center text-sm">3조각 도넛 차트<br/>(관광/데이트/혼밥)</span>
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90 opacity-30">
                <circle cx="50" cy="50" r="40" fill="transparent" stroke={initialData.purposes[0].color} strokeWidth="20" strokeDasharray={`${initialData.purposes[0].pct * 2.51} 251`} />
                <circle cx="50" cy="50" r="40" fill="transparent" stroke={initialData.purposes[1].color} strokeWidth="20" strokeDasharray={`${initialData.purposes[1].pct * 2.51} 251`} strokeDashoffset={`-${initialData.purposes[0].pct * 2.51}`} />
                <circle cx="50" cy="50" r="40" fill="transparent" stroke={initialData.purposes[2].color} strokeWidth="20" strokeDasharray={`${initialData.purposes[2].pct * 2.51} 251`} strokeDashoffset={`-${(initialData.purposes[0].pct + initialData.purposes[1].pct) * 2.51}`} />
              </svg>
            </div>
            <div className="flex justify-around mt-4 text-lg">
              {initialData.purposes.map((p: any, idx: number) => (
                <span key={idx} style={{ color: p.color }}>{p.name} {p.pct}%</span>
              ))}
            </div>
          </Card>

          {/* 5. 지점별 강점 (오각형 그래프) & 6. 키워드 분석 (Top 5) */}
          <div className="col-span-1 flex flex-col gap-6">
            <Card className="flex-1">
              <h3 className="text-2xl font-bold mb-2">⭐ 지점별 강점 (경쟁우위)</h3>
              <div className="w-full h-32 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-center">
                오각형(방사형) 차트<br/>렌더링 영역
              </div>
            </Card>
            
            <Card className="flex-1">
              <h3 className="text-2xl font-bold mb-2">🏷️ Top 5 핵심 키워드</h3>
              <ol className="list-decimal list-inside text-xl space-y-1 ml-4 text-gray-700">
                {initialData.topKeywords.map((kw: string, idx: number) => (
                  <li key={idx} className={idx === 0 ? "font-bold text-gray-900" : ""}>{kw}</li>
                ))}
              </ol>
            </Card>
          </div>

        </div>
      </main>
    </div>
  );
}
