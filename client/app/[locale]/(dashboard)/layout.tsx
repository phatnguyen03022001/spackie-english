"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import { AppSidebar } from "@/features/dashboard/components/AppSidebar";
import { AppHeader } from "@/features/dashboard/components/AppHeader";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const locale = params.locale as string | undefined;
  const roleParam = params.role as string | undefined;

  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebar-collapsed");
      return saved !== null ? saved === "true" : false;
    }
    return false;
  });

  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 768;
    }
    return false;
  });

  // Redirect effect (giữ nguyên)
  useEffect(() => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 2 && locale && roleParam) {
      router.replace(`/${locale}/${roleParam.toLowerCase()}/vocabulary`);
    }
  }, [pathname, locale, roleParam, router]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Nếu không có roleParam, render children (ví dụ trang login) KHÔNG có sidebar
  // Nhưng nếu có roleParam, luôn render sidebar/header (kể cả role không hợp lệ, để tránh mất UI)
  if (!roleParam) {
    return <>{children}</>;
  }

  // Ép kiểu an toàn, mặc định là STUDENT nếu không phải ADMIN/TEACHER
  let role: "ADMIN" | "TEACHER" | "STUDENT" = "STUDENT";
  if (roleParam.toUpperCase() === "ADMIN") role = "ADMIN";
  else if (roleParam.toUpperCase() === "TEACHER") role = "TEACHER";
  else role = "STUDENT";

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem("sidebar-collapsed", String(newState));
  };

  const pathSegments = pathname.split("/").filter(Boolean).slice(2);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {!isMobile && (
        <div className="fixed left-0 top-0 h-full z-20 transition-all duration-300">
          <AppSidebar role={role} collapsed={isCollapsed} onToggleCollapse={toggleSidebar} />
        </div>
      )}

      <main
        className={cn(
          "flex-1 flex flex-col overflow-auto transition-all duration-300",
          !isMobile && (isCollapsed ? "ml-20" : "ml-72"),
        )}>
        <AppHeader pathSegments={pathSegments} role={role} />
        <div className="flex-1 p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}
