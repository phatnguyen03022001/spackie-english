"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { authApi } from "../api/auth-client";
import { AuthResponse, MessageResponse, VerifyOtpDto } from "../types/auth.types";
import { useAuth } from "../hooks/useAuthContext";
import { useRouter } from "@/lib/i18n/routing"; // Sử dụng router đã cấu hình locale

type VerifyOtpResponse = AuthResponse | MessageResponse;

export const useVerifyOtp = (type: "REGISTER" | "LOGIN" | "FORGOT_PASSWORD") => {
  const { login } = useAuth();
  const router = useRouter();

  return useMutation<VerifyOtpResponse, AxiosError<{ message: string }>, VerifyOtpDto>({
    mutationFn: async (data: VerifyOtpDto): Promise<VerifyOtpResponse> => {
      if (type === "REGISTER") return await authApi.verifyRegisterOtp(data);
      if (type === "LOGIN") return await authApi.verifyLoginOtp(data);

      const res = await authApi.verifyForgotOtp(data);
      return res;
    },
    onSuccess: (data, variables) => {
      if (type === "LOGIN" && "accessToken" in data) {
        login({ accessToken: data.accessToken, user: data.user });
        toast.success("Đăng nhập thành công!");

        const role = data.user.role;
        // Chỉnh sửa router.push ở đây:
        if (role === "ADMIN") router.push("/admin");
        else if (role === "TEACHER") router.push("/teacher");
        else router.push("/student"); // Thay đổi từ /dashboard sang /student
      } else if (type === "REGISTER") {
        toast.success("Xác thực tài khoản thành công!");
        router.push("/login");
      } else if (type === "FORGOT_PASSWORD") {
        router.push(`/reset-password?email=${encodeURIComponent(variables.email)}&code=${variables.code}`);
      }
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Xác thực OTP thất bại.");
    },
  });
};
