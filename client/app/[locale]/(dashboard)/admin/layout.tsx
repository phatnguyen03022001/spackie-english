"use client";

import { useAuth } from "@/features/auth/hooks/useAuthContext";
import { useRouter } from "@/lib/i18n/routing";
import { useEffect } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user?.role !== "ADMIN") {
      router.push("/student"); // Hoặc trang bạn muốn đá user ra
    }
  }, [user, isLoading, router]);

  if (isLoading || user?.role !== "ADMIN") return null;

  return (
    <div className="flex flex-col gap-4 border-l-4 border-red-500 pl-4">
      <div className="text-xs font-bold text-red-500 uppercase tracking-widest">Admin Control Panel</div>
      {children}
    </div>
  );
}
