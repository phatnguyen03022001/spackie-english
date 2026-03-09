// src/app/[lang]/not-found.tsx
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function GlobalNotFound() {
  const t = await getTranslations("common");

  // Here, we assume the current route path already includes the language code, e.g., /en/not-found
  // You can extract the current locale from the URL path or from `next-intl`'s context.
  const locale: string = ""; // You can access locale from the translations context

  // Generate the home link based on the current locale
  const homeLink = `/${locale}`;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="text-center space-y-12">
        <h1 className="text-9xl font-black text-primary/10 select-none">404</h1>
        <h2 className="mt-8 text-4xl font-bold">{t("notFoundTitle")}</h2>
        <p className="mt-4 text-lg text-muted-foreground">{t("notFoundDescription")}</p>
        <Button asChild size="lg" className="mt-10">
          <Link href={homeLink}>{t("notFoundBackHome")}</Link>
        </Button>
      </div>
    </main>
  );
}
