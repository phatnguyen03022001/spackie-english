"use client";

import React from "react";
import { ChevronRight, Home, Menu } from "lucide-react";
import { Link } from "@/lib/i18n/routing";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AppSidebar } from "./AppSidebar";

interface AppHeaderProps {
  pathSegments: string[];
  role: "ADMIN" | "TEACHER" | "STUDENT";
}

export const AppHeader = ({ pathSegments, role }: AppHeaderProps) => {
  const rolePath = role.toLowerCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center px-4 lg:px-8 bg-transparent transition-all">
      <nav className="flex items-center gap-2 text-sm font-medium" aria-label="Breadcrumb">
        <div className="lg:hidden mr-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-primary/5">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 border-none">
              <AppSidebar role={role} />
            </SheetContent>
          </Sheet>
        </div>

        <Link
          href={`/${rolePath}/vocabulary`}
          className="hidden sm:flex items-center text-muted-foreground hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-primary/5">
          <Home className="h-4 w-4" />
        </Link>

        {pathSegments.length === 0 ? (
          <span className="hidden sm:block text-sm font-semibold text-foreground ml-2">Dashboard</span>
        ) : (
          pathSegments.map((segment, index) => {
            const isLast = index === pathSegments.length - 1;
            const subPath = pathSegments.slice(0, index + 1).join("/");
            const fullHref = `/${rolePath}/${subPath}`;

            return (
              <React.Fragment key={segment}>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 hidden sm:block" />
                {isLast ? (
                  <span className="capitalize font-black text-foreground tracking-tight px-1 truncate max-w-[180px] sm:max-w-none">
                    {segment.replace(/-/g, " ")}
                  </span>
                ) : (
                  <Link
                    href={fullHref}
                    className="hidden sm:block capitalize font-bold text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded-lg hover:bg-primary/5">
                    {segment.replace(/-/g, " ")}
                  </Link>
                )}
              </React.Fragment>
            );
          })
        )}
      </nav>
    </header>
  );
};
