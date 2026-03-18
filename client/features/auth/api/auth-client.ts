// features/auth/api/auth-client.ts

import apiClient from "@/lib/axios";
import {
  LoginDto,
  RegisterDto,
  VerifyOtpDto,
  SendOtpDto,
  AuthResponse,
  MessageResponse,
  ForgotPasswordDto, // Đảm bảo đã định nghĩa trong types
} from "../types/auth.types";

export const authApi = {
  login: async (data: LoginDto): Promise<AuthResponse> => {
    const res = await apiClient.post("/auth/login", data);
    return res.data.data;
  },

  verifyLoginOtp: async (data: VerifyOtpDto): Promise<AuthResponse> => {
    const res = await apiClient.post("/auth/verify-login-otp", data);
    return res.data.data; // Trả về { accessToken, user }
  },

  register: async (data: RegisterDto): Promise<{ userId: string; message: string }> => {
    const res = await apiClient.post("/auth/register", data);
    return res.data.data; // Bóc vỏ NestJS
  },

  verifyRegisterOtp: async (data: VerifyOtpDto): Promise<MessageResponse> => {
    const res = await apiClient.post("/auth/verify-register-otp", data);
    return res.data.data;
  },

  verifyForgotOtp: async (data: VerifyOtpDto): Promise<MessageResponse> => {
    const res = await apiClient.post("/auth/verify-forgot-otp", data);
    return res.data.data;
  },

  forgotPassword: async (data: ForgotPasswordDto): Promise<MessageResponse> => {
    const res = await apiClient.post("/auth/forgot-password", data);
    return res.data.data;
  },

  sendOtp: async (data: SendOtpDto, type: string): Promise<MessageResponse> => {
    const res = await apiClient.post(`/auth/otp/${type.toLowerCase().replace("_", "-")}`, data);
    return res.data.data;
  },
};
