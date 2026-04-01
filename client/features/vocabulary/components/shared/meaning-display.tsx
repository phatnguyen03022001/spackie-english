"use client";

import React from "react";
import { Meaning } from "../../types";
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";

interface MeaningDisplayProps {
  meanings: Meaning[];
  showExamples?: boolean;
  className?: string;
}

export const MeaningDisplay = ({ meanings, showExamples = true, className }: MeaningDisplayProps) => {
  // 1. Xử lý khi meanings rỗng hoặc không tồn tại
  if (!meanings || meanings.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center p-8 text-center border-2 border-dashed rounded-lg opacity-60",
          className,
        )}>
        <Info className="w-8 h-8 mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Không tìm thấy định nghĩa nào.</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {meanings.map((meaning, idx) => {
        // Tạo key duy nhất cho mỗi khối partOfSpeech
        const meaningKey = `${meaning.partOfSpeech}-${idx}`;

        return (
          <div key={meaningKey} className="border-l-2 border-primary/20 pl-4 transition-all hover:border-primary/50">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary bg-primary/5 px-2 py-0.5 rounded">
              {meaning.partOfSpeech}
            </span>

            <ul className="mt-3 space-y-4">
              {meaning.definitions.map((def, dIdx) => {
                // 2. Tạo key kết hợp giữa partOfSpeech và index/nội dung để đảm bảo tính duy nhất
                const defKey = `${meaning.partOfSpeech}-def-${dIdx}`;

                return (
                  <li key={defKey} className="text-sm text-foreground/90">
                    <div className="flex gap-2">
                      {meaning.definitions.length > 1 && (
                        <span className="font-bold text-primary/60 shrink-0">{dIdx + 1}.</span>
                      )}
                      <p className="font-medium leading-relaxed">{def.definition}</p>
                    </div>

                    {showExamples && def.example && (
                      <div className="mt-2 text-sm text-muted-foreground italic bg-muted/30 border-l-4 border-muted px-3 py-2 rounded-r-md">
                        &quot;{def.example}&quot;
                      </div>
                    )}

                    {(def.synonyms.length > 0 || def.antonyms.length > 0) && (
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px]">
                        {def.synonyms.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-blue-600/80 uppercase tracking-tighter">Syn:</span>
                            <div className="flex flex-wrap gap-1">
                              {def.synonyms.map((syn, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">
                                  {syn}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {def.antonyms.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-red-600/80 uppercase tracking-tighter">Ant:</span>
                            <div className="flex flex-wrap gap-1">
                              {def.antonyms.map((ant, aIdx) => (
                                <span
                                  key={aIdx}
                                  className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded border border-red-100">
                                  {ant}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
};
