import { redirect } from "next/navigation";

interface Props {
  params: Promise<{
    locale: string;
    role: string;
  }>;
}

/**
 * Trang Dashboard mặc định cho từng Role.
 * Hiện tại, hệ thống tập trung vào tính năng Vocabulary,
 * nên chúng ta sẽ redirect người dùng trực tiếp vào trung tâm học liệu.
 */
export default async function RoleRootPage({ params }: Props) {
  const { locale, role } = await params;

  // Điều hướng tự động đến Vocabulary Dashboard
  redirect(`/${locale}/${role}/vocabulary`);

  // Lưu ý: Code dưới đây sẽ không chạy do lệnh redirect ở trên.
  // Nếu sau này bạn có thêm các module khác (ví dụ: /listening, /speaking),
  // bạn có thể xóa redirect và trả về một trang Hub tổng hợp tại đây.
  return null;
}
