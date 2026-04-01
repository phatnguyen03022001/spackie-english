Tôi đã kiểm tra và cập nhật file markdown để khớp với code hiện tại. Dưới đây là phiên bản đã sửa, với các điều chỉnh chính:

- **Enroll Deck** response có thêm `updated`.
- **Sync Session** chỉ yêu cầu gửi `cardId` và `rating` (các trường khác server tự tính).
- **Mode** trong `CreateSessionDto` được định nghĩa rõ bằng enum.
- **Heatmap** ghi chú rằng tính trên tất cả session đã kết thúc (không giới hạn ngày).
- Các mô tả khác giữ nguyên vì đã phù hợp.

```markdown
# API Documentation – Vocab Module (cập nhật)

Hệ thống từ vựng được chia làm hai nhóm API:

- **Management APIs** (dành cho giáo viên/ admin): quản lý bộ thẻ (deck), thêm từ, chỉnh sửa, xóa.
- **Review APIs** (dành cho học viên): đăng ký bộ thẻ, học tập (session), đồng bộ kết quả, thống kê cá nhân.

Tất cả các endpoint yêu cầu **xác thực** qua JWT. Vai trò người dùng (`UserRole`) được kiểm tra bằng decorator `@Roles()`.

---

## 📦 Base URL

```
http(s)://your-domain.com/api
```

---

## 🔐 Authentication

Header:
```
Authorization: Bearer <access_token>
```

---

## 🧠 Common DTOs & Enums

### `CardStatus`
- `NEW` – Chưa học
- `LEARNING` – Đang học (interval ngắn)
- `REVIEW` – Ôn tập
- `MASTERED` – Đã thành thạo

### `DifficultyLevel` (deck)
- `BEGINNER`, `INTERMEDIATE`, `ADVANCED`, `EXAM_PREP`, `COMMUNICATION`

### `UserRole`
- `STUDENT`, `TEACHER`, `ADMIN`

### `SessionMode` (cho `CreateSessionDto`)
- `default` – thẻ mới + thẻ đến hạn
- `all` – tất cả thẻ trong deck (tối đa 50)
- `hard` – thẻ có `easeFactor < 2.3`
- `recent` – thẻ được ôn trong 24h qua
- `preview` – chỉ thẻ mới (`NEW`)

---

## 🧑‍🏫 Management APIs (Teacher / Admin)

### 1. Tạo bộ thẻ (deck)

**Endpoint:** `POST /management/vocab/decks`  
**Roles:** `TEACHER`, `ADMIN`  
**Request body:** `CreateDeckDto`

```json
{
  "title": "IELTS Essential Words",
  "description": "Common words for IELTS exam",
  "isPublic": false,
  "levelTag": "EXAM_PREP"
}
```

**Response:** `DeckResponseDto`

```json
{
  "id": "deckId",
  "title": "IELTS Essential Words",
  "description": "Common words for IELTS exam",
  "isPublic": false,
  "levelTag": "EXAM_PREP",
  "creatorId": "userId",
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": null
}
```

---

### 2. Lấy danh sách bộ thẻ của tôi

**Endpoint:** `GET /management/vocab/decks`  
**Roles:** `TEACHER`, `ADMIN`  
**Response:** Mảng `DeckResponseDto` kèm theo `_count.cards`

---

### 3. Xem chi tiết bộ thẻ (kèm danh sách thẻ)

**Endpoint:** `GET /management/vocab/decks/:id`  
**Roles:** `TEACHER`, `ADMIN`  
**Path param:** `id` (ObjectId)  
**Response:** `DeckResponseDto` với `cards` array (mỗi card có `word` embedded)

---

### 4. Cập nhật thông tin bộ thẻ

**Endpoint:** `PATCH /management/vocab/decks/:id`  
**Roles:** `TEACHER`, `ADMIN` (chỉ chủ sở hữu)  
**Body:** `UpdateDeckDto` (các trường optional)

```json
{
  "title": "New Title",
  "description": "Updated description",
  "levelTag": "ADVANCED"
}
```

**Response:** `DeckResponseDto`

---

### 5. Công khai / ẩn bộ thẻ

**Endpoint:** `PATCH /management/vocab/decks/:id/status`  
**Roles:** `TEACHER`, `ADMIN` (chủ sở hữu hoặc admin)  
**Body:** `{ "isPublic": true }`  
**Response:** `DeckResponseDto`

---

### 6. Xóa bộ thẻ (master deck)

**Endpoint:** `DELETE /management/vocab/decks/:id`  
**Roles:** `TEACHER`, `ADMIN` (chủ sở hữu)  
**Action:** Xóa toàn bộ card của **user hiện tại** trong deck đó, sau đó xóa deck. Cập nhật lại `UserStats` (giảm số từ tương ứng). Các card của người dùng khác không bị ảnh hưởng (chỉ set `deckId = null`).  
**Response:** `{ "success": true }`

---

### 7. Thêm thẻ thủ công (tạo từ mới)

**Endpoint:** `POST /management/vocab/decks/:id/cards`  
**Roles:** `TEACHER`, `ADMIN` (chủ deck)  
**Body:** `CreateWordDto`

```json
{
  "word": "persevere",
  "phonetic": "/ˌpɜː.sɪˈvɪər/",
  "audioUrl": "https://...",
  "meanings": [
    {
      "partOfSpeech": "verb",
      "definitions": [
        {
          "definition": "To persist in spite of opposition",
          "example": "She persevered in her studies.",
          "synonyms": ["persist", "continue"],
          "antonyms": ["give up"]
        }
      ]
    }
  ]
}
```

**Response:** `CardResponseDto` (kèm word)

---

### 8. Thêm thẻ từ word đã có trong kho

**Endpoint:** `POST /management/vocab/decks/:id/cards/from-word`  
**Roles:** `TEACHER`, `ADMIN` (chủ deck)  
**Body:** `CreateCardWithWordIdDto`

```json
{
  "wordId": "existingWordId"
}
```

**Response:** `CardResponseDto`

---

### 9. Bulk import từ tự động dịch

**Endpoint:** `POST /management/vocab/decks/:id/cards/auto-bulk`  
**Roles:** `TEACHER`, `ADMIN` (chủ deck)  
**Body:** `BulkCreateCardsDto`

```json
{
  "words": ["apple", "banana", "courage"]
}
```

**Action:**  
- Chuẩn hóa danh sách từ, lấy bản dịch tiếng Việt (MyMemory API) và thông tin từ điển (DictionaryAPI).  
- Tạo từ mới (nếu chưa có).  
- Tạo card cho user nếu chưa có.  
- Cập nhật `UserStats.totalWords`.

**Response:**

```json
{
  "success": true,
  "addedCount": 3
}
```

---

### 10. Cập nhật thẻ (di chuyển deck, thay đổi status)

**Endpoint:** `PATCH /management/vocab/cards/:cardId`  
**Roles:** `TEACHER`, `ADMIN` (chủ sở hữu)  
**Body:** `UpdateCardDto`

```json
{
  "deckId": "newDeckId",
  "status": "REVIEW"
}
```

**Response:** `CardResponseDto`

---

### 11. Xóa thẻ

**Endpoint:** `DELETE /management/vocab/cards/:cardId`  
**Roles:** `TEACHER`, `ADMIN` (chủ sở hữu)  
**Action:** Xóa card, cập nhật lại `UserStats` (giảm `totalWords`, `learnedWords`, `masteredWords` tùy trạng thái cũ).  
**Response:** `{ "success": true }`

---

### 12. Xem phân tích deck (thống kê cơ bản)

**Endpoint:** `GET /management/vocab/decks/:id/analytics`  
**Roles:** `TEACHER`, `ADMIN` (chủ sở hữu)  
**Response:**

```json
{
  "totalCards": 50,
  "masteredCards": 20,
  "progress": 40
}
```

---

## 📖 Review APIs (Student & General)

### 1. Lấy danh sách deck công khai (có phân trang)

**Endpoint:** `GET /vocab/decks/public`  
**Query params:**  
- `search` (string, optional) – tìm kiếm theo tiêu đề  
- `tag` (DifficultyLevel, optional) – lọc theo độ khó  
- `page` (number, default 1)  
- `limit` (number, default 10)  

**Response:**

```json
{
  "items": [
    {
      "id": "deckId",
      "title": "IELTS Essential",
      "isPublic": true,
      "levelTag": "EXAM_PREP",
      "_count": { "cards": 120 },
      "creator": { "id": "userId", "name": "John", "avatar": null },
      "isEnrolled": false
    }
  ],
  "meta": {
    "total": 25,
    "page": 1,
    "lastPage": 3
  }
}
```

---

### 2. Xem trước một deck công khai (kèm danh sách thẻ mẫu)

**Endpoint:** `GET /vocab/decks/:id/preview`  
**Path param:** `id`  
**Response:** `DeckResponseDto` với `cards` (tối đa 10 card), `isEnrolled`, `creator`, `_count`.

---

### 3. Đăng ký học một bộ thẻ

**Endpoint:** `POST /vocab/decks/:id/enroll`  
**Action:**  
- Kiểm tra deck tồn tại và công khai.  
- Lấy tất cả `wordId` từ deck.  
- Nếu user đã có card cho từ nào (từ deck khác), cập nhật `deckId` của card đó vào deck mới.  
- Tạo card mới cho những từ chưa có.  
- Cập nhật `UserStats.totalWords` (chỉ tăng cho số card mới).  

**Response:**

```json
{
  "message": "Đã thêm 20 từ mới và cập nhật 5 từ đã có",
  "added": 20,
  "updated": 5
}
```

---

### 4. Hủy đăng ký bộ thẻ

**Endpoint:** `DELETE /vocab/decks/:id/unenroll`  
**Action:** Xóa tất cả card của user thuộc deck đó, cập nhật `UserStats` (giảm `totalWords`, `learnedWords`, `masteredWords` tương ứng).  
**Response:** `{ "success": true }`

---

### 5. Lấy danh sách bộ thẻ đã đăng ký

**Endpoint:** `GET /vocab/decks/enrolled`  
**Response:** Mảng `DeckResponseDto` với `_count.cards`.

---

### 6. Đếm số thẻ đến hạn ôn tập hôm nay

**Endpoint:** `GET /vocab/reviews/today-count`  
**Response:**

```json
{
  "dueCount": 15
}
```

---

### 7. Bắt đầu một phiên học (session)

**Endpoint:** `POST /vocab/reviews/session/start`  
**Body:** `CreateSessionDto`

```json
{
  "deckId": "deckId",
  "mode": "default"
}
```

**Các mode:** `default`, `all`, `hard`, `recent`, `preview` (xem định nghĩa ở phần Common DTOs).  

**Response:**

```json
{
  "sessionId": "sessionId",
  "cards": [ ... ]  // mảng CardResponseDto
}
```

---

### 8. Đồng bộ kết quả học tập sau phiên

**Endpoint:** `POST /vocab/reviews/session/sync`  
**Body:** `SyncSessionDto` – **chỉ cần gửi** `sessionId`, `deckId`, `minutesSpent` (tùy chọn) và mảng `results` với `cardId` và `rating` (1-4). Server tự tính toán SM‑2.

```json
{
  "sessionId": "sessionId",
  "deckId": "deckId",
  "minutesSpent": 10,
  "results": [
    {
      "cardId": "cardId",
      "rating": 3
    }
  ]
}
```

**Action (trong transaction):**  
- Tính lại `easeFactor`, `interval`, `repetitions`, `status`, `nextReview` dựa trên rating hiện tại và dữ liệu cũ.  
- Cập nhật card và tạo `ReviewLog`.  
- Cập nhật `LearningSession` (endTime, cardsProcessed, minutesSpent, rawResults).  
- Cập nhật `UserStats` (tăng `totalReviews`, `learnedWords` nếu lần đầu học, `masteredWords` nếu vừa đạt MASTERED).  

**Response:**

```json
{
  "success": true,
  "processed": 5
}
```

---

### 9. Hủy session (kết thúc sớm)

**Endpoint:** `PATCH /vocab/reviews/session/:id/cancel`  
**Path param:** `id` (sessionId)  
**Action:** Cập nhật `endTime = now`.  
**Response:** `LearningSessionDto`

---

### 10. Lấy thống kê tổng quan (dashboard)

**Endpoint:** `GET /vocab/dashboard/stats`  
**Response:** `UserStatsResponseDto`

```json
{
  "totalWords": 200,
  "learnedWords": 80,
  "masteredWords": 30,
  "totalReviews": 450,
  "lastStudyDate": null
}
```

---

### 11. Dự báo số lượng thẻ đến hạn theo ngày

**Endpoint:** `GET /vocab/reviews/forecast`  
**Response:** Object key là ngày (YYYY-MM-DD), value là số lượng thẻ.

```json
{
  "2023-01-15": 12,
  "2023-01-16": 8
}
```

---

### 12. Lấy heatmap (tần suất học)

**Endpoint:** `GET /vocab/dashboard/heatmap`  
**Response:** Tương tự forecast nhưng dựa trên `cardsProcessed` của các `LearningSession` đã kết thúc (không giới hạn thời gian).

---

## ⚙️ SM‑2 Algorithm Notes

- **Rating:** 1 = Again, 2 = Hard, 3 = Good, 4 = Easy.
- **Ease factor:** được điều chỉnh dựa trên rating.
- **Interval:** được tính dựa trên `easeFactor` và `repetitions` (theo công thức SM‑2).
- **Server‑side:** Tất cả tính toán được thực hiện trên server, client chỉ gửi `rating`. Điều này đảm bảo tính nhất quán và ngăn chặn gian lận.

---

## 🗃️ Các lưu ý quan trọng

- **MongoDB ObjectId:** tất cả các ID trong request (path, body) phải là ObjectId hợp lệ, nếu không sẽ bị lỗi 400.
- **Transaction:** các thao tác liên quan đến nhiều bảng (xóa deck, đồng bộ session) đều được bọc trong transaction để đảm bảo tính nhất quán.
- **UserStats:** luôn được tạo tự động khi user có card đầu tiên. Mọi thay đổi về số lượng card đều cập nhật `UserStats`.
- **Bulk import:** giới hạn tối đa 30 từ mỗi lần.
- **API lỗi:** hệ thống trả về mã lỗi chuẩn HTTP kèm message (ví dụ: 404 Not Found, 409 Conflict).

---

## 📚 Tham khảo thêm

- [SM‑2 Algorithm](https://en.wikipedia.org/wiki/SuperMemo#SM-2)
- [MyMemory Translation API](https://mymemory.translated.net/doc/spec.php)
- [Free Dictionary API](https://dictionaryapi.dev/)
```

File này đã phản ánh đúng các thay đổi trong code hiện tại. Bạn có thể sử dụng để tích hợp front-end hoặc làm tài liệu nội bộ.