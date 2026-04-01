"use client";

import React, { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX, Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AudioPlayerProps {
  url?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const AudioPlayer = ({ url, className, size = "md" }: AudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Khởi tạo và cập nhật audio khi url thay đổi
  useEffect(() => {
    if (!url) {
      audioRef.current = null;
      return;
    }

    const audio = new Audio(url);
    audioRef.current = audio;

    const handleEnded = () => setIsPlaying(false);
    const handleError = () => {
      setIsPlaying(false);
      setIsLoading(false);
      toast.error("Không thể tải tập tin âm thanh");
    };
    const handleCanPlay = () => setIsLoading(false);

    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("canplay", handleCanPlay);

    return () => {
      audio.pause();
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("canplay", handleCanPlay);
      audioRef.current = null;
    };
  }, [url]);

  const togglePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current || !url) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        setIsLoading(true);
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("Audio playback failed:", error);
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  };

  const iconSize = size === "sm" ? 16 : size === "lg" ? 24 : 20;

  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={!url || isLoading}
      onClick={togglePlay}
      className={cn("rounded-full h-8 w-8 hover:bg-primary/10 transition-colors", className)}>
      {!url ? (
        <VolumeX size={iconSize} className="text-muted-foreground" />
      ) : isLoading ? (
        <Loader2 size={iconSize} className="animate-spin text-primary" />
      ) : isPlaying ? (
        <Volume2 size={iconSize} className="text-primary animate-pulse" />
      ) : (
        <Play size={iconSize} className="text-primary fill-primary" />
      )}
    </Button>
  );
};
