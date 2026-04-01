

# Vocabulary Pages – Mô tả và Hướng dẫn (Đã điều chỉnh theo backend refactor)

Tài liệu này mô tả chi tiết từng trang (page) trong module từ vựng, bao gồm URL, mục đích, đầu vào (params, searchParams), các component được sử dụng và các API hooks cần gọi. Các thay đổi phản ánh việc backend đã tách model `Word` riêng, và chỉ cho phép cập nhật một số trường của `Card` (deckId, status). Nếu cần chỉnh sửa nội dung từ vựng, cần có endpoint riêng cho `Word` (hiện tại chưa có, nhưng có thể bổ sung sau).

---

## 1. Trang chủ từ vựng (Dashboard tổng quan)
**Đường dẫn:** `/[locale]/(dashboard)/[role]/vocabulary/page.tsx`  

**Mục đích:**  
Hiển thị tổng quan về hoạt động học tập của người dùng: số liệu thống kê (tổng số từ, tỷ lệ thuộc bài, …), biểu đồ nhiệt học tập, dự báo ôn tập trong 7 ngày tới.

**Đầu vào:**  
- `params`: `{ locale: string, role: 'student'|'teacher'|'admin' }`  
- `searchParams`: không sử dụng.

**Components:**  
- `StatsOverview` – từ `@/features/vocabulary/components/dashboard/stats-overview`  
- `ReviewForecast` – từ `@/features/vocabulary/components/dashboard/review-forecast`  
- `LearningHeatmap` – từ `@/features/vocabulary/components/dashboard/learning-heatmap`  
- Có thể dùng `EmptyState` nếu không có dữ liệu.

**API hooks:**  
- `useUserStats` – lấy tổng quan (totalWords, learnedWords, masteredWords, …)  
- `useReviewForecast` – lấy dự báo ôn tập (Record<string, number>)  
- `useHeatmap` – lấy dữ liệu biểu đồ nhiệt  

**Quyền:**  
Tất cả các role đều có thể truy cập; nội dung phù hợp với từng role (ví dụ: teacher có thể thấy thêm các bộ thẻ của mình).

---

## 2. Danh sách bộ thẻ công khai (Public Decks)
**Đường dẫn:** `/[locale]/(dashboard)/[role]/vocabulary/decks/page.tsx`  

**Mục đích:**  
Hiển thị danh sách các bộ thẻ công khai (public decks) cho phép người dùng tìm kiếm, lọc theo trình độ, và đăng ký học.

**Đầu vào:**  
- `params`: `{ locale, role }`  
- `searchParams`: `{ page?: number, level?: DifficultyLevel, search?: string }`

**Components:**  
- `DeckDiscovery` – hiển thị danh sách bộ thẻ dạng grid  
- `SearchBar` (có thể tái sử dụng hoặc tích hợp sẵn trong page)

**API hooks:**  
- `usePublicDecks` – gọi `GET /vocab/decks/public` với các filter

**Quyền:**  
Tất cả các role đều xem được. Nút "Đăng ký" chỉ xuất hiện khi người dùng chưa đăng ký bộ thẻ đó.

---

## 3. Xem trước bộ thẻ (Deck Preview)
**Đường dẫn:** `/[locale]/(dashboard)/[role]/vocabulary/decks/[deckId]/page.tsx`  

**Mục đích:**  
Hiển thị thông tin chi tiết của một bộ thẻ công khai, cho phép xem trước các thẻ (tối đa 10) và đăng ký học.

**Đầu vào:**  
- `params`: `{ locale, role, deckId: string }`  
- `searchParams`: không sử dụng.

**Components:**  
- `DeckPreview` – hiển thị thông tin bộ thẻ và nút đăng ký  
- Có thể dùng `EnrollButton` riêng (nhưng trong `DeckPreview` đã tích hợp sẵn)

**API hooks:**  
- `useDeckPreview` – gọi `GET /vocab/decks/:id/preview`  
- `useEnrollDeck` – gọi `POST /vocab/decks/:id/enroll` (khi người dùng nhấn nút)

**Quyền:**  
Mọi người đều xem được. Chỉ người dùng đã đăng nhập mới có thể đăng ký.

---

