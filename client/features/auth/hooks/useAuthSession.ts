"use client";

import { useState, useCallback } from "react";
import { AuthResponse } from "../types/auth.types";
import { usePathname } from "next/navigation";
import Cookies from "js-cookie"; // Cần cài đặt: npm install js-cookie

type User = AuthResponse["user"];

export const useAuthSession = () => {
  const pathname = usePathname();

  // Đọc giá trị khởi tạo từ Cookie thay vì LocalStorage
  const [token, setToken] = useState<string | null>(() => {
    return Cookies.get("token") || null;
  });

  const [user, setUser] = useState<User | null>(() => {
    const savedUser = Cookies.get("user");
    if (savedUser) {
      try {
        // Giải mã vì cookie thường encode các ký tự đặc biệt của JSON
        return JSON.parse(decodeURIComponent(savedUser));
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const login = useCallback((data: AuthResponse) => {
    const userStr = encodeURIComponent(JSON.stringify(data.user));

    // Lưu vào Cookie (Middleware sẽ đọc được cái này)
    Cookies.set("token", data.accessToken, { expires: 7 }); // Hết hạn sau 7 ngày
    Cookies.set("user", userStr, { expires: 7 });

    // Cập nhật State cho UI
    setToken(data.accessToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    // Xóa sạch Cookies
    Cookies.remove("token");
    Cookies.remove("user");

    setToken(null);
    setUser(null);

    const locale = pathname.split("/")[1] || "vi";
    window.location.href = `/${locale}/login`;
  }, [pathname]);

  return {
    user,
    token,
    isAuthenticated: !!token,
    isLoading: false, // Vì đọc cookie là đồng bộ, nên isLoading có thể để false
    login,
    logout,
  };
};
