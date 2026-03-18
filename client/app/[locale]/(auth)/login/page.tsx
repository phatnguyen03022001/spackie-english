import { useTranslations } from "next-intl";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { Link } from "@/lib/i18n/routing";

export default function LoginPage() {
  const t = useTranslations("auth.login");

  return (
    <div>
      <LoginForm />
      <div className="text-center text-sm mt-4 text-muted-foreground">
        {t("noAccount")}{" "}
        <Link href="/register" className="text-orange-600">
          {t("registerLink")}
        </Link>
      </div>
    </div>
  );
}
