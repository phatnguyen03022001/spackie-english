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
import { Eye, EyeOff } from "lucide-react";

export const LoginForm = () => {
  const router = useRouter();

  // Tách biệt scope dịch
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
      {/* Tabs tự động hỗ trợ dark mode nhờ bg-muted/50 */}
      <TabsList className="flex w-full mb-6 bg-muted/50 p-1 h-12 border border-border rounded-lg">
        <TabsTrigger
          value="password"
          className="flex-1 h-full data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all rounded-md">
          {tTabs("password")}
        </TabsTrigger>
        <TabsTrigger
          value="otp"
          className="flex-1 h-full data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all rounded-md">
          {tTabs("otp")}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="password" className="mt-0 ring-offset-background focus-visible:outline-none">
        <Form {...passwordForm}>
          <form onSubmit={passwordForm.handleSubmit(onLoginSubmit)} className="space-y-4">
            <FormField
              control={passwordForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tLogin("email_label")}</FormLabel>
                  <FormControl>
                    <Input placeholder="email@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={passwordForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center h-6">
                    <FormLabel>{tLogin("password_label")}</FormLabel>
                    <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                      {tLogin("forgot_password")}
                    </Link>
                  </div>
                  <div className="relative">
                    <FormControl>
                      <Input type={showPassword ? "text" : "password"} className="pr-10" {...field} />
                    </FormControl>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full font-bold h-11" disabled={isLoginPending}>
              {isLoginPending ? tLogin("processing") : tLogin("login_button")}
            </Button>
          </form>
        </Form>
      </TabsContent>

      <TabsContent value="otp" className="mt-0 ring-offset-background focus-visible:outline-none">
        <div className="min-h-55">
          <Form {...otpForm}>
            <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-4">
              <FormField
                control={otpForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tLogin("email_label")}</FormLabel>
                    <FormControl>
                      <Input placeholder="email@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full font-bold h-11" disabled={isOtpPending}>
                {isOtpPending ? tLogin("sending_otp") : tLogin("send_otp_button")}
              </Button>
            </form>
          </Form>
        </div>
      </TabsContent>
    </Tabs>
  );
};
