import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "1953형제돼지국밥 대시보드",
  description: "리뷰 분석 및 현황 관리 대시보드 (Lo-Fi)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
