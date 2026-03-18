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
    <OtpVerification
      email={email}
      type={type}
      title={t(`title_${type.toLowerCase()}`)}
      onVerify={(otp) => mutate({ email, code: otp })}
      isPending={isPending}
    />
  );
}
