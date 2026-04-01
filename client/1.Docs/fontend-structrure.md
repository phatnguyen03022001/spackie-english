====== NextJS ======
app/[locale]/(dashboard)/[role]/vocabulary/
├── page.tsx                    # Gọi: <StatsOverview />, <LearningHeatmap />, <ReviewForecast />, <EmptyState />
├── decks/                      
│   ├── page.tsx                # Gọi: <SearchBar />, <DeckDiscovery />
│   └── [deckId]/               
│       └── page.tsx            # Gọi: <DeckPreview />, <EnrollButton />
├── my-decks/                   
│   └── page.tsx                # Gọi: <EnrolledDeckList />, <UnenrollModal /> (API 4, 5)
├── review/                     
│   └── page.tsx                # Gọi: <SessionNavbar />, <ReviewProgress />, <ReviewSession />, 
│                               #      <ReviewCard />, <ReviewActions />, <SessionComplete />
└── manage/                     
    ├── page.tsx                # Gọi: <TeacherDeckList />, <CreateDeckModal /> (API 12, 13)
    ├── [deckId]/               
    │   └── page.tsx            # Gọi: <DeckAnalytics />, <CardManager />, <CardForm />, <DeckForm />
    └── import/                 
        └── page.tsx            # Gọi: <BulkImportForm />, <BulkImportStatus />


features/vocabulary/
├── api/                        # Quản lý 23 APIs theo vocab-docs (TanStack Query + Axios (@/lib/axios))
│   ├── use-management.ts       # Teacher/Admin APIs:
│   │   #1 POST /management/vocab/decks (create deck)
│   │   #2 GET /management/vocab/decks (get my decks)
│   │   #3 GET /management/vocab/decks/:id (deck details)
│   │   #4 PATCH /management/vocab/decks/:id (update deck metadata)
│   │   #5 DELETE /management/vocab/decks/:id (delete deck)
│   │   #6 PATCH /management/vocab/decks/:id/status (toggle public)
│   │   #7 POST /management/vocab/decks/:id/cards (add card)
│   │   #8 POST /management/vocab/decks/:id/cards/auto-bulk (bulk import)
│   │   #9 PATCH /management/vocab/cards/:cardId (update card)
│   │  #10 DELETE /management/vocab/cards/:cardId (delete card)
│   │  #11 GET /management/vocab/decks/:id/analytics (deck analytics)
│   ├── use-decks.ts            # Learner discovery/enroll APIs:
│   │  #12 GET /vocab/decks/public (public deck list)
│   │  #13 GET /vocab/decks/:id/preview (deck preview)
│   │  #14 POST /vocab/decks/:id/enroll (enroll deck)
│   │  #15 DELETE /vocab/decks/:id/unenroll (unenroll deck)
│   │  #16 GET /vocab/decks/enrolled (my enrolled decks)
│   │  #17 GET /vocab/reviews/today-count (due count)
│   ├── use-learning.ts         # Review session APIs:
│   │  #18 POST /vocab/reviews/session/start (start session)
│   │  #19 POST /vocab/reviews/session/sync (sync results)
│   │  #20 PATCH /vocab/reviews/session/:id/cancel (cancel session)
│   ├── use-stats.ts            # Stats + analytics APIs:
│   │  #21 GET /vocab/dashboard/stats (user stats)
│   │  #22 GET /vocab/reviews/forecast (review forecast)
│   │  #23 GET /vocab/dashboard/heatmap (learning heatmap)
│   ├── use-axios.ts            # exports preconfigured axios instance + interceptors
│   ├── use-zod-schemas.ts     # optional helper transform response validation
│   ├── use-api-types.ts       # Zod-built types for request/response
│   └── use-query-keys.ts      # TanStack Query constants for cache keys
│
│   # TanStack Query + Axios + Zod strategy
│   # - Axios config: ở modules/shared/api/axios.ts, set baseURL/auth headers/retry
│   # - Zod schemas: ở features/vocabulary/schemas/ (schema.ts cho each endpoint)
│   # - Api hooks: ở features/vocabulary/api/use-*.ts (useQuery/useMutation)
│   # - Transform: axiosResponse -> zodSchema.parse() tại các service layer (trong api hooks)
│
├── components/                 # UI chia theo nhóm chức năng
│   # Lưu ý: component `.tsx` UI nên dùng shadcn UI (@/components/ui/...) + màu đã được set sẵn trong globals.css
│   ├── dashboard/              # [API 9, 10, 11]
│   │   ├── stats-overview.tsx  
│   │   ├── review-forecast.tsx 
│   │   └── learning-heatmap.tsx
│   ├── learning/               # [API 6, 7, 8] - Chứa logic SM-2 FE [cite: 24]
│   │   ├── review-session.tsx  # Container điều khiển luồng học
│   │   ├── review-actions.tsx  # Nút bấm 1-5
│   │   ├── review-progress.tsx # Progress bar & Timer
│   │   ├── review-card.tsx     # Hiển thị Flashcard
│   │   ├── extra-study-modal.tsx    # Để chọn chế độ ôn tập thêm
│   │   └── session-complete.tsx    # Thêm nút "Review again" tại đây
│   ├── management/             # [API 12-21]
│   │   ├── deck-form.tsx       # Tạo/Sửa Deck [cite: 15]
│   │   ├── card-form.tsx       # Create/Edit individual card
│   │   ├── card-manager.tsx    # Danh sách & sửa Card [cite: 22]
│   │   ├── deck-analytics.tsx  # Analytics cho Teacher
│   │   └── bulk-import-form.tsx# Auto-import (API 19) 
│   ├── public/                 # [API 1, 2, 3]
│   │   ├── deck-discovery.tsx  
│   │   └── deck-preview.tsx    
│   └── shared/                 # Thư mục dùng chung
│       ├── audio-player.tsx     
│       ├── card-badge.tsx       
│       └── meaning-display.tsx
├── schemas/
│   └── index.ts         
├── hooks/                      
│   └── use-sm2-logic.ts        # Hook tính toán Interval, EF, Repetitions [cite: 10, 24]
├── utils/                      
│   └── srs-logic.ts            # Các hàm thuần (pure functions) cho SM-2
├── types/                      
│   └── index.ts                # DTO khớp với NestJS Prisma Shared
└── index.ts                    # Public entry point cho feature



