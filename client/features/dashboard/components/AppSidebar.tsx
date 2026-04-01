"use client";

import { usePathname, useRouter } from "@/lib/i18n/routing";
import { Link } from "@/lib/i18n/routing";
import { useTheme } from "next-themes";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LogOut, Moon, Sun, BookOpen, Languages } from "lucide-react";
import { ROLE_NAV_CONFIG } from "../enum/nav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks/useAuthProvider";
import { useEffect, useState } from "react";

interface AppSidebarProps {
  role: "ADMIN" | "TEACHER" | "STUDENT";
  onClose?: () => void;
}

export function AppSidebar({ role, onClose }: AppSidebarProps) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const { setTheme, theme } = useTheme();
  const { user, logout } = useAuth();

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const t = useTranslations("nav");
  const tSidebar = useTranslations("sidebar");

  const navGroups = ROLE_NAV_CONFIG[role] || [];

  const toggleLocale = () => {
    const nextLocale = locale === "vi" ? "en" : "vi";
    router.replace(pathname, { locale: nextLocale });
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border/5 transition-colors duration-300 overflow-hidden font-sans">
      {/* Branding */}
      <div className="h-20 flex items-center px-4 shrink-0 border-b border-sidebar-border/30 bg-sidebar/50">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 w-full p-2 rounded-2xl hover:bg-sidebar-accent/50 transition-all duration-300 group"
          onClick={onClose}>
          {/* Icon Container - Tăng độ nổi với shadow */}
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-md shadow-primary/20 group-hover:scale-105 transition-transform duration-300">
            <BookOpen size={20} className="text-primary-foreground" strokeWidth={2.5} />
          </div>

          {/* Text Label */}
          <div className="flex flex-col text-left">
            <span className="font-black text-[15px] leading-none tracking-tight text-foreground">SPACKIE</span>
            <span className="text-[9px] font-bold text-primary uppercase tracking-[0.2em] mt-1.5 opacity-90 px-1.5 py-0.5 bg-primary/10 rounded-md w-fit">
              {role === "ADMIN" ? "Admin" : role === "TEACHER" ? "Teacher" : "Student"}
            </span>
          </div>
        </Link>
      </div>

      {/* Nav Content */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <nav className="p-4 space-y-8">
            {navGroups.map((group, index) => (
              <div key={index} className="space-y-3">
                <h4 className="px-4 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                  {t(group.labelKey as Parameters<typeof t>[0])}
                </h4>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                      <Link key={item.href} href={item.href} onClick={onClose}>
                        <span
                          className={cn(
                            "group flex items-center gap-3 px-4 py-2.5 rounded-xl text-[14px] transition-all duration-200",
                            isActive
                              ? "bg-primary text-primary-foreground font-bold shadow-sm"
                              : "text-sidebar-foreground font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          )}>
                          <item.icon
                            className={cn(
                              "h-5 w-5 shrink-0 transition-colors",
                              isActive
                                ? "text-primary-foreground drop-shadow-[0_0_3px_rgba(255,255,255,0.3)]" // Thêm chút bóng mờ để icon nổi bật
                                : "text-foreground group-hover:text-primary",
                            )}
                            strokeWidth={isActive ? 2.5 : 2}
                          />
                          {t(item.titleKey as Parameters<typeof t>[0])}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </ScrollArea>
      </div>

      {/* Footer */}
      <div className="p-4 shrink-0 border-t border-sidebar-border/30 space-y-4">
        {/* Profile Card - Nâng cấp độ tương phản */}
        <div className="flex items-center justify-between gap-2 px-3 py-3 rounded-2xl border border-sidebar-border group hover:border-primary/30 transition-all">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-9 w-9 border-2 border-background ring-1 ring-primary/20">
              <AvatarImage src={user?.avatar || ""} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-[10px]">
                {getInitials(user?.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0">
              <span className="text-[13px] font-bold truncate text-foreground leading-tight">
                {user?.name || tSidebar("user_fallback")}
              </span>
              <span className="text-[11px] text-muted-foreground truncate font-medium">{user?.email}</span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
            <LogOut className="h-4 w-4" strokeWidth={2.5} />
          </Button>
        </div>

        {/* Theme & Locale Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 h-9 rounded-xl font-bold text-[11px] tracking-wide border-sidebar-border bg-sidebar hover:bg-primary/5 hover:border-primary/30 text-foreground transition-all"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {/* SỬA TẠI ĐÂY: Kiểm tra mounted để tránh Hydration Error */}
            {!mounted ? (
              <div className="w-4 h-4 mr-2 animate-pulse bg-muted rounded-full" />
            ) : theme === "dark" ? (
              <>
                <Sun className="h-4 w-4 mr-2 text-primary" strokeWidth={2.5} />
                <span>{tSidebar("light").toUpperCase()}</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 mr-2 text-primary" strokeWidth={2.5} />
                <span>{tSidebar("dark").toUpperCase()}</span>
              </>
            )}
          </Button>

          <Button
            variant="outline"
            className="w-18 h-9 rounded-xl font-bold text-[11px] border-sidebar-border bg-sidebar hover:bg-primary/5 hover:border-primary/30 text-foreground transition-all"
            onClick={toggleLocale}>
            <Languages className="h-3.5 w-3.5 mr-2 text-primary" strokeWidth={2.5} />
            {locale.toUpperCase()}
          </Button>
        </div>
      </div>
    </div>
  );
}
