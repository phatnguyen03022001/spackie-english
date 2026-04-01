/**
 * ==========================================
 * VOCABULARY FEATURE ENTRY POINT
 * ==========================================
 */

// 1. Schemas & Types
export * from "./schemas";
export * from "./types";

// 2. Dashboard Components
export { StatsOverview } from "./components/dashboard/stats-overview";
export { ReviewForecast } from "./components/dashboard/review-forecast";
export { LearningHeatmap } from "./components/dashboard/learning-heatmap";

// 3. Learning Components (Luồng học & Danh sách bộ thẻ đã tham gia)
export { ReviewSession } from "./components/learning/review-session";
export { ReviewCard } from "./components/learning/review-card";
export { SessionComplete } from "./components/learning/session-complete";
export { ExtraStudyModal } from "./components/learning/extra-study-modal";
export { ReviewProgress } from "./components/learning/review-progress";
export { ReviewActions } from "./components/learning/review-actions";

// 4. Management Components
export { DeckForm } from "./components/management/deck-form";
export { CardForm } from "./components/management/card-form";
export { CardManager } from "./components/management/card-manager";
export { DeckAnalytics } from "./components/management/deck-analytics";
export { BulkImportForm } from "./components/management/bulk-import-form";

// 5. Public Components
export { DeckDiscovery } from "./components/public/deck-discovery";
export { DeckPreview } from "./components/public/deck-preview";

// 6. Shared UI Components
export { AudioPlayer } from "./components/shared/audio-player";
export { CardBadge } from "./components/shared/card-badge";
export { MeaningDisplay } from "./components/shared/meaning-display";

// 7. Logic Hooks & Utils
export { useSm2Logic } from "./hooks/use-sm2-logic";
export { calculateSM2, determineCardStatus } from "./utils/srs-logic";

// 8. API Hooks (React Query)
export * from "./api/use-management";
export * from "./api/use-stats";
export * from "./api/use-learning";
export * from "./api/use-decks";
