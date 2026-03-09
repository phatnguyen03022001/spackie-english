import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "English Learning Platform", // Đổi tên cho chuyên nghiệp
  description: "Learn English with AI-powered platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Thêm suppressHydrationWarning để tránh lỗi khi dùng theme dark/light
    <html lang="en" className="light" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        {/* Sau này bạn sẽ bọc <ThemeProvider> ở đây */}
        {children}
      </body>
    </html>
  );
}
