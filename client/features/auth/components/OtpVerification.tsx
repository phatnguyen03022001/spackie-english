"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { OtpSchema, OtpInput } from "../schemas/auth.schema";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { useSendOtp } from "../mutations/useSendOtp";
import { Link } from "@/lib/i18n/routing";

interface OtpProps {
  email: string;
  type: "REGISTER" | "LOGIN" | "FORGOT_PASSWORD";
  title: string;
  onVerify: (otp: string) => void;
  isPending: boolean;
}

export const OtpVerification = ({ email, type, title, onVerify, isPending }: OtpProps) => {
  const t = useTranslations("auth.otp");
  const [countdown, setCountdown] = useState(60);
  const resendMutation = useSendOtp();

  const form = useForm<OtpInput>({
    resolver: zodResolver(OtpSchema),
    defaultValues: { otp: "" },
  });

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleResend = async () => {
    await resendMutation.mutateAsync({ data: { email }, type });
    setCountdown(60);
  };

  return (
    <div className="flex flex-col items-center gap-6 animate-in fade-in duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        <p className="text-muted-foreground text-sm">
          {t("subtitle")} <b className="text-primary">{email}</b>
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((d) => onVerify(d.otp))}
          className="space-y-6 w-full flex flex-col items-center">
          <FormField
            control={form.control}
            name="otp"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <InputOTP maxLength={6} {...field} autoFocus onComplete={onVerify}>
                    <InputOTPGroup className="gap-2">
                      {[...Array(6)].map((_, i) => (
                        <InputOTPSlot
                          key={i}
                          index={i}
                          className="w-10 h-12 sm:w-12 sm:h-14 border-input bg-background text-foreground shadow-sm"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="w-full space-y-3">
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? t("processing") : t("verify_button")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              disabled={countdown > 0 || isPending || resendMutation.isPending}
              onClick={handleResend}>
              {countdown > 0 ? (
                `${t("resend_countdown")} ${countdown}s`
              ) : (
                <>
                  <RotateCcw size={14} className="mr-2" /> {t("resend_button")}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
      <Link href="/login" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft size={16} /> {t("back_to_login")}
      </Link>
    </div>
  );
};
