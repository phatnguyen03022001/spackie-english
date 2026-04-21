Dưới đây là file `design-guidelines.md` – hướng dẫn thiết kế giao diện đồng bộ, chuyên nghiệp dựa trên hệ thống hiện tại. Bạn có thể đặt file này trong thư mục gốc hoặc `docs/` để cả nhóm tham khảo.

```markdown
# Hướng dẫn thiết kế giao diện – Phong cách Shadcn

Tài liệu này định nghĩa các quy tắc, component và pattern để xây dựng giao diện nhất quán, đẹp và dễ bảo trì. Hệ thống dựa trên **Tailwind CSS**, **shadcn/ui** và các biến CSS tùy chỉnh.

---

## 1. Nguyên tắc chung

- **Đơn giản, tinh tế**: Ưu tiên khoảng trắng, bố cục rõ ràng, tránh rườm rà.
- **Nhất quán**: Sử dụng đúng component, màu sắc, spacing, typography.
- **Responsive**: Thiết kế mobile-first, kiểm tra trên các breakpoint sm/md/lg/xl.
- **Dark mode sẵn sàng**: Luôn kiểm tra giao diện ở cả light và dark.
- **Hiệu năng**: Hạn chế reflow, sử dụng `transition` có chọn lọc.

---

## 2. Hệ thống màu sắc & biến CSS

Tất cả màu sắc được khai báo trong `styles/globals.css` dưới dạng CSS custom properties. **Không dùng màu cứng** (ví dụ `bg-blue-500`) trừ khi thật cần thiết; hãy dùng các token semantic.

### 2.1. Token màu chính

| Token                                        | Mô tả                                   |
| -------------------------------------------- | --------------------------------------- |
| `--background` / `--foreground`              | Nền và chữ chính                        |
| `--card` / `--card-foreground`               | Nền và chữ của card                     |
| `--popover` / `--popover-foreground`         | Popover, dialog, dropdown               |
| `--primary` / `--primary-foreground`         | Màu chính (nút, link, focus)            |
| `--secondary` / `--secondary-foreground`     | Màu phụ (nút phụ, badge nhẹ)            |
| `--muted` / `--muted-foreground`             | Vùng ít quan trọng (label, placeholder) |
| `--accent` / `--accent-foreground`           | Accent (hover menu, selection)          |
| `--destructive` / `--destructive-foreground` | Hành động nguy hiểm (xóa)               |
| `--border`, `--input`, `--ring`              | Đường viền, input, focus ring           |
| `--sidebar-*`                                | Dành riêng cho sidebar                  |

### 2.2. Cách sử dụng trong Tailwind

```html
<div class="bg-background text-foreground">Nội dung</div>
<button class="bg-primary text-primary-foreground">Nút chính</button>
<input class="border-input ring-ring focus:ring-2" />
```

### 2.3. Radius

- `--radius: 0.75rem` (mặc định)
- Các scale: `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`, `--radius-2xl`, `--radius-3xl`
- Dùng class Tailwind: `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-3xl`

### 2.4. Dark mode

Sử dụng class `.dark` trên phần tử cha (thường là `<html>`). Mọi token sẽ tự động chuyển đổi. Khi viết CSS, dùng `@custom-variant dark (&:is(.dark *))` đã được cấu hình sẵn.

---

## 3. Typography

- **Font chính**: Google Sans Flex (hoặc `ui-sans-serif` fallback) – khai báo qua `--font-sans`.
- **Font mono**: Geist Mono – `--font-mono`.
- **Kích thước**: Sử dụng scale Tailwind mặc định (text-xs, text-sm, text-base, ...). Không tự ý tạo kích thước mới.
- **Line-height**: Dùng `leading-tight`, `leading-normal`, `leading-relaxed` phù hợp.
- **Cân nhắc** thêm class `antialiased` (đã có sẵn trong `body`).

---

## 4. Component UI (shadcn/ui)

Tất cả component UI được đặt trong `components/ui/`. Các component này đã được tùy chỉnh để dùng token màu sắc và radius.

### 4.1. Danh sách component có sẵn

- `Button` – sử dụng variant: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`
- `Card` – bao gồm `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
- `Dialog`, `AlertDialog` – modal, confirm
- `DropdownMenu`, `Sheet` – menu thả xuống, sidebar trượt
- `Form` – kết hợp với react-hook-form và zod
- `Input`, `Textarea`, `Select`, `Switch`, `Checkbox` (có thể thêm sau)
- `Table`, `Tabs`, `Breadcrumb`, `Avatar`, `Badge`, `Progress`, `Skeleton`, `Tooltip`
- `Sonner` – toast notification

### 4.2. Cách import

```tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
```

### 4.3. Ví dụ sử dụng

```tsx
<Button variant="outline" size="sm">Huỷ</Button>
<Button>Xác nhận</Button>

<Card>
  <CardHeader>
    <CardTitle>Tiêu đề</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Nội dung</p>
  </CardContent>
</Card>
```

---

## 5. Utility classes tuỳ chỉnh

Trong `globals.css` có định nghĩa sẵn:

- `glass` – hiệu ứng kính mờ (light mode)
- `glass-dark` – hiệu ứng kính mờ (dark mode)
- `glass-panel` – kết hợp glass + bo góc + padding

Sử dụng khi cần tạo layer nổi trên nền:

```html
<div class="glass-panel">
  <p>Nội dung trên nền mờ</p>
