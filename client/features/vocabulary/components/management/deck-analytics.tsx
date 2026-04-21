"use client";

import React from "react";
import { DeckAnalyticsCard } from "./deck-analytics-card";

interface DeckAnalyticsProps {
  deckId: string;
}

export const DeckAnalytics = ({ deckId }: DeckAnalyticsProps) => {
  return (
    <div className="space-y-6">
      <DeckAnalyticsCard deckId={deckId} />

      {/* Additional analytics sections can be added here */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6 rounded-3xl border-primary/5">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary"></span>
            Phân tích học tập
          </h3>
          <p className="text-sm text-muted-foreground">
            Dữ liệu phân tích chi tiết về hiệu suất học tập sẽ được hiển thị tại đây. Bao gồm thời gian học trung bình,
            tỷ lệ thành công, và các chỉ số khác.
          </p>
        </div>

        <div className="glass-panel p-6 rounded-3xl border-primary/5">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent"></span>
            Dự báo ôn tập
          </h3>
          <p className="text-sm text-muted-foreground">
            Hệ thống sẽ dự đoán lịch trình ôn tập tối ưu dựa trên thuật toán SRS để đảm bảo khả năng ghi nhớ dài hạn.
          </p>
        </div>
      </div>
    </div>
  );
};
