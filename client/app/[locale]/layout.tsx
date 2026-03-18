import type { Metadata } from "next";
// 1. Import localFont thay cho Geist
import localFont from "next/font/local";
import "@/styles/globals.css";
import { AuthProvider } from "@/features/auth/hooks/useAuthContext";
import { Providers } from "@/lib/providers";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { Locale, routing } from "@/lib/i18n/routing";
import { Toaster } from "@/components/ui/sonner";

// 2. Định nghĩa Google Sans Flex
const googleSans = localFont({
  src: [
    {
      path: "../../public/fonts/google-sans-flex-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/google-sans-flex-vietnamese-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-google-sans",
});

export const metadata: Metadata = {
  title: "English Learning Platform",
  description: "Learn English with AI-powered platform",
};

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as Locale)) notFound();

  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      {/* 3. Thay đổi class ở body */}
      <body className={`${googleSans.variable} font-sans antialiased`}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            <AuthProvider>
              {children}
              <Toaster position="bottom-right" richColors />
            </AuthProvider>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
