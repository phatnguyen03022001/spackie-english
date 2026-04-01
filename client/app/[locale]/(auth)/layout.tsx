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
    <div className="relative flex min-h-screen w-full bg-background overflow-hidden selection:bg-primary/30">
      {/* 1. CỘT TRÁI: VIDEO NỀN (Chiếm trọn màn hình ở Mobile, một nửa ở Desktop) */}
      <div className="absolute inset-0 lg:relative lg:flex lg:w-1/2 flex-col justify-between p-12 overflow-hidden border-r border-border/10">
        {/* Video nền với Overlay mượt hơn */}
        <div className="absolute inset-0 z-0">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover scale-105" // scale nhẹ để tránh viền đen khi video rung
            poster="/home/intro-1.jpg">
            <source src="/home/intro.webm" type="video/webm" />
            <source src="/home/intro.mp4" type="video/mp4" />
          </video>

          {/* Lớp phủ Gradient đa tầng: Giúp text bên trái và form bên phải đều dễ đọc */}
          <div className="absolute inset-0 bg-linear-to-br from-background/80 via-background/40 to-transparent z-10" />
          <div className="absolute inset-0 bg-linear-to-t from-background via-transparent to-transparent z-10 lg:hidden" />
        </div>

        {/* Brand Logo - Hiển thị ở góc trên cho Desktop */}
        <div className="relative z-20 hidden lg:block">
          <Link href="/" className="flex items-center gap-2.5 group w-fit">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-all group-hover:rotate-6">
              <GraduationCap size={22} />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">
              {t("brand_name_part1")}
              <span className="text-primary">{t("brand_name_part2")}</span>
            </span>
          </Link>
        </div>

        {/* Nội dung Quote ở cột trái */}
        <div className="relative z-20 mt-auto max-w-lg hidden lg:block">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full glass border border-white/10 px-4 py-1.5 text-xs font-semibold text-foreground/90 shadow-2xl">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            {t("badge") || "New Version 4.0"}
          </div>

          <blockquote className="space-y-6">
            <p className="text-4xl font-bold text-foreground leading-[1.1] tracking-tight drop-shadow-md italic">
              &quot;{t("quote")}&quot;
            </p>
            <footer className="flex items-center gap-4">
              <div className="h-px w-12 bg-primary/50" />
              <span className="text-muted-foreground font-medium tracking-wide uppercase text-sm">
                — {t("quote_author")}
              </span>
            </footer>
          </blockquote>
        </div>
      </div>

      {/* 2. CỘT PHẢI: FORM CONTAINER */}
      <div className="relative z-20 flex flex-col w-full lg:w-1/2 items-center justify-center p-6 sm:p-12 lg:bg-background/80 lg:backdrop-blur-sm">
        {/* Mobile Header (Chỉ hiện trên mobile) */}
        <div className="lg:hidden absolute top-10 left-1/2 -translate-x-1/2 z-30">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap size={24} />
            </div>
          </Link>
        </div>

        <div className="w-full max-w-105 space-y-10">
          {/* Welcome Text */}
          <div className="space-y-3 text-center lg:text-left">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground lg:text-5xl">{t("welcome")}</h1>
            <p className="text-base text-muted-foreground max-w-[320px] lg:max-w-none mx-auto">{t("subtitle")}</p>
          </div>

          {/* Render Form Con (Children) */}
          <main className="relative group">
            {/* Hiệu ứng đổ bóng phía sau form để tạo chiều sâu */}
            <div className="absolute -inset-4 bg-primary/5 rounded-4xl blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative">{children}</div>
          </main>

          {/* Footer chân trang */}
          <footer className="pt-8 border-t border-border/40">
            <p className="text-center text-[12px] leading-relaxed text-muted-foreground lg:text-left">
              {t("terms_text")}{" "}
              <Link
                href="/terms"
                className="text-foreground hover:text-primary underline underline-offset-4 transition-all font-medium">
                {t("terms_link")}
              </Link>{" "}
              {t("and")}{" "}
              <Link
                href="/privacy"
                className="text-foreground hover:text-primary underline underline-offset-4 transition-all font-medium">
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
