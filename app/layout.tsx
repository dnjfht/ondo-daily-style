import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ONDO — 오늘의 온도, 나의 스타일",
  description: "날씨와 나의 취향을 연결하는 데일리 스타일 추천",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&display=swap" />
      </head>
      <body><div className="top-banner">ONDO 스타일 멤버십 <b>오늘의 코디 무료 추천</b></div>{children}</body>
    </html>
  );
}
