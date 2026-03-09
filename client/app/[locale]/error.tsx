// src/app/error.tsx
"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useTranslations, NextIntlClientProvider, useMessages } from "next-intl";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // Hook này sẽ tự động lấy messages từ locale hiện tại (dựa vào URL [lang])
  const messages = useMessages();

  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  // Nếu chưa có messages (fallback khi lần đầu render), trả về null để tránh lỗi
  if (!messages) {
    return null;
  }

  return (
    <NextIntlClientProvider messages={messages}>
      <ErrorContent error={error} reset={reset} />
    </NextIntlClientProvider>
  );
}

// Tách riêng để useTranslations hoạt động
function ErrorContent({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("error"); // namespace "error" trong file messages

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <main className="grid min-h-screen place-items-center bg-background px-6 py-24 sm:py-32 lg:px-8">
          <div className="text-center">
            <p className="text-9xl font-black text-primary/10 select-none">500</p>
            <h1 className="mt-8 text-4xl font-bold tracking-tight sm:text-5xl">{t("errorTitle")}</h1>
            <p className="mt-6 text-lg leading-7 text-muted-foreground">{t("errorDescription")}</p>
            <div className="mt-10 flex items-center justify-center gap-6">
              <Button onClick={() => reset()} size="lg">
                {t("errorTryAgain")}
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/">{t("errorBackHome")}</Link>
              </Button>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
