"use client";

import { useState } from "react";
import { AppSidebar } from "@/features/dashboard/components/AppSidebar";
import { usePathname } from "@/lib/i18n/routing";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, ChevronRight, Home } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuthContext";
import { BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();

  const pathSegments = pathname.split("/").filter((seg) => seg && seg !== user?.role?.toLowerCase());
  const role = user?.role as "ADMIN" | "TEACHER" | "STUDENT";

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background font-sans">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:block w-72 shrink-0 h-full border-r border-sidebar-border transition-colors duration-300">
        <AppSidebar role={role} />
      </aside>

      <div className="flex flex-col flex-1 min-w-0 h-full">
        {/* HEADER - Thiết kế đồng bộ với footer của Sidebar */}
        <header className="h-16 flex items-center px-4 lg:px-8 gap-3 bg-background/80 backdrop-blur-xl sticky top-0 z-50 transition-colors duration-300">
          {/* MOBILE MENU TRIGGER */}
          <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden hover:bg-sidebar-accent rounded-xl text-foreground/70 active:scale-95 transition-transform">
                <Menu size={20} strokeWidth={2.5} />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-80 h-full border-none shadow-2xl">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation Menu</SheetTitle>
              </SheetHeader>
              <AppSidebar role={role} onClose={() => setIsMobileOpen(false)} />
            </SheetContent>
          </Sheet>

          {/* SITEMAP (BREADCRUMBS) - Luôn hiển thị & Đồng bộ style footer */}
          <div className="flex-1 min-w-0 overflow-x-auto no-scrollbar py-2">
            <BreadcrumbList className="flex items-center flex-nowrap h-10">
              {" "}
              {/* Cố định chiều cao cha */}
              {/* Home Button */}
              <BreadcrumbItem className="shrink-0 flex items-center">
                <BreadcrumbLink
                  href="/dashboard"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all shadow-sm">
                  <Home size={14} strokeWidth={3} />
                </BreadcrumbLink>
              </BreadcrumbItem>
              {/* Segments */}
              {pathSegments.map((segment, index) => {
                const isLast = index === pathSegments.length - 1;
                return (
                  <div key={index} className="flex items-center shrink-0 h-8">
                    {" "}
                    {/* Cố định chiều cao */}
                    <BreadcrumbSeparator className="mx-1 flex items-center">
                      <ChevronRight size={14} strokeWidth={3} className="text-muted-foreground/30" />
                    </BreadcrumbSeparator>
                    <BreadcrumbItem className="flex items-center h-full">
                      {" "}
                      {/* Flex items-center để căn giữa chữ */}
                      {isLast ? (
                        <span className="capitalize text-[12px] font-black text-primary bg-primary/10 px-3 py-1 rounded-lg border border-primary/20 flex items-center h-8">
                          {segment.replace(/-/g, " ")}
                        </span>
                      ) : (
                        <BreadcrumbLink className="capitalize text-[12px] font-bold text-muted-foreground/50 hover:text-foreground px-2 py-1 flex items-center h-8 transition-all whitespace-nowrap">
                          {segment.replace(/-/g, " ")}
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </div>
                );
              })}
            </BreadcrumbList>
          </div>

          {/* Branding / Profile Indicator (Mobile) */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <div className="hidden sm:block h-8 w-px bg-sidebar-border/50 mx-2" />
            <div className="text-[10px] font-black text-primary tracking-widest uppercase opacity-80 hidden sm:block">
              Spackie
            </div>
            {/* Logo Mobile */}
            <div className="lg:hidden h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-primary-foreground font-black text-xs">S</span>
            </div>
          </div>
        </header>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-7xl mx-auto p-4 lg:p-8 animate-in fade-in slide-in-from-bottom-3 duration-700 ease-out">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
