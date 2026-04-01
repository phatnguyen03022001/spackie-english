"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ForgotPasswordSchema, ForgotPasswordInput } from "../schemas/auth.schema";
import { useSendOtp } from "../mutations/useSendOtp";
import { useResetPassword } from "../mutations/useResetPassword";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Link } from "@/lib/i18n/routing";
import { ArrowLeft, Eye, EyeOff, SendHorizontal, ShieldCheck, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

export const ForgotPasswordForm = () => {
  const t = useTranslations("auth.forgot_password");
  const [step, setStep] = useState<"EMAIL" | "VERIFY">("EMAIL");
  const [showPassword, setShowPassword] = useState(false);

  const sendOtpMutation = useSendOtp();
  const { mutate: resetPassword, isPending: isResetPending } = useResetPassword();

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: { email: "", code: "", newPassword: "" },
  });

  const onSendOtp = async () => {
    const isEmailValid = await form.trigger("email");
    if (!isEmailValid) return;

    sendOtpMutation.mutate(
      { data: { email: form.getValues("email") }, type: "FORGOT_PASSWORD" },
      {
        onSuccess: () => {
          setStep("VERIFY");
          form.clearErrors();
        },
      },
    );
  };

  return (
    // Bọc trong một container để tận dụng glass-panel từ globals.css
    <div className="glass-panel w-full max-w-md mx-auto shadow-2xl border-white/10">
      <div className="mb-8 space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {step === "EMAIL" ? t("title") || "Quên mật khẩu?" : t("title_verify") || "Xác thực OTP"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {step === "EMAIL"
            ? t("description") || "Nhập email của bạn để nhận mã khôi phục."
            : t("description_verify") || "Chúng tôi đã gửi mã đến email của bạn."}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => resetPassword(data))} className="space-y-5">
          {/* EMAIL FIELD */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground/80 font-medium">{t("label_email")}</FormLabel>
                <div className="relative flex gap-2">
                  <div className="relative w-full">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <FormControl>
                      <Input
                        placeholder={t("placeholder_email")}
                        {...field}
                        className={cn(
                          "pl-10 h-11 bg-background/50 border-border/50 focus:border-primary transition-all",
                          step === "VERIFY" && "opacity-60 grayscale-[0.5]",
                        )}
                        disabled={step === "VERIFY" || sendOtpMutation.isPending}
                      />
                    </FormControl>
                  </div>

                  {step === "EMAIL" && (
                    <Button
                      type="button"
                      onClick={onSendOtp}
                      disabled={sendOtpMutation.isPending}
                      className="shrink-0 h-11 px-4 bg-primary hover:opacity-90 shadow-lg shadow-primary/20 transition-all active:scale-95">
                      {sendOtpMutation.isPending ? (
                        <span className="animate-pulse">...</span>
                      ) : (
                        <SendHorizontal size={18} />
                      )}
                    </Button>
                  )}
                </div>
                <FormMessage className="text-[13px]" />
              </FormItem>
            )}
          />

          {step === "VERIFY" && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/80 font-medium">{t("label_otp")}</FormLabel>
                    <div className="relative">
                      <ShieldCheck
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        size={18}
                      />
                      <FormControl>
                        <Input
                          placeholder={t("placeholder_otp")}
                          {...field}
                          maxLength={6}
                          className="pl-10 h-11 bg-background/50 border-border/50 tracking-[0.2em] font-mono text-lg"
                        />
                      </FormControl>
                    </div>
                    <FormMessage className="text-[13px]" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/80 font-medium">{t("label_password")}</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder={t("placeholder_password")}
                          className="h-11 pr-10 bg-background/50 border-border/50"
                          {...field}
                        />
                      </FormControl>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <FormMessage className="text-[13px]" />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full font-bold h-12 bg-primary hover:opacity-90 shadow-xl shadow-primary/25 text-primary-foreground mt-2 transition-all active:scale-[0.98]"
                disabled={isResetPending}>
                {isResetPending ? "Processing..." : t("btn_submit")}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setStep("EMAIL");
                  form.clearErrors();
                }}
                className="w-full text-xs font-medium text-muted-foreground hover:text-primary transition-colors py-2">
                ← {t("btn_use_other") || "Sử dụng email khác"}
              </button>
            </div>
          )}
        </form>
      </Form>

      <div className="mt-8 pt-6 border-t border-border/50">
        <Link
          href="/login"
          className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          {t("link_back")}
        </Link>
      </div>
    </div>
  );
};
