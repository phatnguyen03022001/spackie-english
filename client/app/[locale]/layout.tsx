import type { Metadata } from "next";
import localFont from "next/font/local";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { Locale, routing } from "@/lib/i18n/routing"; // Import routing của bạn
import "@/styles/globals.css";

const googleSans = localFont({
  src: "../../public/fonts/google-sans-flex-latin-400-normal.woff2",
  weight: "400",
  style: "normal",
  variable: "--font-google-sans",
});

export const metadata: Metadata = {
  title: "English Learning Platform",
  description: "Learn English with AI-powered platform",
  // ... phần icon của bạn
};

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Xác thực locale
  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  // Lấy messages cho locale hiện tại
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${googleSans.variable} font-sans antialiased`}>
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
