import axios from "axios";
import Cookies from "js-cookie";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

apiClient.interceptors.request.use(
  async (config) => {
    let token: string | undefined;

    // KIỂM TRA MÔI TRƯỜNG
    if (typeof window === "undefined") {
      // 1. Đang chạy trên SERVER (Next.js Server Component)
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      token = cookieStore.get("token")?.value;
    } else {
      // 2. Đang chạy trên CLIENT (Browser)
      token = Cookies.get("token");
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        // Lưu ý: Tên cookie phải thống nhất (token hay accessToken?)
        Cookies.remove("token");
        localStorage.removeItem("user");
        window.dispatchEvent(new Event("auth-expired"));
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;
