"use client";

import React from "react";
import { Users, BookOpen, GraduationCap, TrendingUp, Loader2, AlertCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress"; // Giả sử bạn dùng shadcn progress
import { useDeckAnalytics } from "../../api/use-management";

interface DeckAnalyticsProps {
  deckId: string;
}

export const DeckAnalytics = ({ deckId }: DeckAnalyticsProps) => {
  // Sửa lỗi gọi hook: useDeckAnalytics bản thân nó đã là 1 hook
  // const { useDeckAnalytics } = useManagement();
  const { data: analytics, isLoading, isError } = useDeckAnalytics(deckId);

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border bg-card/50">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-medium">Đang tính toán số liệu...</p>
        </div>
      </div>
    );
  }

  if (isError || !analytics) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-destructive">
        <AlertCircle size={20} />
        <span className="text-sm font-medium">Không thể tải dữ liệu phân tích bộ thẻ.</span>
      </div>
    );
  }

  // Tính toán tỷ lệ phần trăm nếu backend chưa trả về field progress
  const progressValue =
    analytics.totalCards > 0 ? Math.round((analytics.masteredCards / analytics.totalCards) * 100) : 0;

  const stats = [
    {
      label: "Tổng số thẻ",
      value: analytics.totalCards,
      icon: BookOpen,
      color: "text-blue-500",
      description: "Thẻ trong bộ",
    },
    {
      label: "Đã thành thạo",
      value: analytics.masteredCards,
      icon: GraduationCap,
      color: "text-green-500",
      description: "Mastered status",
    },
    {
      label: "Người đang học",
      value: analytics.masteredCards,
      icon: Users,
      color: "text-orange-500",
      description: "Học viên đang enroll",
    },
    {
      label: "Độ hoàn thiện",
      value: `${progressValue}%`,
      icon: TrendingUp,
      color: "text-purple-500",
      description: "Tỷ lệ trung bình",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="overflow-hidden border-none shadow-md ring-1 ring-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <div className={`rounded-full p-2 bg-opacity-10 ${stat.color.replace("text", "bg")}`}>
                  <Icon className={stat.color} size={16} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="mt-1 text-xs text-muted-foreground italic">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Hiển thị thêm Progress trực quan */}
      <Card className="border-none shadow-sm ring-1 ring-border">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Tiến độ học tập tổng thể</span>
            <span className="text-sm font-bold text-primary">{progressValue}%</span>
          </div>
          <Progress value={progressValue} className="h-2" />
        </CardContent>
      </Card>
    </div>
  );
};
