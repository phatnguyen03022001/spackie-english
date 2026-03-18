"use client";

import { useAuth } from "@/features/auth/hooks/useAuthContext";
import { useRouter } from "@/lib/i18n/routing";
import { useEffect } from "react";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const isAuthorized = user?.role === "TEACHER" || user?.role === "ADMIN";
    if (!isLoading && !isAuthorized) {
      router.push("/student");
    }
  }, [user, isLoading, router]);

  if (isLoading || (user?.role !== "TEACHER" && user?.role !== "ADMIN")) return null;

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900 border p-4 rounded-lg">
        <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
          Chế độ Giáo viên: Bạn có quyền quản lý nội dung và chấm điểm.
        </p>
      </div>
      {children}
    </div>
  );
}