## 4. Danh sách bộ thẻ đã đăng ký (Enrolled Decks)
**Đường dẫn:** `/[locale]/(dashboard)/[role]/vocabulary/my-decks/page.tsx`  

**Mục đích:**  
Hiển thị các bộ thẻ mà người dùng đã đăng ký, kèm theo tiến độ học (số thẻ đã thành thạo, số thẻ đến hạn). Cho phép hủy đăng ký (unenroll) một bộ thẻ.

**Đầu vào:**  
- `params`: `{ locale, role }`  
- `searchParams`: không sử dụng.

**Components:**  
- `EnrolledDeckList` – danh sách bộ thẻ đã đăng ký (có thể là component riêng)  
- `UnenrollModal` – modal xác nhận hủy đăng ký

**API hooks:**  
- `useEnrolledDecks` – gọi `GET /vocab/decks/enrolled`  
- `useUnenrollDeck` – gọi `DELETE /vocab/decks/:id/unenroll`

**Quyền:**  
Chỉ người dùng đã đăng nhập. Nếu role là `teacher`, vẫn hiển thị các bộ thẻ đã đăng ký của riêng họ.

---

## 5. Phiên học (Review Session)
**Đường dẫn:** `/[locale]/(dashboard)/[role]/vocabulary/review/page.tsx`  

**Mục đích:**  
Thực hiện phiên học theo lịch trình SRS. Học các thẻ đến hạn, áp dụng SM-2 tại frontend, sau đó đồng bộ kết quả về backend.

**Đầu vào:**  
- `params`: `{ locale, role }`  
- `searchParams`: `{ deckId?: string, mode?: 'all' | 'hard' | 'recent' | 'preview' }` (mode dùng cho "Review again")

**Components:**  
- `ReviewSession` – container chính điều khiển luồng học  
- `ReviewProgress`, `ReviewActions`, `ReviewCard`, `SessionComplete`, `ExtraStudyModal` (các component được sử dụng bên trong)

**API hooks:**  
- `useStartSession` – gọi `POST /vocab/reviews/session/start`  
- `useSyncSession` – gọi `POST /vocab/reviews/session/sync`  
- `useCancelSession` – nếu người dùng thoát giữa chừng (không bắt buộc)

**Quyền:**  
Chỉ người dùng đã đăng nhập. Nếu `deckId` không được cung cấp, có thể hiển thị danh sách bộ thẻ có thẻ đến hạn để chọn.

---

## 6. Quản lý bộ thẻ (Teacher – danh sách)
**Đường dẫn:** `/[locale]/(dashboard)/[role]/vocabulary/manage/page.tsx`  

**Mục đích:**  
Hiển thị danh sách các bộ thẻ do giáo viên tạo ra. Cho phép tạo mới, sửa, xóa, công khai/riêng tư bộ thẻ.

**Đầu vào:**  
- `params`: `{ locale, role }` (yêu cầu `role === 'teacher'` hoặc `'admin'`)  
- `searchParams`: không sử dụng.

**Components:**  
- `TeacherDeckList` – hiển thị danh sách bộ thẻ dưới dạng bảng  
- `CreateDeckModal` – modal chứa `DeckForm` để tạo mới

**API hooks:**  
- `useMyDecks` – gọi `GET /management/vocab/decks`  
- `useDeleteDeck`, `useUpdateDeck`, `useTogglePublicStatus`

**Quyền:**  
Chỉ teacher hoặc admin.

---

## 7. Quản lý chi tiết một bộ thẻ (Teacher – nội dung bộ thẻ)
**Đường dẫn:** `/[locale]/(dashboard)/[role]/vocabulary/manage/[deckId]/page.tsx`  

**Mục đích:**  
Xem và chỉnh sửa nội dung của một bộ thẻ cụ thể: metadata, danh sách thẻ, thêm/sửa/xóa thẻ, import hàng loạt, xem thống kê.

**Điều chỉnh quan trọng:**  
- Do backend tách `Word` riêng, việc chỉnh sửa nội dung từ vựng (từ, phiên âm, nghĩa) hiện chưa được hỗ trợ qua `PATCH /management/vocab/cards/:cardId`.  
- Nếu cần teacher chỉnh sửa nội dung từ vựng, cần có endpoint riêng cho `Word` (ví dụ `PATCH /vocab/words/:wordId`). Trong tài liệu này, tạm thời giả định endpoint đó có sẵn. Nếu chưa có, UI sẽ không hiển thị form sửa nội dung từ, chỉ hiển thị dạng read-only, và cho phép xóa thẻ, di chuyển thẻ sang deck khác, hoặc thêm mới từ.

