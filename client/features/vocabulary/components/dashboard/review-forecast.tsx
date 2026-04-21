"use client";

import React, { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface ForecastProps {
  forecast: Record<string, number>;
}

export function ReviewForecast({ forecast }: ForecastProps) {
  const data = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      // Tạo YYYY-MM-DD chuẩn không phụ thuộc timezone
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      days.push({
        rawDate: date,
        label: date.toLocaleDateString("vi-VN", { weekday: "short", day: "numeric" }),
        count: forecast[dateStr] || 0,
      });
    }
    return days;
  }, [forecast]);
  const hasData = data.some((day) => day.count > 0);

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="space-y-1.5">
        <h3 className="text-sm font-bold tracking-tight text-foreground uppercase">
          Lộ trình <span className="text-primary">7 ngày tới</span>
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Số lượng thẻ dự kiến sẽ đến hạn ôn tập dựa trên thuật toán Spaced Repetition.
        </p>
      </div>

      <div className="flex-1 min-h-[220px] w-full mt-2">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
              <CartesianGrid
                vertical={false}
                strokeDasharray="4 4"
                stroke="hsl(var(--border))"
                className="opacity-50"
              />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fontWeight: 600, fill: "hsl(var(--muted-foreground))" }}
                dy={10}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fontWeight: 600, fill: "hsl(var(--muted-foreground))", opacity: 0.7 }}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--primary))", opacity: 0.05 }}
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  borderRadius: "var(--radius)",
                  border: "1px solid hsl(var(--border))",
                  boxShadow: "var(--shadow-md)",
                  padding: "8px 12px",
                }}
                itemStyle={{ fontSize: "12px", fontWeight: "700", color: "hsl(var(--primary))" }}
                labelStyle={{
                  fontSize: "10px",
                  fontWeight: "500",
                  color: "hsl(var(--muted-foreground))",
                  marginBottom: "2px",
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={28} animationDuration={1000}>
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index === 0 ? "hsl(var(--primary))" : "hsla(var(--primary), 0.3)"}
                    className="transition-colors duration-300 hover:opacity-80"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center border-2 border-dashed border-border rounded-xl bg-muted/5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
              Không có thẻ cần ôn trong 7 ngày tới
            </p>
          </div>
        )}
      </div>

      {hasData && (
        <div className="flex items-center gap-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-sm bg-primary" />
            <span className="text-[10px] font-bold uppercase text-foreground/70 tracking-tight">Hôm nay</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-sm bg-primary/30" />
            <span className="text-[10px] font-bold uppercase text-foreground/70 tracking-tight">Sắp tới</span>
          </div>
        </div>
      )}
    </div>
  );
}
