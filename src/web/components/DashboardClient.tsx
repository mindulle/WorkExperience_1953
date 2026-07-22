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
      <aside className="w-80 flex flex-col gap-8">
        <Card elevation={3} className="h-full flex flex-col">
          <div className="mb-10 p-2">
            <h1 className="text-4xl font-bold mb-4">1953 대시보드</h1>
            <p className="text-lg text-gray-500">리뷰 분석 및 현황</p>
          </div>

          <nav className="flex flex-col gap-6 mb-10 p-2">
            <Button className="w-full text-left font-bold text-2xl">대시보드 (Page 1)</Button>
            <Button disabled className="w-full text-left text-gray-400 text-xl">로우 데이터 (Page 2) - 준비중</Button>
            <Button disabled className="w-full text-left text-gray-400 text-xl">기획서 (Page 3) - 준비중</Button>
          </nav>

          <div className="mt-auto border-t-2 border-dashed border-gray-400 pt-8 p-2">
            <h3 className="text-2xl mb-6 font-semibold">조회 기간</h3>
            <div className="bg-blue-100/50 p-6 rounded-2xl border-2 border-blue-300 border-dashed mb-6">
              <p className="font-bold text-xl text-blue-800 mb-2">{todayDate} (오늘)</p>
              <p className="text-md text-blue-600">기본값 적용됨</p>
            </div>
            <div className="space-y-4">
              <DatePicker label="시작일" className="w-full" />
              <DatePicker label="종료일" className="w-full" />
              <Button onClick={() => alert('조회 기간 필터 적용!')} className="w-full mt-6">기간 적용</Button>
            </div>
          </div>
        </Card>
      </aside>

      {/* 우측 메인 영역 */}
      <main className="flex-1 flex flex-col gap-10 overflow-y-auto pr-6 pb-6 pl-4">
        
        {/* 상단 헤더 (지점 및 채널 필터) */}
        <header className="flex justify-between items-center relative z-50 mb-6 bg-white/50 p-6 rounded-2xl border-2 border-dashed border-gray-300">
          <h2 className="text-4xl font-bold whitespace-nowrap">실시간 분석 리포트</h2>
          <div className="flex gap-8 items-center shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold whitespace-nowrap">지점 선택:</span>
              <Select 
                options={[
                  { value: "all", label: "전체 지점" },
                  { value: "main", label: "경성대본점" },
                  { value: "gwangan", label: "광안점" }
                ]} 
                selected={branch}
                onSelect={setBranch}
                className="text-xl min-w-40"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold whitespace-nowrap">채널:</span>
              <Select 
                options={[
                  { value: "all", label: "통합 (네이버+유튜브)" },
                  { value: "naver", label: "네이버 리뷰" },
                  { value: "youtube", label: "유튜브 댓글" }
                ]} 
                selected="all"
                className="text-xl min-w-48"
              />
            </div>
          </div>
        </header>

        {/* 대시보드 그리드 영역 */}
        <div className="grid grid-cols-3 gap-8 flex-1">
          
          {/* 1. 긍정/부정 리뷰 (도넛 그래프) - 실제 데이터 연동 예정 */}
          <Card className="col-span-1 flex flex-col">
            <h3 className="text-2xl font-bold mb-4">감성 분석 (긍/부정) - {initialData.totalReviews.toLocaleString()}건</h3>
            <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-full w-48 h-48 mx-auto my-4 relative">
              <span className="text-gray-400 absolute text-sm text-center">도넛 차트<br/>렌더링 영역</span>
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

          {/* 2. 월별 추이 (막대 그래프) - 미구현 */}
          <Card className="col-span-2 flex flex-col">
            <h3 className="text-2xl font-bold mb-4">월별 리뷰 추이 (시즌 비교)</h3>
            <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-300 bg-gray-50/50 text-gray-500 h-48">
              미구현 (추후 데이터 연동 및 차트 구현 예정)
            </div>
          </Card>

          {/* 3. 메뉴 데이터 (프로그레스 바) - 미구현 */}
          <Card className="col-span-1 flex flex-col">
            <h3 className="text-2xl font-bold mb-4">긍정 추천 메뉴</h3>
            <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-300 bg-gray-50/50 text-gray-500 min-h-32">
              미구현 (메뉴 키워드 추출 파이프라인 연동 필요)
            </div>
          </Card>

          {/* 4. 방문 목적 (도넛 차트) - 미구현 */}
          <Card className="col-span-1 flex flex-col">
            <h3 className="text-2xl font-bold mb-4">방문 목적 (타깃 분석)</h3>
            <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-300 bg-gray-50/50 text-gray-500 min-h-32">
              미구현 (방문 목적 분류 모델 적용 필요)
            </div>
          </Card>

          {/* 5. 지점별 강점 (오각형 그래프) & 6. 키워드 분석 (Top 5) - 미구현 */}
          <div className="col-span-1 flex flex-col gap-6">
            <Card className="flex-1 flex flex-col">
              <h3 className="text-2xl font-bold mb-2">지점별 강점 (경쟁우위)</h3>
              <div className="flex-1 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-500 bg-gray-50/50 text-center p-4">
                미구현<br/>(지점별 차원 분석 데이터 필요)
              </div>
            </Card>
            
            <Card className="flex-1 flex flex-col">
              <h3 className="text-2xl font-bold mb-2">Top 5 핵심 키워드</h3>
              <div className="flex-1 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-500 bg-gray-50/50 text-center p-4">
                미구현<br/>(워드클라우드/키워드 추출 연동 예정)
              </div>
            </Card>
          </div>

        </div>
      </main>
    </div>
  );
}
