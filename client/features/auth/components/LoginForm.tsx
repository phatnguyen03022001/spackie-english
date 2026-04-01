"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { LoginSchema, LoginInput, LoginOtpSchema, LoginOtpInput } from "../schemas/auth.schema";
import { useLogin } from "../mutations/useLogin";
import { useSendOtp } from "../mutations/useSendOtp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter, Link } from "@/lib/i18n/routing";
import { Eye, EyeOff, Mail, LockKeyhole, ShieldCheck, Loader2 } from "lucide-react";

export const LoginForm = () => {
  const router = useRouter();
  const tTabs = useTranslations("auth.tabs");
  const tLogin = useTranslations("auth.login");

  const [showPassword, setShowPassword] = useState(false);

  const { mutate: login, isPending: isLoginPending } = useLogin();
  const { mutate: sendOtp, isPending: isOtpPending } = useSendOtp();

  const passwordForm = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: "", password: "" },
  });

  const otpForm = useForm<LoginOtpInput>({
    resolver: zodResolver(LoginOtpSchema),
    defaultValues: { email: "" },
  });

  const onLoginSubmit = (data: LoginInput) => login(data);
  const onOtpSubmit = (data: LoginOtpInput) => {
    sendOtp(
      { data, type: "LOGIN" },
      {
        onSuccess: () => {
          router.push(`/verify?email=${encodeURIComponent(data.email)}&type=LOGIN`);
        },
      },
    );
  };

  return (
    <Tabs defaultValue="password" className="w-full">
      {/* Nâng cấp TabsList thành dạng Capsule hiện đại */}
      <TabsList className="grid w-full grid-cols-2 mb-8 bg-muted/30 p-[2px] h-12 border border-border/50 rounded-xl backdrop-blur-sm">
        <TabsTrigger
          value="password"
          className="flex items-center justify-center w-full h-full font-medium rounded-lg transition-all duration-300 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
          {tTabs("password")}
        </TabsTrigger>

        <TabsTrigger
          value="otp"
          className="flex items-center justify-center w-full h-full font-medium rounded-lg transition-all duration-300 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
          {tTabs("otp")}
        </TabsTrigger>
      </TabsList>

      {/* Login with Password Content */}
      <TabsContent
        value="password"
        title="password-login"
        className="animate-in fade-in slide-in-from-left-4 duration-500 outline-none">
        <Form {...passwordForm}>
          <form onSubmit={passwordForm.handleSubmit(onLoginSubmit)} className="space-y-5">
            <FormField
              control={passwordForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-foreground/80 font-medium">{tLogin("email_label")}</FormLabel>
                  <div className="relative group">
                    <Mail
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors"
                      size={18}
                    />
                    <FormControl>
                      <Input
                        placeholder="email@example.com"
                        {...field}
                        className="pl-10 h-11 bg-background/40 border-border/60 focus:border-primary transition-all rounded-lg"
                      />
                    </FormControl>
                  </div>
                  <FormMessage className="text-[13px]" />
                </FormItem>
              )}
            />

            <FormField
              control={passwordForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center h-6">
                    <FormLabel className="text-foreground/80 font-medium">{tLogin("password_label")}</FormLabel>
                    <Link
                      href="/forgot-password"
                      className="text-xs font-semibold text-primary/80 hover:text-primary hover:underline transition-all">
                      {tLogin("forgot_password")}
                    </Link>
                  </div>
                  <div className="relative group">
                    <LockKeyhole
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors"
                      size={18}
                    />
                    <FormControl>
                      <Input
                        type={showPassword ? "text" : "password"}
                        className="pl-10 pr-10 h-11 bg-background/40 border-border/60 focus:border-primary transition-all rounded-lg"
                        {...field}
                      />
                    </FormControl>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors p-1">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <FormMessage className="text-[13px]" />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full font-bold h-12 bg-primary hover:opacity-90 shadow-xl shadow-primary/20 text-primary-foreground transition-all active:scale-[0.98] mt-2"
              disabled={isLoginPending}>
              {isLoginPending ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="animate-spin" size={18} />
                  {tLogin("processing")}
                </div>
              ) : (
                tLogin("login_button")
              )}
            </Button>
          </form>
        </Form>
      </TabsContent>

      {/* Login with OTP Content */}
      <TabsContent value="otp" className="animate-in fade-in slide-in-from-right-4 duration-500 outline-none">
        <div className="min-h-55">
          <Form {...otpForm}>
            <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-6">
              <FormField
                control={otpForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground/80 font-medium">{tLogin("email_label")}</FormLabel>
                    <div className="relative group">
                      <ShieldCheck
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors"
                        size={18}
                      />
                      <FormControl>
                        <Input
                          placeholder="email@example.com"
                          {...field}
                          className="pl-10 h-11 bg-background/40 border-border/60 focus:border-primary transition-all rounded-lg"
                        />
                      </FormControl>
                    </div>
                    <FormMessage className="text-[13px]" />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full font-bold h-12 bg-primary hover:opacity-90 shadow-xl shadow-primary/20 text-primary-foreground transition-all active:scale-[0.98]"
                disabled={isOtpPending}>
                {isOtpPending ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="animate-spin" size={18} />
                    {tLogin("sending_otp")}
                  </div>
                ) : (
                  tLogin("send_otp_button")
                )}
              </Button>
            </form>
          </Form>
        </div>
      </TabsContent>
    </Tabs>
  );
};
