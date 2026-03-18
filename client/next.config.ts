// next.config.ts
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin(
  "./lib/i18n/request.ts", // Đường dẫn đến file request config của bạn
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Các config khác của bạn (nếu có)
};

export default withNextIntl(nextConfig);
