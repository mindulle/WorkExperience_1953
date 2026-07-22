"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 font-sans bg-amber-50/50">
      <h1 className="text-4xl font-bold mb-8 tracking-wider text-gray-800">
        1953형제돼지국밥 대시보드
      </h1>
      
      <Card className="w-full max-w-2xl bg-white">
        <div className="flex flex-col gap-6">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">데이터 조회</h2>
            <p className="text-gray-600">조회할 기간이나 지점명을 입력하세요 (Lo-Fi 스케치 모드 적용됨)</p>
          </div>
          
          <div className="flex gap-4">
            <Input className="flex-1" placeholder="예: 경성대본점" />
            <Button onClick={() => alert('검색 기능은 준비 중입니다!')}>
              검색하기
            </Button>
          </div>

          <div className="mt-8 border-t border-dashed border-gray-300 pt-6">
            <h3 className="font-semibold mb-4">분석 요약 (샘플)</h3>
            <div className="flex gap-4">
              <Card elevation={1} className="flex-1 text-center">
                <p className="text-sm text-gray-500">총 리뷰 수</p>
                <p className="text-2xl font-bold">1,716</p>
              </Card>
              <Card elevation={1} className="flex-1 text-center">
                <p className="text-sm text-gray-500">긍정 비율</p>
                <p className="text-2xl font-bold text-blue-600">89%</p>
              </Card>
              <Card elevation={1} className="flex-1 text-center">
                <p className="text-sm text-gray-500">부정 비율</p>
                <p className="text-2xl font-bold text-red-500">0.8%</p>
              </Card>
            </div>
          </div>
        </div>
      </Card>
      
      <div className="mt-12 text-sm text-gray-500 max-w-lg text-center">
        <p>※ 이 화면은 Tldraw 와이어프레임 감성을 살리기 위해 <b>wired-elements</b>로 렌더링된 초기 스케치 화면입니다.</p>
        <p>추후 디자인 시스템 확정 시, 컴포넌트 내부(Wrapper)만 교체하면 즉시 정식 UI로 변환됩니다.</p>
      </div>
    </main>
  );
}
