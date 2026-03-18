"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { UserRole } from "../types/auth.types";
import Cookies from "js-cookie";

export interface User {
  id: string;
  email: string;
  name?: string | null;
  role: UserRole;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: { accessToken: string; user: User }) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Tính toán trực tiếp trạng thái đăng nhập dựa trên token
  const isAuthenticated = !!token;

  useEffect(() => {
    const initializeAuth = () => {
      try {
        // Ưu tiên đọc từ Cookie để khớp với Middleware
        const storedToken = Cookies.get("token");
        const storedUser = Cookies.get("user");

        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(decodeURIComponent(storedUser)) as User;
          setToken(storedToken);
          setUser(parsedUser);
        }
      } catch (error) {
        console.error("Auth init error", error);
        // Nếu parse lỗi, hãy clear để tránh lỗi vòng lặp
        Cookies.remove("token");
        Cookies.remove("user");
      } finally {
        setIsLoading(false);
      }
    };
    initializeAuth();
  }, []);

  const login = (data: { accessToken: string; user: User }) => {
    const { accessToken, user } = data;
    const userStr = encodeURIComponent(JSON.stringify(user));

    // 1. Lưu Cookies cho Middleware (expires: 7 ngày)
    Cookies.set("token", accessToken, { expires: 7, path: "/" });
    Cookies.set("user", userStr, { expires: 7, path: "/" });

    // 2. Lưu LocalStorage dự phòng cho Client
    localStorage.setItem("token", accessToken);
    localStorage.setItem("user", JSON.stringify(user));

    // 3. Cập nhật State để UI re-render ngay lập tức
    setToken(accessToken);
    setUser(user);
  };

  const logout = () => {
    Cookies.remove("token", { path: "/" });
    Cookies.remove("user", { path: "/" });
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setToken(null);
    setUser(null);

    // Ép trình duyệt reload về trang login để xóa sạch cache state
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
