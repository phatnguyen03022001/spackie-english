"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation"; // Thêm useRouter
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { vocabApi } from "../../api/vocab-client";
import { Deck } from "../../types";
import { toast } from "sonner";
import { Bookmark, BookmarkCheck, Loader2, Layers, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface DeckEnrollCardProps {
  deck: Deck;
  isEnrolled: boolean;
}

export function DeckEnrollCard({ deck, isEnrolled: isEnrolledInitial }: DeckEnrollCardProps) {
  const queryClient = useQueryClient();
  const router = useRouter(); // Dùng router để điều hướng thủ công
  const [isEnrolled, setIsEnrolled] = useState(isEnrolledInitial);
  const [loading, setLoading] = useState(false);

  const params = useParams();
  const locale = (params.locale as string) || "vi";
  const role = (params.role as string) || "student";

  const previewHref = `/${locale}/${role}/vocabulary/decks/${deck.id}`;
  const reviewHref = `/${locale}/${role}/vocabulary/review?deckId=${deck.id}`;

  useEffect(() => {
    setIsEnrolled(isEnrolledInitial);
  }, [isEnrolledInitial]);

  const handleEnroll = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Ngăn sự kiện click lan lên Card

    setLoading(true);
    try {
      if (isEnrolled) {
        await vocabApi.unenrollDeck(deck.id);
        toast.success("Đã hủy đăng ký bộ thẻ");
      } else {
        await vocabApi.enrollDeck(deck.id);
        toast.success("Đã thêm bộ thẻ vào kho");
      }
      await queryClient.invalidateQueries({ queryKey: ["my-enrolled-decks"] });
    } catch {
      toast.error("Thao tác thất bại.");
    } finally {
      setLoading(false);
    }
  };

  // Điều hướng khi nhấn vào vùng trống của Card
  const handleCardClick = () => {
    router.push(previewHref);
  };

  return (
    <Card
      onClick={handleCardClick}
      className="flex flex-col h-full overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/50 border-2 cursor-pointer group">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-xl line-clamp-1 group-hover:text-primary transition-colors">
            {deck.title}
          </CardTitle>
          {deck.levelTag && (
            <Badge variant="secondary" className="shrink-0 uppercase">
              {deck.levelTag}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 pb-4">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4 h-10">
          {deck.description || "Khám phá bộ từ vựng này ngay."}
        </p>
        <div className="flex items-center text-sm font-medium text-primary/80">
          <Layers className="mr-2 h-4 w-4" />
          {deck._count?.cards || 0} thẻ vựng
        </div>
      </CardContent>

      <CardFooter className="pt-0 gap-2">
        <Button
          variant={isEnrolled ? "outline" : "default"}
          className="flex-1"
          onClick={handleEnroll}
          disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isEnrolled ? (
            <BookmarkCheck className="h-4 w-4 text-green-500" />
          ) : (
            <Bookmark className="h-4 w-4" />
          )}
          <span className="ml-2">{isEnrolled ? "Đã lưu" : "Đăng ký"}</span>
        </Button>

        {isEnrolled && (
          <Button
            variant="default"
            className="flex-1 bg-green-600 hover:bg-green-700 shadow-sm"
            asChild
            // e.stopPropagation ở đây để khi nhấn "Học ngay" không kích hoạt handleCardClick (vào preview)
            onClick={(e) => e.stopPropagation()}>
            <Link href={reviewHref}>
              <PlayCircle className="mr-2 h-4 w-4" />
              Học ngay
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
