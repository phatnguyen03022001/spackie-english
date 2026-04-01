"use client";

import { OtpVerification } from "@/features/auth/components/OtpVerification";
import { useVerifyOtp } from "@/features/auth/mutations/useVerifyOtp";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

export default function VerifyPage() {
  const t = useTranslations("auth.otp");
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const type = (searchParams.get("type") as "REGISTER" | "LOGIN" | "FORGOT_PASSWORD") || "REGISTER";
  const { mutate, isPending } = useVerifyOtp(type);

  return (
    <div className="w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
      <OtpVerification
        email={email}
        type={type}
        title={t(`title_${type.toLowerCase()}`)}
        onVerify={(otp) => mutate({ email, code: otp })}
        isPending={isPending}
      />
    </div>
  );
}
