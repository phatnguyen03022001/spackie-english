"use client";

import React from "react";
import Image from "next/image";
import { Layers, Calendar, Globe, Lock, ArrowRight, Hourglass, SearchX } from "lucide-react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Deck } from "../../schemas";
import { Button } from "../../../../components/ui/button";

interface DeckDiscoveryProps {
  decks: Deck[];
  isLoading?: boolean;
  isFetching?: boolean;
}

export const DeckDiscovery = ({ decks, isLoading, isFetching }: DeckDiscoveryProps) => {
  const params = useParams();
  const locale = params?.locale || "vi";
  const role = params?.role || "user";

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-80 rounded-3xl bg-muted/20 animate-pulse border border-border/10" />
        ))}
      </div>
    );
  }

  if (decks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-500">
        <div className="mb-4 rounded-2xl bg-muted/10 p-4">
          <SearchX className="h-8 w-8 text-muted-foreground/20" />
        </div>
        <h3 className="text-xl font-black tracking-tight">Không tìm thấy bộ thẻ</h3>
        <p className="text-muted-foreground text-sm font-medium">Thử thay đổi từ khóa hoặc bộ lọc nhé.</p>
      </div>
    );
  }

  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 transition-all duration-500 ${
        isFetching ? "opacity-40 blur-[1px] pointer-events-none" : "opacity-100"
      }`}>
      {decks.map((deck) => {
        const detailHref = `/${locale}/${role}/vocabulary/decks/${deck.id}`;
        const cardCount = deck._count?.cards ?? 0;
        const isComingSoon = cardCount === 0;
        const formattedDate = new Date(deck.createdAt).toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", {
          month: "short",
          year: "numeric",
        });

        return (
          <div key={deck.id} className="group relative flex flex-col">
            <Card className="relative flex flex-col h-full border-border/40 transition-all duration-300 rounded-3xl overflow-hidden shadow-none bg-card/50 backdrop-blur-md hover:bg-card hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5">
              <CardHeader className="p-5 pb-2">
                <div className="flex justify-between items-center mb-3">
                  <Badge
                    variant="outline"
                    className="rounded-full px-3 py-0 text-[10px] font-black uppercase tracking-wider text-primary border-primary/20 bg-primary/5">
                    {deck.levelTag}
                  </Badge>

                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground/60">
                    {deck.isPublic ? <Globe size={12} /> : <Lock size={12} />}
                    <span className="uppercase tracking-tight">{deck.isPublic ? "Public" : "Private"}</span>
                  </div>
                </div>

                <CardTitle className="text-lg font-black tracking-tight leading-snug transition-colors group-hover:text-primary">
                  {deck.title}
                </CardTitle>
              </CardHeader>

              <CardContent className="px-5 pt-2 grow flex flex-col gap-4">
                <p className="text-xs font-medium text-muted-foreground/80 line-clamp-2 leading-relaxed">
                  {deck.description || "Học từ vựng tối ưu theo phương pháp Spaced Repetition."}
                </p>

                {/* Info Bar */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/20 border border-border/10">
                  <div className="flex items-center gap-2">
                    <Layers size={14} className="text-primary" />
                    <span className="text-xs font-black tabular-nums">
                      {cardCount} <span className="text-[10px] font-medium opacity-50">thẻ</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 opacity-60">
                    <Calendar size={12} />
                    <span className="text-[10px] font-bold">{formattedDate}</span>
                  </div>
                </div>

                {/* Creator */}
                {deck.creator && (
                  <div className="flex items-center gap-2 mt-auto pt-3 border-t border-border/5">
                    <div className="relative h-5 w-5 shrink-0 overflow-hidden rounded-full border border-primary/20 bg-primary/10 flex items-center justify-center">
                      {deck.creator.avatar ? (
                        <Image
                          src={deck.creator.avatar}
                          alt={deck.creator.name || "Avatar"}
                          fill
                          className="object-cover"
                          sizes="20px"
                        />
                      ) : (
                        <span className="text-[8px] font-black text-primary uppercase">
                          {deck.creator.name?.charAt(0) || "U"}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground/70 truncate">
                      {deck.creator.name || "Spackie User"}
                    </span>
                  </div>
                )}
              </CardContent>

              <CardFooter className="p-5 pt-2">
                {isComingSoon ? (
                  <Button
                    disabled
                    className="w-full h-10 rounded-xl font-black text-xs bg-foreground/100 text-background/95 border-none shadow-none cursor-not-allowed">
                    <Hourglass size={14} className="mr-2" /> COMING SOON
                  </Button>
                ) : (
                  <Button
                    asChild
                    className="w-full h-10 rounded-xl font-black text-xs bg-foreground text-background hover:bg-primary hover:text-white transition-all cursor-pointer shadow-lg shadow-foreground/5 group/btn">
                    <Link
                      href={detailHref}
                      className="flex items-center justify-center gap-2 uppercase tracking-widest">
                      Khám phá
                      <ArrowRight size={14} className="transition-transform group-hover/btn:translate-x-1" />
                    </Link>
                  </Button>
                )}
              </CardFooter>
            </Card>
          </div>
        );
      })}
    </div>
  );
};
