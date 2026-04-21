"use client";

import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { AlertCircle, BookOpen, TrendingUp, Brain, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { UserStatsResponse } from "../../schemas";

// Màu sắc sử dụng token CSS để hỗ trợ dark mode
const COLORS = [
  "hsl(215, 14%, 34%)", // fallback nếu biến CSS lỗi
  "hsl(var(--accent))",
  "hsl(var(--primary))",
];
interface StatsOverviewProps {
  stats: UserStatsResponse | null;
  isLoading?: boolean;
  error?: Error | null;
}

export function StatsOverview({ stats, isLoading = false, error = null }: StatsOverviewProps) {
  // Skeleton loading (tuân thủ design.md)
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-6 space-y-3">
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-8 w-32 bg-muted rounded animate-pulse" />
              <div className="h-3 w-full bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Lỗi hoặc không có dữ liệu
  if (error || !stats) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="p-8 flex flex-col items-center justify-center text-center">
          <AlertCircle className="h-10 w-10 text-destructive mb-3" />
          <h4 className="text-sm font-bold text-destructive uppercase tracking-wider">Lỗi tải dữ liệu</h4>
          <p className="text-xs text-muted-foreground mt-1">Không thể kết nối với máy chủ thống kê.</p>
        </CardContent>
      </Card>
    );
  }

  // Xử lý dữ liệu an toàn (đề phòng learnedWords > totalWords)
  const safeTotal = Math.max(0, stats.totalWords);
  const safeLearned = Math.min(stats.learnedWords, safeTotal);
  const safeMastered = Math.min(stats.masteredWords, safeLearned);

  const newWords = safeTotal - safeLearned;
  const learningWords = safeLearned - safeMastered;
  const masteredWords = safeMastered;

  const masteryRate = safeTotal > 0 ? Math.round((masteredWords / safeTotal) * 100) : 0;
  const learnedRate = safeTotal > 0 ? Math.round((safeLearned / safeTotal) * 100) : 0;

  const chartData = [
    { name: "Mới", value: newWords, color: COLORS[0] },
    { name: "Đang học", value: learningWords, color: COLORS[1] },
    { name: "Thành thạo", value: masteredWords, color: COLORS[2] },
  ].filter((item) => item.value > 0); // Chỉ hiển thị phần tử có giá trị >0

  const hasData = safeTotal > 0;
  const lastStudyDate = stats.lastStudyDate ? new Date(stats.lastStudyDate).toLocaleDateString("vi-VN") : "Chưa học";

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Card 1: Tổng số từ */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Tổng từ vựng
          </CardTitle>
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{safeTotal}</div>
          <p className="text-xs text-muted-foreground mt-1">từ trong kho</p>
        </CardContent>
      </Card>

      {/* Card 2: Tỷ lệ thành thạo */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Tỷ lệ thành thạo
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{masteryRate}%</div>
          <div className="mt-2 h-1.5 w-full bg-primary/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
              style={{ width: `${masteryRate}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {masteredWords} / {safeTotal} từ
          </p>
        </CardContent>
      </Card>

      {/* Card 3: Tiến độ học */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Đã học</CardTitle>
          <Brain className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{safeLearned}</div>
          <p className="text-xs text-muted-foreground">từ ({learnedRate}%)</p>
          <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary/60 transition-all duration-500 ease-out rounded-full"
              style={{ width: `${learnedRate}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">{newWords} từ chưa học</p>
        </CardContent>
      </Card>

      {/* Card 4: Hoạt động */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Hoạt động
          </CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalReviews?.toLocaleString() || 0}</div>
          <p className="text-xs text-muted-foreground">tổng lượt ôn</p>
          <p className="text-xs text-muted-foreground mt-2">Gần nhất: {lastStudyDate}</p>
        </CardContent>
      </Card>

      {/* Biểu đồ phân bổ (chiếm toàn bộ chiều rộng) */}
      <div className="md:col-span-2 lg:col-span-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Phân bổ trình độ
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasData && chartData.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none">
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        borderRadius: "var(--radius)",
                        border: "1px solid hsl(var(--border))",
                        fontSize: "12px",
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      align="center"
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => <span className="text-xs font-medium text-foreground">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center text-muted-foreground">
                <p className="text-sm">Chưa có dữ liệu để hiển thị</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
