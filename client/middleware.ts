// middleware.ts
import createMiddleware from "next-intl/middleware";
import { routing } from "./lib/i18n/routing";
import { NextRequest, NextResponse } from "next/server";

const intlMiddleware = createMiddleware(routing);

// Các đường dẫn công khai (cho phép không cần đăng nhập)
const PUBLIC_PATHS = ["/about", "/privacy", "/terms", "/contact", "/help"];

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("token")?.value;
  const userCookie = req.cookies.get("user")?.value;
  const locale = pathname.split("/")[1] || "en";

  // Chỉ match chính xác các đường dẫn auth, không match con
  const authPaths = ["/login", "/register", "/forgot-password"];
  const isAuthPage = authPaths.some((p) => pathname === `/${locale}${p}` || pathname === `/${locale}${p}/`);
  const isVerifyPage = pathname.includes("/verify");
  const isLandingPage = routing.locales.some((l) => pathname === `/${l}` || pathname === `/${l}/`) || pathname === "/";
  const isPublicPage = PUBLIC_PATHS.some((p) => pathname === `/${locale}${p}` || pathname === `/${locale}${p}/`);

  if (token && userCookie) {
    try {
      const user = JSON.parse(decodeURIComponent(userCookie));
      const rolePath = user.role.toLowerCase(); // student, teacher, admin

      // Đã login mà vào auth page -> về dashboard
      if (isAuthPage) {
        return NextResponse.redirect(new URL(`/${locale}/${rolePath}`, req.url));
      }

      // Chặn truy cập vào role khác
      const otherRoles = ["student", "teacher", "admin"].filter((r) => r !== rolePath);
      const isAccessingWrongRole = otherRoles.some((r) => pathname.startsWith(`/${locale}/${r}`));
      if (isAccessingWrongRole) {
        return NextResponse.redirect(new URL(`/${locale}/${rolePath}`, req.url));
      }
    } catch {
      // Cookie hỏng -> xóa và redirect về login
      const response = NextResponse.redirect(new URL(`/${locale}/login`, req.url));
      response.cookies.delete("token");
      response.cookies.delete("user");
      return response;
    }
  } else {
    // Chưa đăng nhập: chỉ cho phép auth, landing, verify, public
    if (!isAuthPage && !isLandingPage && !isVerifyPage && !isPublicPage) {
      return NextResponse.redirect(new URL(`/${locale}/login`, req.url));
    }
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|apple-touch-icon.png|icons|home|fonts|system|android-chrome|site\\.webmanifest).*)",
  ],
};
