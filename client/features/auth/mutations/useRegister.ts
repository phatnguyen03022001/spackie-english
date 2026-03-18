"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { useTranslations } from "next-intl";
import { authApi } from "../api/auth-client";
import { RegisterDto, RegisterResponse } from "../types/auth.types"; // Giả sử bạn có kiểu Response
import { handleAuthError } from "../utils/handleAuthError";
import { TranslationFunction, ServerError } from "@/types/shared";

export const useRegister = () => {
  const t = useTranslations("auth.register.messages"); // Namespace cho register

  return useMutation<RegisterResponse, AxiosError<ServerError>, RegisterDto>({
    mutationFn: (data: RegisterDto) => authApi.register(data),
    onSuccess: (data) => {
      // Dùng message từ backend hoặc từ i18n
      toast.success(t("success") || data.message);
    },
    onError: (err) => {
      // Dùng utility tập trung, không cần cast 'as any'
      const errorMessage = handleAuthError(err, t as TranslationFunction);
      toast.error(errorMessage);
    },
  });
};
