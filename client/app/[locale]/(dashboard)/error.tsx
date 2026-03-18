"use client"; // Dòng này là bắt buộc và phải ở trên cùng

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Log lỗi để bạn kiểm tra trong terminal hoặc browser console
    console.error("Crash error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <h2 className="text-2xl font-bold mb-4">Đã có lỗi xảy ra!</h2>
      <Button onClick={() => reset()} variant="default">
        Thử lại
      </Button>
    </div>
  );
}
