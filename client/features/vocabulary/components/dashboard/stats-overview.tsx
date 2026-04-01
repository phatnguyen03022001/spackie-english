"use client";

import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { UserStatsResponse } from "../../schemas";

const COLORS = ["#94a3b8", "#38bdf8", "#22c55e"]; // Mới (Slate), Đang học (Sky), Thành thạo (Green)

export function StatsOverview({ stats }: { stats: UserStatsResponse }) {
  if (!stats) return null;

  const masteryRate = stats.totalWords > 0 ? Math.round((stats.masteredWords / stats.totalWords) * 100) : 0;

  const chartData = [
    { name: "Mới", value: Math.max(0, stats.totalWords - stats.learnedWords) },
    { name: "Đang học", value: Math.max(0, stats.learnedWords - stats.masteredWords) },
    { name: "Thành thạo", value: stats.masteredWords },
  ];

  const hasData = stats.totalWords > 0;

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {/* --- Card: Tổng từ vựng --- */}
      <div className="glass-panel p-6! rounded-3xl! border-primary/5 shadow-xl shadow-primary/5 flex flex-col justify-between min-h-40">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Tổng quy mô</p>
          <h3 className="text-4xl font-black tracking-tighter tabular-nums">{stats.totalWords.toLocaleString()}</h3>
        </div>
        <p className="text-[11px] font-bold text-muted-foreground/40 leading-tight">
          Từ vựng hiện có trong kho cá nhân của bạn
        </p>
      </div>

      {/* --- Card: Tỷ lệ thuộc bài --- */}
      <div className="glass-panel p-6! rounded-3xl! border-primary/5 shadow-xl shadow-primary/5 flex flex-col justify-between min-h-40">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Tỷ lệ thuộc bài</p>
          <h3 className="text-4xl font-black tracking-tighter tabular-nums text-emerald-500">{masteryRate}%</h3>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="h-1.5 w-full bg-emerald-500/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-1000 ease-out"
              style={{ width: `${masteryRate}%` }}
            />
          </div>
          <p className="text-[11px] font-bold text-muted-foreground/40">Tiến độ ghi nhớ dựa trên thuật toán SRS</p>
        </div>
      </div>

      {/* --- Card: Biểu đồ trạng thái (Col-span-2) --- */}
      <div className="md:col-span-2 glass-panel p-6! rounded-3xl! border-primary/5 shadow-xl shadow-primary/5 flex flex-col min-h-40">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
            Phân tích trạng thái
          </p>
          {hasData && (
            <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-primary/10 text-primary uppercase tracking-tighter">
              {stats.learnedWords} đã học
            </span>
          )}
        </div>

        <div className="flex-1 h-25">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  innerRadius={32}
                  outerRadius={45}
                  paddingAngle={10}
                  dataKey="value"
                  stroke="none"
                  animationDuration={1500}>
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.8)",
                    backdropFilter: "blur(8px)",
                    borderRadius: "16px",
                    border: "1px solid rgba(var(--primary), 0.1)",
                    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                    fontSize: "12px",
                    fontWeight: "800",
                  }}
                />
                <Legend
                  verticalAlign="middle"
                  align="right"
                  layout="vertical"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{
                    fontSize: "10px",
                    fontWeight: "900",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    paddingLeft: "20px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-20">Chưa có dữ liệu phân tích</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
