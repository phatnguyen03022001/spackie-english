import createMiddleware from "next-intl/middleware";
import { routing } from "./lib/i18n/routing";
import { NextRequest, NextResponse } from "next/server";

const intlMiddleware = createMiddleware(routing);

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("token")?.value;
  const userCookie = req.cookies.get("user")?.value;

  const locale = pathname.split("/")[1] || "en";

  // 1. Định nghĩa các nhóm trang
  const isAuthPage =
    pathname.includes("/login") || pathname.includes("/register") || pathname.includes("/forgot-password");

  const isLandingPage = routing.locales.some((l) => pathname === `/${l}` || pathname === `/${l}/` || pathname === "/");

  const isVerifyPage = pathname.includes("/verify");

  // --- LOGIC CHÍNH ---

  // TRƯỜNG HỢP A: ĐÃ ĐĂNG NHẬP
  if (token && userCookie) {
    try {
      const user = JSON.parse(decodeURIComponent(userCookie));
      const rolePath = user.role.toLowerCase();

      // Nếu đã đăng nhập mà cố vào trang Auth (Login/Register) -> Đẩy về Dashboard theo Role
      if (isAuthPage) {
        return NextResponse.redirect(new URL(`/${locale}/${rolePath}`, req.url));
      }

      // PHÂN QUYỀN (RBAC): Chặn chéo giữa các Role
      if (user.role === "STUDENT" && (pathname.includes("/teacher") || pathname.includes("/admin"))) {
        return NextResponse.redirect(new URL(`/${locale}/student`, req.url));
      }

      if (user.role === "TEACHER" && pathname.includes("/admin")) {
        return NextResponse.redirect(new URL(`/${locale}/teacher`, req.url));
      }
    } catch (err) {
      console.log(err);
      // Nếu Cookie hỏng, xóa sạch và bắt đăng nhập lại
      const response = NextResponse.redirect(new URL(`/${locale}/login`, req.url));
      response.cookies.delete("token");
      response.cookies.delete("user");
      return response;
    }
  }

  // TRƯỜNG HỢP B: CHƯA ĐĂNG NHẬP
  else if (!isAuthPage && !isLandingPage && !isVerifyPage) {
    // Nếu chưa đăng nhập mà vào trang cần bảo vệ -> Đẩy về Login
    return NextResponse.redirect(new URL(`/${locale}/login`, req.url));
  }

  // Cuối cùng: Chạy xử lý đa ngôn ngữ của next-intl
  return intlMiddleware(req);
}

export const config = {
  matcher: [
    // Loại trừ các file tĩnh và folder 'system' để ảnh 404 có thể load
    "/((?!api|_next/static|_next/image|favicon.ico|apple-touch-icon.png|icons|home|fonts|system|android-chrome|site\\.webmanifest).*)",
  ],
};
