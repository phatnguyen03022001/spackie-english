// ============================================================
// Prisma Schema – Spackie English (Anki + Paroto)
// DB      : MongoDB (Atlas) hoặc PostgreSQL (khuyến nghị nếu cần transaction)
// Updated : 2025-04-21 – Phiên bản 10/10 (hỗ trợ 11 modules)
//
// ⚠️ LƯU Ý QUAN TRỌNG VỚI MONGODB ATLAS FREE TIER (M0):
//   • KHÔNG hỗ trợ transaction.
//   • Các thao tác cần atomic (payment + subscription, tạo card + update deck count)
//     phải dùng idempotency key + cron job reconcile hoặc nâng lên M10+.
//   • Nếu dùng PostgreSQL, transaction hoạt động bình thường.
//
// Triết lý thiết kế:
//   • Ít model nhất có thể → gộp dữ liệu nhỏ vào Json/[]
//   • Chỉ 2 role: USER | ADMIN
//   • VIP qua Subscription + Payment (PayOS)
//   • SM-2 algorithm lưu trực tiếp trên CardProgress
//   • Notification config gộp vào User.settings (Json)
//   • OTP, session, notification log dùng Redis + OpenTelemetry
//   • Hỗ trợ listening (Paroto) qua ListeningPractice
// ============================================================

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mongodb" // hoặc "postgresql" nếu cần transaction
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────

enum Role {
  USER
  ADMIN
}

enum AuthProvider {
  LOCAL
  GOOGLE
  FACEBOOK
}

enum SubscriptionStatus {
  ACTIVE
  EXPIRED
  CANCELLED
}

enum PaymentStatus {
  PENDING
  SUCCESS
  FAILED
  CANCELLED
  REFUNDED
}

enum DeckVisibility {
  PRIVATE
  PUBLIC
}

enum CardRating {
  AGAIN   // 0 – quên hoàn toàn
  HARD    // 1 – khó
  GOOD    // 2 – nhớ được
  EASY    // 3 – dễ
}

enum FileRefType {
  AVATAR
  CARD_IMAGE
  CARD_AUDIO
  DECK_COVER
}

enum ListeningType {
  REPEAT        // nghe và nhắc lại
  DICTATION     // nghe và viết lại
  COMPREHENSION // trả lời câu hỏi sau khi nghe
}

// ─────────────────────────────────────────────
// MODEL: User
// Gộp: avatar URL, settings (reminder, theme, language)
// ─────────────────────────────────────────────

model User {
  id           String  @id @default(auto()) @map("_id") @db.ObjectId
  email        String  @unique
  username     String  @unique
  passwordHash String? // null nếu đăng nhập OAuth

  role       Role         @default(USER)
  provider   AuthProvider @default(LOCAL)
  providerId String?      // OAuth user ID

  avatarUrl   String?
  displayName String?
  isActive    Boolean @default(true)
  isVerified  Boolean @default(false)
  isBanned    Boolean @default(false)

  // settings JSON structure:
  // { reminderEnabled: true, reminderTime: "08:00", theme: "light", language: "vi", pushEnabled: true }
  // KHÔNG thể index trực tiếp trên JSON field trong MongoDB.
  // Nếu cần filter theo setting, hãy tách thành column riêng.
  settings Json @default("{}")

  // Denormalized stats (cập nhật qua event listener)
  totalCardsLearned Int       @default(0)
  currentStreak     Int       @default(0)
  longestStreak     Int       @default(0)
  lastStudiedAt     DateTime?

  // Relations
  subscription      Subscription?
  payments          Payment[]
  decks             Deck[]
  cardProgress      CardProgress[]
  files             File[]
  listeningPractices ListeningPractice[]
  adminDevices      AdminDevice[]

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime? // soft delete

  // Indexes (bỏ @@index([email]) vì email đã có @unique)
  @@index([provider, providerId])
  @@index([role])
  @@index([deletedAt])
  @@map("users")
}

// ─────────────────────────────────────────────
// MODEL: Subscription (1-1 với User)
// ─────────────────────────────────────────────

model Subscription {
  id     String @id @default(auto()) @map("_id") @db.ObjectId
  userId String @unique @db.ObjectId
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  status    SubscriptionStatus @default(EXPIRED)
  plan      String             @default("monthly") // "monthly" | "yearly"
  startedAt DateTime?
  expiresAt DateTime?

  // meta: { autoRenew: true, cancelReason: "price", source: "payos" }
  meta Json @default("{}")

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([status])
  @@index([expiresAt])
  @@map("subscriptions")
}

// ─────────────────────────────────────────────
// MODEL: Payment (mỗi lần thanh toán)
// ─────────────────────────────────────────────

model Payment {
  id     String @id @default(auto()) @map("_id") @db.ObjectId
  userId String @db.ObjectId
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  orderCode   String        @unique // PayOS order code
  amount      Int
  currency    String        @default("VND")
  description String?
  status      PaymentStatus @default(PENDING)
  provider    String        @default("payos")

  plan         String // "monthly" | "yearly"
  durationDays Int    // 30 | 365

  paidAt DateTime?

  // meta: { payosResponse: {...}, webhookPayload: {...}, returnUrl, cancelUrl }
  meta Json @default("{}")

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
  @@index([status])
  @@map("payments")
}

// ─────────────────────────────────────────────
// MODEL: Deck (bộ thẻ)
// ─────────────────────────────────────────────

