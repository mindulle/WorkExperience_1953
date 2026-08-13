import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "1953형제돼지국밥 대시보드",
  description: "리뷰 분석 및 현황 관리 대시보드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full bg-[var(--plane)] text-[var(--ink)]">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 min-w-0 flex flex-col gap-6 p-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
