"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, Loader2 } from "lucide-react";

interface AudioPlayerProps {
  url: string;
  autoPlay?: boolean;
}

export function AudioPlayer({ url, autoPlay = false }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (autoPlay && url) {
      handlePlay();
    }
  }, []);

  const handlePlay = async () => {
    if (!url || isLoading) return;

    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(url);
      } else if (audioRef.current.src !== url) {
        audioRef.current.src = url;
      }

      setIsLoading(true);
      await audioRef.current.play();
      setIsPlaying(true);

      audioRef.current.onended = () => setIsPlaying(false);
    } catch (error) {
      console.error("Audio playback failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-full h-10 w-10"
      onClick={(e) => {
        e.stopPropagation(); // Không làm lật thẻ khi bấm nút loa
        handlePlay();
      }}
      disabled={!url || isLoading}>
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : isPlaying ? (
        <Volume2 className="h-5 w-5 text-primary animate-pulse" />
      ) : (
        <Volume2 className="h-5 w-5" />
      )}
    </Button>
  );
}
