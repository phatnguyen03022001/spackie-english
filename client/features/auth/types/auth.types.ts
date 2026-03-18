export type UserRole = "STUDENT" | "TEACHER" | "ADMIN";

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: UserRole;
  };
}

export interface MessageResponse {
  message: string;
}

// Đối với các phản hồi đặc biệt từ backend (như login OTP 2FA)
export interface LoginResponse {
  requireOtp?: boolean;
  message?: string;
  accessToken?: string;
  user?: AuthResponse["user"];
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: UserRole;
}

export interface VerifyOtpDto {
  email: string;
  code: string;
}

export interface SendOtpDto {
  email: string;
}

// --- CÁC TYPE CÒN THIẾU CẦN BỔ SUNG ---

export interface ForgotPasswordDto {
  email: string;
  code: string;
  newPassword: string;
}

// Type cho payload khi gọi useSendOtp
export interface SendOtpPayload {
  data: SendOtpDto;
  type: "REGISTER" | "LOGIN" | "FORGOT_PASSWORD";
}

export interface RegisterResponse {
  message: string;
  // Thêm các trường nếu backend trả về sau khi tạo tài khoản thành công
  user?: {
    id: string;
    email: string;
  };
}
