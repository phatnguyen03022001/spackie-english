"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface ForecastProps {
  forecast: Record<string, number>; // Dữ liệu dạng { "2026-03-21": 5, "2026-03-22": 12 }
}

export function ReviewForecast({ forecast }: ForecastProps) {
  // Chuyển đổi object sang mảng cho Recharts
  const data = Object.entries(forecast)
    .map(([date, count]) => ({
      date: new Date(date).toLocaleDateString("vi-VN", { weekday: "short", day: "numeric" }),
      count,
    }))
    .slice(0, 7); // Chỉ lấy 7 ngày tới

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dự báo lượng bài học (7 ngày tới)</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" />
            <YAxis allowDecimals={false} />
            <Tooltip
              cursor={{ fill: "transparent" }}
              contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
            />
            <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Số thẻ đến hạn" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