model Deck {
  id     String @id @default(auto()) @map("_id") @db.ObjectId
  userId String @db.ObjectId
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  title       String
  description String?
  coverUrl    String?
  visibility  DeckVisibility @default(PRIVATE)
  tags        String[]       @default([]) // mảng string, đủ cho MVP
  isVipOnly   Boolean        @default(false)

  totalCards Int    @default(0)
  cards      Card[]

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  @@index([userId])
  @@index([visibility])
  @@index([tags])
  @@index([deletedAt])
  @@map("decks")
}

// ─────────────────────────────────────────────
// MODEL: Card (thẻ từ vựng)
// ─────────────────────────────────────────────

model Card {
  id     String @id @default(auto()) @map("_id") @db.ObjectId
  deckId String @db.ObjectId
  deck   Deck   @relation(fields: [deckId], references: [id], onDelete: Cascade)

  front    String
  back     String
  imageUrl String?
  audioUrl String?

  // extras: { pronunciation: "...", pos: "noun", examples: ["..."], hint: "...", expectedText: "..." }
  extras    Json  @default("{}")
  sortOrder Int   @default(0)

  cardProgress      CardProgress[]
  listeningPractices ListeningPractice[]

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  @@index([deckId])
  @@index([deletedAt])
  @@map("cards")
}

// ─────────────────────────────────────────────
// MODEL: CardProgress (SM-2 state per user per card)
// ─────────────────────────────────────────────

model CardProgress {
  id     String @id @default(auto()) @map("_id") @db.ObjectId
  userId String @db.ObjectId
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  cardId String @db.ObjectId
  card   Card   @relation(fields: [cardId], references: [id], onDelete: Cascade)

  // SM-2 fields
  easeFactor  Float    @default(2.5)
  interval    Int      @default(0)   // days
  repetitions Int      @default(0)
  dueDate     DateTime @default(now())

  lastRating  CardRating?
  reviewCount Int         @default(0)

  // recentReviews: array of { rating, reviewedAt, intervalBefore }
  // Giới hạn 50 bản ghi, do service code đảm bảo.
  recentReviews Json[] @default([])

  firstSeenAt  DateTime  @default(now())
  lastReviewAt DateTime?

  @@unique([userId, cardId])
  @@index([userId, dueDate]) // quan trọng: lấy thẻ cần ôn
  @@index([cardId])
  @@map("card_progress")
}

// ─────────────────────────────────────────────
// MODEL: File (quản lý file upload)
// ─────────────────────────────────────────────

model File {
  id     String @id @default(auto()) @map("_id") @db.ObjectId
  userId String @db.ObjectId
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  url          String
  publicId     String       @unique
  resourceType String // "image" | "video" | "raw"
  mimeType     String
  sizeBytes    Int
  refType      FileRefType? // avatar, card_image, card_audio, deck_cover
  refId        String?      @db.ObjectId // ID của User, Card, Deck (không có FK)

  // meta: { width, height, duration, format }
  meta Json @default("{}")

  createdAt DateTime @default(now())

  @@index([userId])
  @@index([refType, refId])
  @@map("files")
}

// ─────────────────────────────────────────────
// MODEL: ListeningPractice (lưu kết quả luyện nghe/nói)
// ─────────────────────────────────────────────

model ListeningPractice {
  id     String @id @default(auto()) @map("_id") @db.ObjectId
  userId String @db.ObjectId
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  cardId String @db.ObjectId
  card   Card   @relation(fields: [cardId], references: [id], onDelete: Cascade)

  type     ListeningType @default(REPEAT)
  score    Float  // 0-100 điểm tổng
  fluency  Float? // điểm trôi chảy (nếu có)
  accuracy Float? // điểm chính xác (nếu có)
  duration Int    // thời gian ghi âm (ms)

  // Client gửi kết quả dạng JSON (chi tiết: transcript, expectedText, wordErrors, device, browser, modelVersion...)
  result Json @default("{}")

  createdAt DateTime @default(now())

  @@unique([userId, cardId, createdAt]) // tránh duplicate cùng thời điểm
  @@index([userId, cardId])
  @@index([type])
  @@map("listening_practices")
}

// ─────────────────────────────────────────────
// MODEL: AdminDevice (quản lý thiết bị cho admin)
// ─────────────────────────────────────────────

model AdminDevice {
  id         String   @id @default(auto()) @map("_id") @db.ObjectId
  deviceId   String
  deviceName String?
  userId     String   @db.ObjectId
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  lastUsedAt DateTime?
  createdAt  DateTime @default(now())

  @@unique([userId, deviceId])
  @@map("admin_devices")
}

// ─────────────────────────────────────────────
// MODEL: Otp (lưu OTP hash cho forgot-password)
// ─────────────────────────────────────────────

model Otp {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  email     String
  otpHash   String   // bcrypt hash
  type      String   // "FORGOT_PASSWORD", "VERIFY_EMAIL"
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([email])
  @@map("otps")
}

// ─────────────────────────────────────────────
// (Tùy chọn) MODEL: Tag
// Nếu cần hệ thống tag chuyên nghiệp (có slug, mô tả, admin quản lý)
// Mở comment bên dưới và sửa model Deck để dùng quan hệ many-to-many.
// ─────────────────────────────────────────────
// model Tag {
//   id    String @id @default(auto()) @map("_id") @db.ObjectId
//   name  String @unique
//   slug  String @unique
//   description String?
//   decks Deck[] @relation("DeckToTag")
//   @@map("tags")
// }

// Nếu dùng Tag model, thêm vào Deck:
//   tagsRelation Tag[] @relation("DeckToTag")
// và bỏ field `tags String[]`