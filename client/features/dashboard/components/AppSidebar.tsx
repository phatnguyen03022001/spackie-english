"use client";

import { usePathname, useRouter } from "@/lib/i18n/routing";
import { Link } from "@/lib/i18n/routing";
import { useTheme } from "next-themes";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LogOut, Moon, Sun, BookOpen, Languages, ChevronLeft, Loader2 } from "lucide-react";
import { ROLE_NAV_CONFIG, NavItem } from "../enum/nav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/hooks/useAuthProvider";
import { useState, useEffect } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface AppSidebarProps {
  role: "ADMIN" | "TEACHER" | "STUDENT";
  collapsed?: boolean;
  onToggleCollapse?: () => void; // Chỉ có trên desktop, mobile không truyền → không hiển thị nút toggle
  onClose?: () => void; // Dùng cho mobile sheet
}

export function AppSidebar({ role, collapsed = false, onToggleCollapse, onClose }: AppSidebarProps) {
  const [mounted, setMounted] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const { setTheme, theme } = useTheme();
  const { user, logout } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

  const t = useTranslations("nav");
  const tSidebar = useTranslations("sidebar");

  const navGroups = ROLE_NAV_CONFIG[role] || [];
  const allItems = navGroups.flatMap((g) => g.items);

  const isActiveRoute = (item: NavItem): boolean => {
    if (pathname === item.href) return true;
    if (pathname.startsWith(item.href + "/")) {
      const hasLongerMatch = allItems.some(
        (other) => other.href !== item.href && other.href.length > item.href.length && pathname.startsWith(other.href),
      );
      return !hasLongerMatch;
    }
    return false;
  };

  const toggleLocale = () => {
    const nextLocale = locale === "vi" ? "en" : "vi";
    router.replace(pathname, { locale: nextLocale });
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border/5 transition-all duration-300 ease-out overflow-hidden font-sans",
        collapsed ? "w-20" : "w-72",
      )}>
      {/* Branding + nút toggle (chỉ hiển thị khi có onToggleCollapse - desktop) */}
      <div className="h-20 flex items-center px-4 shrink-0 border-b border-sidebar-border/30 bg-sidebar/50 relative">
        {!collapsed ? (
          <Link
            href="/dashboard"
            className="flex items-center gap-3 w-full p-2 rounded-2xl hover:bg-sidebar-accent/50 transition-all duration-300 group"
            onClick={onClose}>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-md shadow-primary/20 group-hover:scale-105 transition-transform duration-300">
              <BookOpen size={20} className="text-primary-foreground" strokeWidth={2.5} />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-black text-[15px] leading-none tracking-tight text-foreground">SPACKIE</span>
              <span className="text-[9px] font-bold text-primary uppercase tracking-[0.2em] mt-1.5 opacity-90 px-1.5 py-0.5 bg-primary/10 rounded-md w-fit">
                {role === "ADMIN" ? "Admin" : role === "TEACHER" ? "Teacher" : "Student"}
              </span>
            </div>
          </Link>
        ) : (
          <div className="flex justify-center w-full">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-md shadow-primary/20">
              <BookOpen size={20} className="text-primary-foreground" strokeWidth={2.5} />
            </div>
          </div>
        )}

        {/* Nút toggle thu gọn - CHỈ hiển thị khi được truyền từ desktop (không có trên mobile) */}
        {onToggleCollapse && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className={cn(
              "absolute -right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full border bg-sidebar text-sidebar-foreground shadow-md z-10",
              collapsed && "rotate-180",
            )}>
            <ChevronLeft className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <nav className={cn("p-4 space-y-8", collapsed && "px-2")}>
            {navGroups.map((group, idx) => (
              <div key={idx} className="space-y-3">
                {!collapsed && (
                  <h4 className="px-4 text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                    {t(group.labelKey as Parameters<typeof t>[0])}
                  </h4>
                )}
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = isActiveRoute(item);
                    const linkContent = (
                      <span
                        className={cn(
                          "group flex items-center gap-3 px-4 py-2.5 rounded-xl text-[14px] transition-all duration-200",
                          collapsed ? "justify-center px-2" : "justify-start",
                          isActive
                            ? "bg-primary text-primary-foreground font-bold shadow-sm"
                            : "text-sidebar-foreground font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        )}>
                        <item.icon
                          className={cn(
                            "h-5 w-5 shrink-0 transition-colors",
                            isActive && "text-primary-foreground drop-shadow-[0_0_3px_rgba(255,255,255,0.3)]",
                          )}
                          strokeWidth={isActive ? 2.5 : 2}
                        />
                        {!collapsed && <span>{t(item.titleKey as Parameters<typeof t>[0])}</span>}
                      </span>
                    );

                    if (collapsed) {
                      return (
                        <Tooltip key={item.href} delayDuration={300}>
                          <TooltipTrigger asChild>
                            <Link href={item.href} onClick={onClose}>
                              {linkContent}
                            </Link>
                          </TooltipTrigger>
                          <TooltipContent side="right">{t(item.titleKey as Parameters<typeof t>[0])}</TooltipContent>
                        </Tooltip>
                      );
                    }

                    return (
                      <Link key={item.href} href={item.href} onClick={onClose}>
                        {linkContent}
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
      <div className={cn("p-4 shrink-0 border-t border-sidebar-border/30 space-y-4", collapsed && "px-2")}>
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-3 rounded-2xl border border-sidebar-border group hover:border-primary/30 transition-all",
            collapsed ? "justify-center" : "justify-between",
          )}>
          <div className={cn("flex items-center gap-3 min-w-0", collapsed && "justify-center")}>
            <Avatar className="h-9 w-9 border-2 border-background ring-1 ring-primary/20">
              <AvatarImage src={user?.avatar || ""} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-[10px]">
                {getInitials(user?.name)}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-[13px] font-bold truncate text-foreground leading-tight">
                  {user?.name || tSidebar("user_fallback")}
                </span>
                <span className="text-[11px] text-muted-foreground truncate font-medium">{user?.email}</span>
              </div>
            )}
          </div>
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
              {isLoggingOut ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" strokeWidth={2.5} />
              )}
            </Button>
          )}
        </div>

        <div className={cn("flex gap-2", collapsed && "flex-col")}>
          <Button
            variant="outline"
            className={cn(
              "h-9 rounded-xl font-bold text-[11px] tracking-wide border-sidebar-border bg-sidebar hover:bg-primary/5 hover:border-primary/30 text-foreground transition-all",
              collapsed ? "w-full px-2 justify-center" : "flex-1",
            )}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {!mounted ? (
              <div className="w-4 h-4 animate-pulse bg-muted rounded-full" />
            ) : theme === "dark" ? (
              <>
                <Sun className="h-4 w-4 mr-2 text-primary" strokeWidth={2.5} />
                {!collapsed && <span>{tSidebar("light").toUpperCase()}</span>}
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 mr-2 text-primary" strokeWidth={2.5} />
                {!collapsed && <span>{tSidebar("dark").toUpperCase()}</span>}
              </>
            )}
          </Button>

          <Button
            variant="outline"
            className={cn(
              "h-9 rounded-xl font-bold text-[11px] border-sidebar-border bg-sidebar hover:bg-primary/5 hover:border-primary/30 text-foreground transition-all",
              collapsed ? "w-full px-2 justify-center" : "w-18",
            )}
            onClick={toggleLocale}>
            <Languages className="h-3.5 w-3.5 mr-2 text-primary" strokeWidth={2.5} />
            {!collapsed && locale.toUpperCase()}
          </Button>
        </div>
      </div>
    </div>
  );
}
