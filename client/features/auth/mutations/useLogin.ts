// features/auth/mutations/useLogin.ts
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { useTranslations } from "next-intl";
import { authApi } from "../api/auth-client";
import { LoginDto, AuthResponse } from "../types/auth.types";
import { useAuth } from "../hooks/useAuthProvider";
import { useRouter } from "@/lib/i18n/routing";
import { handleAuthError } from "../utils/handleAuthError"; // Import utility
import { ServerError } from "../../../types/shared";

export type TranslationFunction = (key: string, values?: Record<string, string | number>) => string;

// features/auth/mutations/useLogin.ts
export const useLogin = () => {
  const { login } = useAuth();
  const router = useRouter();
  // Khai báo t với kiểu hàm dịch thuật chuẩn
  const t = useTranslations("auth.login.messages") as TranslationFunction;

  return useMutation<AuthResponse, AxiosError<ServerError>, LoginDto>({
    mutationFn: (data: LoginDto) => authApi.login(data),
    onSuccess: (data) => {
      login(data);
      toast.success(t("Success"));
      const role = data.user.role.toLowerCase();
      router.push(`/${role}`);
    },
    onError: (err) => {
      // Bây giờ t đã khớp kiểu với TranslationFunction
      const errorMessage = handleAuthError(err, t);
      toast.error(errorMessage);
    },
  });
};
