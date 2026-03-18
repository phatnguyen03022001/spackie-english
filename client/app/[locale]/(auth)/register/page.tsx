import { useTranslations } from "next-intl";
import { RegisterForm } from "@/features/auth/components/RegisterForm";
import { Link } from "@/lib/i18n/routing";

export default function RegisterPage() {
  const t = useTranslations("auth.register");

  return (
    <div>
      <RegisterForm />
      <div className="text-center text-sm mt-4 text-muted-foreground">
        {t("hasAccount")}{" "}
        <Link href="/login" className="text-primary hover:underline font-medium">
          {t("loginLink")}
        </Link>
      </div>
    </div>
  );
}
