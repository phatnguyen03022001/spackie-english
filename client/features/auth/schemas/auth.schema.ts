import { z } from "zod";

// Utility để chuẩn hóa tên
const formatName = (val: string) =>
  val
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const LoginOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const RegisterSchema = LoginSchema.extend({
  firstName: z.string().min(1, "First name is required").transform(formatName),
  lastName: z.string().min(1, "Last name is required").transform(formatName),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const OtpSchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits"),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
  code: z.string().length(6, "OTP must be 6 digits"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type LoginOtpInput = z.infer<typeof LoginOtpSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type OtpInput = z.infer<typeof OtpSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
