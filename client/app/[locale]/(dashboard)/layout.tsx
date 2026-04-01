"use client";

import React from "react";
import { AppSidebar } from "@/features/dashboard/components/AppSidebar";
import { AppHeader } from "@/features/dashboard/components/AppHeader";
import { usePathname } from "@/lib/i18n/routing";
import { useAuth } from "@/features/auth/hooks/useAuthProvider";
import { Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  // --- 1. Loading State: Đồng bộ với Spackie Discovery Style ---
  if (!user)
    return (
      <div className="flex flex-col gap-6 h-screen w-full items-center justify-center bg-background overflow-hidden relative">
        {/* Glow effect phía sau loader */}
        <div className="absolute w-64 h-64 bg-primary/10 blur-[100px] rounded-full animate-pulse" />

        <div className="relative">
          <Loader2 className="animate-spin text-primary/20" size={48} strokeWidth={1} />
          <Loader2
            className="animate-spin text-primary absolute top-0 left-0 [animation-delay:-0.3s]"
            size={48}
            strokeWidth={3}
          />
        </div>

        <div className="flex flex-col items-center gap-1 relative">
          <span className="text-[10px] font-black tracking-[0.3em] uppercase text-primary animate-pulse">
            Spackie Studio
          </span>
          <p className="text-xs font-bold text-muted-foreground/60 tracking-wider">Đang xác thực quyền truy cập...</p>
        </div>
      </div>
    );

  const role = user?.role as "ADMIN" | "TEACHER" | "STUDENT";
  const pathSegments = pathname.split("/").filter((seg) => seg && seg !== role.toLowerCase());

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background font-sans selection:bg-primary/20">
      {/* --- 2. DESKTOP SIDEBAR: Tối giản & Tinh tế --- */}
      <aside className="hidden lg:block w-72 shrink-0 h-full relative z-30">
        <div className="h-full border-r border-border/30 bg-sidebar/40 backdrop-blur-2xl transition-all">
          <AppSidebar role={role} />
        </div>
        {/* Border ánh sáng siêu mỏng chạy dọc sidebar */}
        <div className="absolute top-0 right-0 h-full w-px bg-linear-to-b from-transparent via-primary/20 to-transparent opacity-50" />
      </aside>

      {/* --- 3. MAIN CONTAINER: Cấu trúc phân lớp --- */}
      <div className="flex flex-col flex-1 min-w-0 h-full relative">
        {/* Ambient Background Blobs: Tạo khối và chiều sâu cho layout */}
        <div className="absolute top-[-5%] right-[-5%] w-[45%] h-[45%] bg-primary/5 rounded-full blur-[140px] -z-10 pointer-events-none animate-pulse" />
        <div className="absolute bottom-[10%] left-[5%] w-[30%] h-[30%] bg-blue-500/5 rounded-full blur-[100px] -z-10 pointer-events-none" />

        {/* HEADER: Floating Glassmorphism Effect */}
        <header className="sticky top-0 z-20 w-full border-b border-border/30 bg-background/40 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto">
            <AppHeader role={role} pathSegments={pathSegments} />
          </div>
        </header>

        {/* CONTENT VIEWPORT */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar bg-transparent">
          <div
            className={cn(
              "max-w-7xl mx-auto w-full",
              "px-4 py-6 md:px-8 md:py-8 lg:px-10 lg:py-10",
              "animate-in fade-in slide-in-from-bottom-6 duration-1000 ease-out",
            )}>
            {/* Nội dung chính của trang */}
            <div className="relative z-10 min-h-full">{children}</div>

            {/* Footer Tối giản (Tùy chọn) */}
            <footer className="mt-20 pt-8 border-t border-border/5 flex items-center justify-between opacity-30 group hover:opacity-100 transition-opacity duration-500">
              <div className="flex items-center gap-2">
                <Sparkles size={12} className="text-primary" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em]">Spackie AI Learning Platform</span>
              </div>
              <span className="text-[9px] font-bold uppercase tracking-widest">v4.0.26 — Beta</span>
            </footer>
          </div>
        </main>

        {/* Mobile Decor overlay (nếu cần nhấn nhá thêm trên mobile) */}
        <div className="lg:hidden absolute bottom-0 left-0 w-full h-32 bg-linear-to-t from-background to-transparent pointer-events-none z-0" />
      </div>
    </div>
  );
}
