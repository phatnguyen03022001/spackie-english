import { useTranslations } from "next-intl";
import { RegisterForm } from "@/features/auth/components/RegisterForm";
import { Link } from "@/lib/i18n/routing";

export default function RegisterPage() {
  const t = useTranslations("auth.register");

  return (
    <div className="w-full">
      <RegisterForm />
      <div className=" text-center lg:text-left text-sm mt-8 text-muted-foreground animate-in fade-in duration-1000">
        {t("hasAccount")}{" "}
        <Link href="/login" className="text-primary hover:underline font-medium">
          {t("loginLink")}
        </Link>
      </div>
    </div>
  );
}