## 📝 Note (cấu trúc + xử lý toast + no any)

### 1) API layer
- `features/vocabulary/api/*`:
  - `use-management.ts`, `use-decks.ts`, `use-learning.ts`, `use-stats.ts`

### 2) Axios
- `@/lib/axios`: pre-config (baseURL, auth header, retry/interceptor)

### 3) Zod
- schemas ở `features/vocabulary/schemas/*` (mỗi endpoint) 
- types ở `features/vocabulary/api/use-api-types.ts`:
  - `z.infer<typeof schema>`

### 4) TanStack Query
- `useQuery`, `useMutation` trong `features/vocabulary/api/use-*`
- key constants ở `use-query-keys.ts`

### 5) Toast
- centralized wrapper `features/vocabulary/hooks/use-toast.ts` (shadcn `use-toast`)
- gọi trong `onSuccess`, `onError` của mutation/query
- typed payload:
  ```ts
  export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

  export interface ToastPayload {
    title: string;
    description?: string;
    variant?: ToastVariant;
    durationMs?: number;
  }
  ```

### 6) UI
- `.tsx` nên dùng shadcn UI (`@/components/ui/...`)
- dùng màu chủ đạo từ `globals.css`

### 7) Không dùng `any`
- response type: `zod.infer`, không `any`
- error handler: `unknown` -> parse -> typed message
- toast helper: `ToastPayload` typed




