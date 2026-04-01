"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { OtpSchema, OtpInput } from "../schemas/auth.schema";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ArrowLeft, RotateCcw, ShieldCheck, Loader2 } from "lucide-react";
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
    // Bọc trong glass-panel và dùng items-center cho toàn bộ layout
    <div className="glass-panel w-full flex flex-col items-center text-center shadow-2xl border-white/10 p-8 sm:p-10">
      {/* Header Section: Căn giữa tuyệt đối */}
      <div className="mb-10 space-y-4 w-full flex flex-col items-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-[inset_0_0_12px_rgba(var(--primary),0.1)]">
          <ShieldCheck size={30} />
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-70 mx-auto">
            {t("subtitle")}{" "}
            <span className="text-primary font-semibold block mt-1 break-all underline decoration-primary/20 underline-offset-4">
              {email}
            </span>
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((d) => onVerify(d.otp))} className="space-y-10 w-full">
          {/* Input OTP Group: Căn giữa các Slot */}
          <FormField
            control={form.control}
            name="otp"
            render={({ field }) => (
              <FormItem className="flex flex-col items-center">
                <FormControl>
                  <InputOTP maxLength={6} {...field} autoFocus onComplete={(value) => onVerify(value)}>
                    <InputOTPGroup className="flex justify-center gap-2 sm:gap-3">
                      {[...Array(6)].map((_, i) => (
                        <InputOTPSlot key={i} index={i} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </FormControl>
                <FormMessage className="text-[13px] font-medium mt-2" />
              </FormItem>
            )}
          />

          <div className="space-y-6 w-full flex flex-col items-center">
            <Button
              type="submit"
              className="w-full max-w-[320px] h-12 text-base font-bold bg-primary hover:opacity-90 shadow-xl shadow-primary/20 transition-all active:scale-[0.98] rounded-xl"
              disabled={isPending}>
              {isPending ? <Loader2 className="animate-spin" /> : t("verify_button")}
            </Button>

            {/* Resend Countdown: Design lại cho gọn để không chiếm không gian */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-primary transition-colors h-auto py-2"
              disabled={countdown > 0 || isPending || resendMutation.isPending}
              onClick={handleResend}>
              {countdown > 0 ? (
                <span className="text-xs font-medium flex items-center gap-2 tabular-nums">
                  {t("resend_countdown")} <span className="text-primary font-bold">{countdown}s</span>
                </span>
              ) : (
                <span className="text-xs font-bold flex items-center gap-2 uppercase tracking-wider">
                  <RotateCcw size={14} /> {t("resend_button")}
                </span>
              )}
            </Button>
          </div>
        </form>
      </Form>

      {/* Footer link quay lại */}
      <div className="mt-10 pt-6 border-t border-border/40 w-full">
        <Link
          href="/login"
          className="group flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-all">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          {t("back_to_login")}
        </Link>
      </div>
    </div>
  );
};
