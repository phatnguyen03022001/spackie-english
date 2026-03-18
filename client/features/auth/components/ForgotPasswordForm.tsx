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
import { ArrowLeft, Eye, EyeOff, SendHorizontal } from "lucide-react";

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
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => resetPassword(data))} className="space-y-4">
        {/* EMAIL FIELD */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-white">{t("label_email")}</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input
                    placeholder={t("placeholder_email")}
                    {...field}
                    disabled={step === "VERIFY" || sendOtpMutation.isPending}
                  />
                </FormControl>
                {step === "EMAIL" && (
                  <Button
                    type="button"
                    onClick={onSendOtp}
                    disabled={sendOtpMutation.isPending}
                    className="shrink-0 bg-primary">
                    {sendOtpMutation.isPending ? "..." : <SendHorizontal size={18} />}
                  </Button>
                )}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {step === "VERIFY" && (
          <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">{t("label_otp")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("placeholder_otp")} {...field} maxLength={6} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground">{t("label_password")}</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder={t("placeholder_password")}
                        className="pr-10"
                        {...field}
                      />
                    </FormControl>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full font-bold h-11 bg-primary" disabled={isResetPending}>
              {isResetPending ? "..." : t("btn_submit")}
            </Button>

            <button
              type="button"
              onClick={() => {
                setStep("EMAIL");
                form.clearErrors();
              }}
              className="w-full text-xs text-muted-foreground hover:text-primary transition-colors mt-2">
              {t("btn_use_other")}
            </button>
          </div>
        )}
      </form>

      <Link
        href="/login"
        className="mt-8 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft size={16} /> {t("link_back")}
      </Link>
    </Form>
  );
};
