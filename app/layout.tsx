import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ONDO — 오늘의 온도, 나의 스타일",
  description: "날씨와 나의 취향을 연결하는 데일리 스타일 추천",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
