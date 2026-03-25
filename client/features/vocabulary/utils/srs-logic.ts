import { CardStatus } from "../types";

export const calculateSM2 = (
  quality: number, // 1: Again, 2: Hard, 3: Good, 4: Easy
  previousInterval: number,
  previousRepetition: number,
  previousEaseFactor: number,
) => {
  // Chuyển đổi quality 1-4 của bạn sang chuẩn SM-2 (0-5)
  // 1 (Again) -> 0 hoặc 1 (Rất tệ)
  // 2 (Hard)  -> 3 (Tạm ổn)
  // 3 (Good)  -> 4 (Tốt)
  // 4 (Easy)  -> 5 (Hoàn hảo)
  const q = quality === 1 ? 0 : quality + 1;

  let interval: number;
  let repetition: number;
  let easeFactor: number = previousEaseFactor;
  let status: CardStatus;

  if (quality >= 2) {
    // Hard (2), Good (3), Easy (4) -> Coi là pass
    if (quality === 2) status = CardStatus.LEARNING;
    else status = CardStatus.REVIEW;

    if (previousRepetition === 0) {
      interval = 1;
    } else if (previousRepetition === 1) {
      interval = 6;
    } else {
      // Hard thì tăng chậm hơn (factor thấp hơn EaseFactor gốc)
      const multiplier = quality === 2 ? 1.2 : easeFactor;
      interval = Math.round(previousInterval * multiplier);
    }
    repetition = previousRepetition + 1;
  } else {
    // Again (1) -> Thất bại
    status = CardStatus.LAPSED;
    repetition = 0;
    interval = 0;
  }

  // Thuật toán tính Ease Factor chuẩn SM-2
  // Công thức: EF' = EF + (0.1 - (5-q)*(0.08 + (5-q)*0.02))
  easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));

  // Không bao giờ để Ease Factor xuống dưới 1.3
  if (easeFactor < 1.3) easeFactor = 1.3;

  const nextReviewDate = new Date();

  if (interval === 0) {
    // Nếu học lại, trừ đi 1 phút để chắc chắn nó xuất hiện trong queue "cần học ngay"
    nextReviewDate.setMinutes(nextReviewDate.getMinutes() - 1);
  } else {
    nextReviewDate.setDate(nextReviewDate.getDate() + interval);
  }

  return {
    interval,
    repetition,
    easeFactor: Number(easeFactor.toFixed(2)), // Làm tròn cho đẹp database
    status,
    nextReview: nextReviewDate.toISOString(),
  };
};
