"use client";

import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface ForecastProps {
  forecast: Record<string, number>;
}

export function ReviewForecast({ forecast }: ForecastProps) {
  // 1. Chuẩn hóa dữ liệu: Lấy 7 ngày tới và định dạng label
  const data = Object.entries(forecast)
    .map(([date, count]) => ({
      rawDate: new Date(date),
      label: new Date(date).toLocaleDateString("vi-VN", {
        weekday: "short",
        day: "numeric",
      }),
      count,
    }))
    .sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime())
    .slice(0, 7);

  const hasData = data.length > 0;

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header nội bộ của component */}
      <div className="space-y-1">
        <h3 className="text-sm font-black tracking-tight text-foreground uppercase">
          Lộ trình <span className="text-primary">7 ngày tới</span>
        </h3>
        <p className="text-[11px] font-bold text-muted-foreground/40 leading-tight">
          Số lượng thẻ dự kiến sẽ đến hạn ôn tập dựa trên thuật toán Spaced Repetition.
        </p>
      </div>

      <div className="flex-1 min-h-55 w-full mt-2">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 0, left: -25, bottom: 0 }} barGap={8}>
              {/* Chỉ giữ lại đường lưới ngang mờ ảo */}
              <CartesianGrid vertical={false} strokeDasharray="8 8" stroke="currentColor" className="text-border/5" />

              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{
                  fontSize: 10,
                  fontWeight: 800,
                  fill: "currentColor",
                  className: "text-muted-foreground/40 uppercase tracking-tighter",
                }}
                dy={10}
              />

              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{
                  fontSize: 10,
                  fontWeight: 800,
                  fill: "currentColor",
                  className: "text-muted-foreground/30",
                }}
              />

              <Tooltip
                cursor={{ fill: "rgba(var(--primary), 0.03)", radius: 12 }}
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.8)",
                  backdropFilter: "blur(12px)",
                  borderRadius: "16px",
                  border: "1px solid rgba(var(--primary), 0.1)",
                  boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
                  padding: "12px",
                }}
                itemStyle={{
                  fontSize: "12px",
                  fontWeight: "900",
                  color: "var(--primary)",
                  textTransform: "uppercase",
                }}
                labelStyle={{
                  fontSize: "10px",
                  fontWeight: "700",
                  color: "rgba(0,0,0,0.4)",
                  marginBottom: "4px",
                }}
              />

              <Bar
                dataKey="count"
                radius={[10, 10, 10, 10]} // Bo tròn cả 4 góc cho modern look
                barSize={24}
                animationDuration={1500}
                animationEasing="ease-in-out">
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index === 0 ? "var(--primary)" : "rgba(var(--primary), 0.2)"}
                    className="transition-all duration-500 hover:opacity-80"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center border-2 border-dashed border-border/5 rounded-3xl">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-20">Không có dự báo bài học</p>
          </div>
        )}
      </div>

      {/* Footer chú thích nhỏ */}
      {hasData && (
        <div className="flex items-center gap-4 pt-2 border-t border-border/5">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span className="text-[9px] font-black uppercase text-muted-foreground/60 tracking-wider">Hôm nay</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-primary/20" />
            <span className="text-[9px] font-black uppercase text-muted-foreground/60 tracking-wider">Sắp tới</span>
          </div>
        </div>
      )}
    </div>
  );
}
