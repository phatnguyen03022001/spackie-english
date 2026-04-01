import axios from "axios";
import Cookies from "js-cookie";

const apiClient = axios.create({
  // Sử dụng biến môi trường công khai cho Client
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  // ✅ Thay localStorage bằng Cookies.get
  // "token" phải khớp với name bạn đã set khi Login/Verify thành công
  const token = Cookies.get("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Bạn có thể thêm Interceptor cho Response để xử lý lỗi 401 (Hết hạn token)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Ví dụ: Xóa cookie và đẩy về trang login nếu cần
      Cookies.remove("token");
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default apiClient;