</div>
```

---

## 6. Layout & spacing

### 6.1. Container chính

- **Auth layout** (`app/[locale]/(auth)/layout.tsx`): thường dùng grid hoặc flex căn giữa, background đơn giản.
- **Dashboard layout** (`app/[locale]/(dashboard)/layout.tsx`): bao gồm sidebar + header + main content.
- **Public layout** (`app/[locale]/layout.tsx`): dùng cho trang chủ, landing page, không yêu cầu đăng nhập.

### 6.2. Spacing

- Dùng scale Tailwind: `p-4`, `m-2`, `gap-4`, `space-y-2`, ...
- Không dùng giá trị tuỳ ý như `p-[13px]` trừ khi thực sự cần.
- Khoảng cách giữa các section: thường dùng `py-8` hoặc `py-12`.
- Khoảng cách giữa các element trong một card: `space-y-4` hoặc `gap-4` nếu dùng flex/grid.

### 6.3. Grid & Flex

- Ưu tiên flex cho bố cục đơn giản, grid cho danh sách phức tạp.
- Luôn xét responsive: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3`.

---

## 7. Animation & Transition

- **Transition mặc định**: đã được áp dụng cho `*` ở `@layer base` với `background-color`, `border-color`, `color`. Không nên mở rộng quá nhiều.
- Khi cần animation riêng, dùng `transition-all duration-200 ease-out` hoặc các class Tailwind.
- Tránh animate quá nhiều phần tử cùng lúc ảnh hưởng hiệu năng.

---

## 8. Pattern cho Page & Component

### 8.1. Page (app router)

Mỗi page thường có cấu trúc:

```tsx
import { getTranslations } from "next-intl/server";
import { SomeComponent } from "@/features/...";

export default async function Page() {
  const t = await getTranslations("namespace");
  // fetch data nếu cần

  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <SomeComponent />
    </div>
  );
}
```

**Lưu ý**:
- Dùng `async` component nếu cần fetch data hoặc dùng server component.
- Sử dụng `next-intl` cho i18n.
- Đặt tên file là `page.tsx` theo quy ước Next.js.

### 8.2. Client Component

Khi cần state, event, hook, hãy đánh dấu `"use client"` và đặt trong thư mục `features/` tương ứng.

```tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function Counter() {
  const [count, setCount] = useState(0);
  return <Button onClick={() => setCount(count + 1)}>{count}</Button>;
}
```

### 8.3. Tổ chức thư mục features

Mỗi feature (auth, vocabulary, listen, translate, tests) có cấu trúc:

```
features/
  vocabulary/
    api/           # custom hooks gọi API (useQuery, useMutation)
    components/    # component riêng của feature
      learning/
      management/
      shared/
    hooks/         # custom hooks dùng riêng
    schemas/       # zod schemas
    types/         # TypeScript types
    utils/         # helper functions
    index.ts       # export public
```

### 8.4. Component tái sử dụng

- Nếu component dùng chung nhiều feature, đặt trong `components/ui/` hoặc `components/shared/`.
- Component đặc thù của một feature, đặt trong thư mục con của feature đó.

---

## 9. Form handling

Sử dụng `react-hook-form` + `zod` + shadcn/ui `Form` component.

Ví dụ:

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const schema = z.object({ email: z.string().email() });

export function LoginForm() {
  const form = useForm({ resolver: zodResolver(schema) });
  // ...
}
```

---

## 10. Responsive & Dark mode testing

- Luôn kiểm tra giao diện trên thiết bị di động (viewport 375px), tablet, desktop.
- Sử dụng DevTools để test dark mode: thêm class `.dark` vào `<html>` tạm thời.
- Với component có background màu sắc, hãy chắc chắn rằng nó hoạt động tốt ở cả hai chế độ.

---

## 11. Ví dụ hoàn chỉnh

### 11.1. Trang danh sách deck (server component)

```tsx
// app/[locale]/(dashboard)/[role]/vocabulary/decks/page.tsx
import { getDecks } from "@/features/vocabulary/api";
import { DeckCard } from "@/features/vocabulary/components/shared/deck-card";
import { getTranslations } from "next-intl/server";

export default async function DecksPage() {
  const t = await getTranslations("vocabulary");
  const decks = await getDecks();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{t("my_decks")}</h1>
        <Button>{t("create_new")}</Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {decks.map((deck) => (
          <DeckCard key={deck.id} deck={deck} />
        ))}
      </div>
    </div>
  );
}
```

### 11.2. Card component (client component)

```tsx
// features/vocabulary/components/shared/deck-card.tsx
"use client";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function DeckCard({ deck }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{deck.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{deck.description}</p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <span className="text-sm text-muted-foreground">{deck.cardCount} thẻ</span>
        <Button asChild variant="secondary">
          <Link href={`/vocabulary/decks/${deck.id}`}>Học ngay</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
```

---

## 12. Kết luận

Tuân thủ hướng dẫn này sẽ đảm bảo:

- Giao diện đồng bộ, dễ bảo trì.
- Dễ dàng thêm tính năng mới mà không phá vỡ thiết kế.
- Hỗ trợ dark mode và responsive một cách nhất quán.
- Sử dụng đúng hệ thống component, tránh viết lại mã thừa.

Mọi đóng góp, thay đổi cần cập nhật tài liệu này để cả nhóm cùng theo dõi.
```

Bạn có thể lưu file này với tên `design-guidelines.md` và đặt trong thư mục gốc hoặc `1.Docs/` để tiện tham khảo. Nội dung dựa chính xác vào cấu trúc thư mục, biến CSS, và các component có sẵn.