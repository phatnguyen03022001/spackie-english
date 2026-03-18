import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function GlobalNotFound() {
  // Sử dụng bản async cho Server Component
  const locale = await getLocale();
  const t = await getTranslations("Home.common");

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <h1 className="text-4xl text-blue-400 font-bold">{t("notFound")}</h1>
      <Button asChild>
        <Link href={`/${locale}/login`}>{t("backHome")}</Link>
      </Button>
    </div>
  );
}
