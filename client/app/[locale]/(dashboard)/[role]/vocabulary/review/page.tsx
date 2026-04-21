import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ReviewSession } from "@/features/vocabulary/components/learning/review-session";
import { SessionMode } from "@/features/vocabulary/types";
import { Skeleton } from "@/components/ui/skeleton"; // Import theo mục 4.2

interface ReviewPageProps {
  params: Promise<{ locale: string; role: string }>;
  searchParams: Promise<{ deckId?: string; mode?: string }>;
}

/**
 * Loading component tuân thủ phong cách thiết kế
 */
function ReviewLoading() {
  return (
    <div className="space-y-6 w-full max-w-2xl mx-auto pt-12">
      <Skeleton className="h-100 w-full rounded-4xl" />
      <div className="flex justify-center gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-14 w-20 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default async function ReviewPage({ params, searchParams }: ReviewPageProps) {
  const [{ locale, role }, { deckId, mode }] = await Promise.all([params, searchParams]);

  // Bảo vệ route theo cấu trúc thư mục chuẩn
  if (!deckId) {
    redirect(`/${locale}/${role}/vocabulary/decks`);
  }

  return (
    // Dùng container mx-auto để căn giữa chuẩn theo mục 8.1
    <main className="flex flex-col items-center">
      <Suspense fallback={<ReviewLoading />}>
        <ReviewSession key={`${deckId}-${mode}`} deckId={deckId} studyMode={(mode as SessionMode) || "srs"} />
      </Suspense>
    </main>
  );
}
