"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { RegisterSchema, RegisterInput } from "../schemas/auth.schema";
import { useRegister } from "../mutations/useRegister";
import { useRouter } from "@/lib/i18n/routing";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Eye, EyeOff } from "lucide-react";

export const RegisterForm = () => {
  const t = useTranslations("auth.register");
  const router = useRouter();
  const { mutate, isPending } = useRegister();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: { firstName: "", lastName: "", email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = (data: RegisterInput) => {
    const { confirmPassword: _confirmPassword, ...registerPayload } = data;
    mutate(registerPayload, {
      onSuccess: () => {
        router.push(`/verify?email=${encodeURIComponent(registerPayload.email)}&type=REGISTER`);
      },
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("first_name")}</FormLabel>
                <FormControl>
                  <Input placeholder={t("placeholder_first")} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("last_name")}</FormLabel>
                <FormControl>
                  <Input placeholder={t("placeholder_last")} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("email")}</FormLabel>
              <FormControl>
                <Input type="email" placeholder={t("placeholder_email")} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { name: "password" as const, state: showPassword, setter: setShowPassword },
            { name: "confirm_password" as const, state: showConfirmPassword, setter: setShowConfirmPassword },
          ].map((item) => (
            <FormField
              key={item.name}
              control={form.control}
              name={item.name === "confirm_password" ? "confirmPassword" : "password"}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t(item.name)}</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input type={item.state ? "text" : "password"} className="pr-10" {...field} />
                    </FormControl>
                    <button
                      type="button"
                      onClick={() => item.setter(!item.state)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {item.state ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
        </div>

        <Button type="submit" className="w-full font-bold h-11 mt-2" disabled={isPending}>
          {isPending ? t("processing") : t("submit")}
        </Button>
      </form>
    </Form>
  );
};
