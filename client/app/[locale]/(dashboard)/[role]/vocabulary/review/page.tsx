import { redirect } from "next/navigation";
import { ReviewSession } from "@/features/vocabulary/components/learning/review-session";

interface ReviewPageProps {
  // Cả params và searchParams đều là Promise trong Next.js 15
  params: Promise<{
    locale: string;
    role: string;
  }>;
  searchParams: Promise<{
    deckId?: string;
    mode?: string;
  }>;
}

export default async function ReviewPage({ params, searchParams }: ReviewPageProps) {
  // Await song song để tối ưu hiệu năng (Parallel Data Fetching)
  const [{ locale, role }, { deckId, mode }] = await Promise.all([params, searchParams]);

  // 1. Bảo vệ route: Redirect về trang "My Decks" nếu thiếu deckId
  // Lưu ý: Redirect này sử dụng đúng locale và role hiện tại của user
  if (!deckId) {
    redirect(`/${locale}/${role}/vocabulary/my-decks`);
  }

  return (
    <main className="container max-w-5xl py-4 md:py-8 min-h-[calc(100vh-80px)] flex flex-col">
      {/* ReviewSession đảm nhận:
          - useStartSession (init dữ liệu SRS)
          - Hiển thị ReviewCard & ReviewActions
          - Áp dụng thuật toán SM-2 tại frontend
          - useSyncSession (đồng bộ kết quả khi hoàn thành)
      */}
      <ReviewSession
        key={`${deckId}-${mode}`}
        deckId={deckId}
        studyMode={mode as "all" | "hard" | "recent" | "preview"}
      />
    </main>
  );
}
