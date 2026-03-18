// /features/auth/mutations/useSendOtp.ts
"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { useTranslations } from "next-intl";
import { authApi } from "../api/auth-client";
import { SendOtpPayload } from "../types/auth.types";
import { handleAuthError } from "../utils/handleAuthError";
import { TranslationFunction, ServerError } from "@/types/shared";

// /features/auth/mutations/useSendOtp.ts
import { MessageResponse } from "../types/auth.types"; // Import interface này

export const useSendOtp = () => {
  const t = useTranslations("auth.otp");

  // Thay 'void' bằng 'MessageResponse'
  return useMutation<MessageResponse, AxiosError<ServerError>, SendOtpPayload>({
    mutationFn: (payload) => authApi.sendOtp(payload.data, payload.type),
    onSuccess: (data) => {
      // Bây giờ bạn có thể truy cập data.message nếu muốn!
      toast.success(data.message || t("sending_otp"));
    },
    onError: (err) => {
      const errorMessage = handleAuthError(err, t as TranslationFunction);
      toast.error(errorMessage);
    },
  });
};
