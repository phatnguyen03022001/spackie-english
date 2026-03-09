"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";

export default function EnglishLearningHomeClient() {
  const t = useTranslations("Home");

  // Danh sách các key dựa trên JSON của bạn
  const courseKeys = ["ielts", "business", "communication"] as const;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* --- HERO SECTION --- */}
      <section className="relative h-screen w-full flex flex-col items-center justify-center overflow-hidden">
        <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-60">
          <source src="/home/intro.webm" type="video/webm" />
        </video>

        <div className="absolute inset-0 bg-linear-to-b from-background/80 via-transparent to-background" />

        <div className="relative z-10 text-center px-6">
          <Badge variant="secondary" className="mb-6 backdrop-blur-md px-6 py-1.5 uppercase tracking-widest text-xs">
            {t("hero.badge")}
          </Badge>
          <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-8 leading-[0.9]">
            {t("hero.title")} <br />
            <span className="text-flow-gradient">{t("hero.subtitle")}</span>
          </h1>
          <Button size="lg" className="rounded-full px-10">
            {t("hero.ctaStart")}
          </Button>
        </div>
      </section>

      {/* --- COURSE SECTION --- */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold mb-16 text-center tracking-tight">{t("courses.heading")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {courseKeys.map((key, index) => (
            <Card
              key={key}
              className="bg-card/50 backdrop-blur-md border-border hover:border-primary transition-all duration-300 overflow-hidden">
              {/* Hình ảnh đại diện cho khóa học */}
              <div className="relative h-48 w-full">
                <Image
                  src={`/home/intro-${index + 1}.jpg`}
                  alt={t(`courses.items.${key}`)}
                  fill
                  className="object-cover"
                />
              </div>

              <CardHeader>
                <CardTitle className="text-2xl">{t(`courses.items.${key}`)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6 h-12">{t("courses.description")}</p>
                <div className="flex justify-between items-center border-t border-border pt-6">
                  <span className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">
                    {t("courses.viewAll").replace(" →", "")}
                  </span>
                  <Button variant="default" size="sm">
                    {t("courses.enroll")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
