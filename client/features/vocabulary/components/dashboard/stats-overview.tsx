"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { CardStatus } from "../../types";

interface StatsOverviewProps {
  stats: {
    totalCards: number;
    statusStats: Record<CardStatus, number>;
    masteryRate: number;
  };
}

const COLORS = {
  [CardStatus.NEW]: "#94a3b8", // Slate
  [CardStatus.LEARNING]: "#38bdf8", // Sky
  [CardStatus.REVIEW]: "#22c55e", // Green
  [CardStatus.LAPSED]: "#ef4444", // Red
};

export function StatsOverview({ stats }: StatsOverviewProps) {
  const chartData = Object.entries(stats.statusStats).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tổng số thẻ</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalCards}</div>
          <p className="text-xs text-muted-foreground">Thẻ trong kho cá nhân</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tỷ lệ thành thạo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats.masteryRate}%</div>
          <p className="text-xs text-muted-foreground">Dựa trên số thẻ trạng thái REVIEW</p>
        </CardContent>
      </Card>

      <Card className="col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Phân bổ trạng thái</CardTitle>
        </CardHeader>
        <CardContent className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={chartData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                {chartData.map((entry) => (
                  <Cell key={`cell-${entry.name}`} fill={COLORS[entry.name as CardStatus]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
