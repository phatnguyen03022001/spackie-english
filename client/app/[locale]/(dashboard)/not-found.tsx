import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/routing";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";
import { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "404 - Page Not Found | Spackie English",
  description: "The page you are looking for does not exist.",
  robots: { index: false, follow: false },
};

export default function GlobalNotFound() {
  const t = useTranslations("Home.common");

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden bg-background px-6 py-12 lg:px-8">
      {/* Background Blobs - Làm dịu bớt để không gây rối mắt */}
      <div className="absolute top-1/4 -left-10 -z-10 h-72 w-72 rounded-full bg-primary/10 blur-[100px]" />
      <div className="absolute bottom-1/4 -right-10 -z-10 h-72 w-72 rounded-full bg-primary/5 blur-[100px]" />

      <main className="flex flex-col items-center max-w-2xl w-full text-center">
        {/* Hình minh họa - Tự động co giãn theo viewport */}
        <div className="relative mb-12 w-full max-w-70 md:max-w-90 aspect-square">
          <Image
            src="/system/404.png"
            alt="404 Illustration"
            fill
            priority
            className="object-contain drop-shadow-2xl"
          />
        </div>

        {/* Nội dung chữ - Tối ưu khoảng cách dòng và cỡ chữ responsive */}
        <div className="space-y-4 mb-10 w-full px-4">
          <span className="text-sm font-bold tracking-[0.3em] uppercase text-primary/80">Error 404</span>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-foreground">{t("notFoundTitle")}</h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-sm mx-auto leading-relaxed">
            {t("notFoundDescription")}
          </p>
        </div>

        {/* Action Buttons - Stack trên mobile, hàng ngang trên desktop */}
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <Button
            asChild
            variant="default"
            size="lg"
            className="h-12 w-full sm:w-auto rounded-xl px-8 font-semibold transition-all hover:shadow-lg hover:shadow-primary/20">
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              {t("backHome")}
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-12 w-full sm:w-auto rounded-xl px-8 font-semibold">
            <Link href="/login">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("backToLogin")}
            </Link>
          </Button>
        </div>
      </main>

      <footer className="absolute bottom-8 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground/30">
        © 2026 Spackie English
      </footer>
    </div>
  );
}
