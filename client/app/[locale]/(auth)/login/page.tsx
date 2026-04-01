import { useTranslations } from "next-intl";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { Link } from "@/lib/i18n/routing";

export default function LoginPage() {
  const t = useTranslations("auth.login");

  return (
    <div className="w-full">
      <LoginForm />
      <div className=" text-center lg:text-left text-sm mt-8 text-muted-foreground animate-in fade-in duration-1000">
        {t("noAccount")}{" "}
        <Link href="/register" className="text-primary font-semibold hover:underline underline-offset-4 transition-all">
          {t("registerLink")}
        </Link>
      </div>
    </div>
  );
}