**Đầu vào:**  
- `params`: `{ locale, role, deckId: string }`  
- `searchParams`: không sử dụng.

**Components:**  
- `DeckForm` – chỉnh sửa thông tin bộ thẻ (title, description, level, public)  
- `CardManager` – quản lý danh sách thẻ. **Sửa lại để phù hợp**:  
  - Hiển thị mỗi thẻ kèm từ vựng, phiên âm, nghĩa (lấy từ `word` relation).  
  - Các hành động: **Xóa thẻ**, **Di chuyển thẻ sang deck khác** (cập nhật `deckId` của `Card`).  
  - Nếu có endpoint chỉnh sửa từ vựng, có thể thêm nút **Sửa từ** mở modal `WordForm` (gọi API `PATCH /vocab/words/:wordId`).  
  - Nếu không, chỉ hiển thị read-only và chỉ cho phép xóa/di chuyển.  
- `DeckAnalytics` – hiển thị thống kê cho bộ thẻ  
- `BulkImportForm` – form nhập danh sách từ để import tự động (tạo word và card)

**API hooks:**  
- `useDeckDetails` – lấy metadata + danh sách thẻ (kèm `word` relation)  
- `useDeckAnalytics` – lấy thống kê  
- `useAddCard` – gọi `POST /management/vocab/decks/:deckId/cards` (tạo word mới + card)  
- `useUpdateCard` – chỉ dùng để cập nhật `deckId` và `status` (nếu có chức năng di chuyển thẻ)  
- `useDeleteCard` – xóa card  
- `useBulkImport` – import hàng loạt  
- (Optional) `useUpdateWord` – nếu có endpoint chỉnh sửa từ vựng

**Quyền:**  
Chỉ teacher hoặc admin là chủ sở hữu bộ thẻ.

---

## 8. Import hàng loạt (Teacher – Bulk Import)
**Đường dẫn:** `/[locale]/(dashboard)/[role]/vocabulary/manage/import/page.tsx`  

**Mục đích:**  
Cung cấp giao diện nhập danh sách từ (mỗi dòng một từ) để tự động tạo thẻ với AI (tra cứu nghĩa, phiên âm, ví dụ). Tạo word và card đồng thời.

**Đầu vào:**  
- `params`: `{ locale, role }`  
- `searchParams`: `{ deckId?: string }` – xác định bộ thẻ đang import vào

**Components:**  
- `BulkImportForm` – form nhập liệu (sử dụng `useBulkImport`)

**API hooks:**  
- `useBulkImport` – gọi `POST /management/vocab/decks/:id/cards/auto-bulk`

**Quyền:**  
Chỉ teacher hoặc admin.

---

## Lưu ý chung

- **Layout:** Tất cả các trang đều nằm trong `(dashboard)/layout.tsx` và `[role]/layout.tsx` (nếu có).  
- **Bảo vệ route:** Middleware kiểm tra authentication và role trước khi cho phép truy cập.  
- **Đa ngôn ngữ:** Sử dụng `next-intl` để lấy locale, các component đã được dịch.  
- **Caching:** Sử dụng `react-query` với các key đã định nghĩa trong `use-query-keys.ts`.  
- **Toast:** Các mutation đều có toast thông báo thành công/lỗi thông qua `sonner`.  
- **Điều chỉnh hook `useUpdateCard`:** Hiện tại hook này đang nhận `data` kiểu `CreateCardInput`. Cần sửa lại để nhận `UpdateCardInput` (chỉ gồm `deckId` và `status`) và chỉ gọi khi thực sự cập nhật. Nếu có endpoint chỉnh sửa từ vựng, tạo riêng hook `useUpdateWord`.

Với bản mô tả này, frontend có thể phát triển đúng hướng, tận dụng backend đã refactor. Nếu có nhu cầu bổ sung endpoint chỉnh sửa từ vựng, cần cập nhật thêm.