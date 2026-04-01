import { Card, CardStatus, SM2Result } from "../types";

/**
 * Thuật toán SM-2 (SuperMemo-2) tinh chỉnh
 * @param currentCard Thẻ hiện tại với các thông số SRS cũ
 * @param rating Đánh giá của người dùng từ 1-5
 */
export function calculateSM2(
  currentCard: Pick<Card, "interval" | "easeFactor" | "repetitions">,
  rating: number,
): SM2Result {
  let { interval, easeFactor, repetitions } = { ...currentCard };

  // 1. Xử lý trường hợp trả lời sai (Rating < 3)
  if (rating < 3) {
    repetitions = 0;
    interval = 1; // Quay lại ôn tập vào ngày mai
  } else {
    // 2. Xử lý trường hợp trả lời đúng (Rating >= 3)
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 3;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions++;
  }

  // 3. Cập nhật Ease Factor (EF) - Công thức chuẩn SM-2
  // EF không bao giờ thấp hơn 1.3
  easeFactor = easeFactor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  // 4. Tính toán ngày ôn tập tiếp theo
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);
  // Reset giờ về 0 để đồng bộ việc kiểm tra "due cards" theo ngày
  nextReview.setHours(0, 0, 0, 0);

  return {
    interval,
    easeFactor,
    repetitions,
    nextReview,
  };
}

/**
 * Xác định trạng thái mới của thẻ dựa trên Interval
 */
export function determineCardStatus(interval: number): CardStatus {
  if (interval === 0) return CardStatus.NEW;
  if (interval <= 3) return CardStatus.LEARNING;
  if (interval > 3 && interval < 30) return CardStatus.REVIEW;
  return CardStatus.MASTERED;
}
