"use client";

import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";
import Link from "next/link";

export function SessionComplete({ total }: { total: number }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-6 animate-in zoom-in duration-500">
      <div className="bg-green-100 p-6 rounded-full">
        <Trophy className="w-16 h-16 text-green-600" />
      </div>
      <div className="space-y-2">
        <h2 className="text-3xl font-bold">Tuyệt vời!</h2>
        <p className="text-muted-foreground text-lg">
          Bạn đã hoàn thành ôn tập <strong>{total}</strong> thẻ từ vựng.
        </p>
      </div>
      <div className="flex gap-4">
        <Button asChild variant="outline">
          <Link href="/dashboard">Về Dashboard</Link>
        </Button>
        <Button asChild>
          <Link href="/decks">Học bộ thẻ khác</Link>
        </Button>
      </div>
    </div>
  );
}
