"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/routing";
import { GraduationCap } from "lucide-react";

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  const t = useTranslations("auth.layout");

  return (
    <div className="relative flex min-h-screen w-full bg-zinc-950 lg:grid lg:grid-cols-2 overflow-hidden">
      {/* CỘT TRÁI: VIDEO NỀN */}
      <div className="absolute inset-0 lg:relative lg:flex flex-col justify-between p-12 overflow-hidden">
        {/* Thay thế Image bằng Video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-50"
          poster="/home/intro-1.jpg" // Vẫn giữ ảnh cũ làm poster để tránh màn hình đen khi video chưa load
        >
          <source src="/home/intro.webm" type="video/webm" />
          <source src="/home/intro.mp4" type="video/mp4" /> {/* Fallback cho trình duyệt không hỗ trợ webm */}
        </video>

        {/* Lớp phủ Gradient - Quan trọng để text nổi bật trên video */}
        <div className="absolute inset-0 bg-linear-to-t from-zinc-950 via-zinc-950/60 to-zinc-900/20 z-10" />

        {/* Nội dung text ở cột trái */}
        <div className="relative z-20 mt-auto max-w-md hidden lg:block text-foreground">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-3 py-1 text-xs font-medium border border-white/20 text-white">
            {t("badge")}
          </div>
          <blockquote className="space-y-4">
            <p className="text-4xl font-semibold text-white leading-tight tracking-tight drop-shadow-sm">
              &quot;{t("quote")}&quot;
            </p>
            <footer className="text-zinc-400 font-medium">— {t("quote_author")}</footer>
          </blockquote>
        </div>
      </div>

      {/* CỘT PHẢI: FORM (Giữ nguyên cấu trúc logic) */}
      <div className="relative z-20 flex flex-col w-full items-center justify-center p-6 sm:p-12 bg-zinc-950/40 backdrop-blur-xl lg:bg-zinc-950">
        <div className="w-full max-w-110 space-y-8">
          <div className="flex flex-col items-center lg:items-start gap-6">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-transform group-hover:scale-105">
                <GraduationCap size={28} />
              </div>
              <span className="text-2xl font-bold tracking-tight text-white">
                {t("brand_name_part1")}
                <span className="text-primary">{t("brand_name_part2")}</span>
              </span>
            </Link>

            <div className="space-y-1.5 text-center lg:text-left">
              <h1 className="text-3xl font-bold tracking-tight text-white">{t("welcome")}</h1>
              <p className="text-sm text-zinc-400">{t("subtitle")}</p>
            </div>
          </div>

          <main className="w-full text-white animate-in fade-in slide-in-from-bottom-4 duration-700">{children}</main>

          <footer className="pt-4 border-t border-white/10">
            <p className="text-center text-xs leading-relaxed text-zinc-500 lg:text-left">
              {t("terms_text")}{" "}
              <Link href="/terms" className="underline text-zinc-300 hover:text-white transition-colors">
                {t("terms_link")}
              </Link>{" "}
              {t("and")}{" "}
              <Link href="/privacy" className="underline text-zinc-300 hover:text-white transition-colors">
                {t("privacy_link")}
              </Link>
              .
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
