"use client";

import React from "react";
import { BarChart3, TrendingUp, Target, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useDeckAnalytics } from "../../api/use-management";

interface DeckAnalyticsCardProps {
  deckId: string;
  className?: string;
}

export const DeckAnalyticsCard = ({ deckId, className = "" }: DeckAnalyticsCardProps) => {
  const { data: analytics, isLoading, error } = useDeckAnalytics(deckId);

  if (isLoading) {
    return (
      <Card className={`${className}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Phân tích bộ thẻ
            </CardTitle>
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
          <CardDescription>Đang tải dữ liệu phân tích...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <div className="h-4 bg-muted/20 rounded w-1/3"></div>
                  <div className="h-4 bg-muted/20 rounded w-1/6"></div>
                </div>
                <div className="h-2 bg-muted/20 rounded-full"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !analytics) {
    return (
      <Card className={`${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Phân tích bộ thẻ
          </CardTitle>
          <CardDescription>Không thể tải dữ liệu phân tích</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive/50 mb-3" />
            <p className="text-sm font-medium text-destructive">Đã xảy ra lỗi khi tải dữ liệu</p>
            <p className="text-xs text-muted-foreground mt-1">Vui lòng thử lại sau</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const progressPercentage = Math.round(analytics.progress * 100);
  const masteredPercentage =
    analytics.totalCards > 0 ? Math.round((analytics.masteredCards / analytics.totalCards) * 100) : 0;

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Phân tích bộ thẻ
        </CardTitle>
        <CardDescription>Thống kê chi tiết về tiến độ học tập</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tổng số thẻ */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary"></div>
              <span className="text-sm font-medium">Tổng số thẻ</span>
            </div>
            <Badge variant="outline" className="font-bold">
              {analytics.totalCards}
            </Badge>
          </div>
          <Progress value={100} className="h-1" />
        </div>

        {/* Thẻ đã thành thạo */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Target className="h-3 w-3 text-emerald-500" />
              <span className="text-sm font-medium">Thẻ thành thạo</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-bold">
                {analytics.masteredCards}
              </Badge>
              <span className="text-xs text-muted-foreground">({masteredPercentage}%)</span>
            </div>
          </div>
          <Progress value={masteredPercentage} className="h-1" />
        </div>

        {/* Tiến độ tổng thể */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3 w-3 text-blue-500" />
              <span className="text-sm font-medium">Tiến độ tổng thể</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="font-bold">
                {progressPercentage}%
              </Badge>
            </div>
          </div>
          <Progress value={progressPercentage} className="h-1" />
        </div>

        {/* Thông tin thêm */}
        <div className="pt-4 border-t">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{analytics.totalCards}</div>
              <div className="text-xs text-muted-foreground">Tổng thẻ</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-500">{analytics.masteredCards}</div>
              <div className="text-xs text-muted-foreground">Đã thành thạo</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
