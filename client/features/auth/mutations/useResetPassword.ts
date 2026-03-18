"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { useTranslations } from "next-intl";
import { authApi } from "../api/auth-client";
import { ForgotPasswordInput } from "../schemas/auth.schema";
import { useRouter } from "@/lib/i18n/routing";

export const useResetPassword = () => {
  const router = useRouter();
  const t = useTranslations("auth.forgot_password");

  return useMutation({
    mutationFn: (data: ForgotPasswordInput) => authApi.forgotPassword(data),
    onSuccess: () => {
      toast.success(t("toast_success"));
      router.push("/login");
    },
    onError: (err: AxiosError<{ message: string }>) => {
      toast.error(t("toast_error_default") || err.response?.data?.message);
    },
  });
};
