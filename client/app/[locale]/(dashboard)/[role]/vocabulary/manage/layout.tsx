import Link from "next/link";

export default function ManageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-6 space-y-4">
      <div className="flex border-b gap-4">
        <Link href="/vocabulary/manage" className="pb-2 border-b-2 hover:text-primary">
          Quản lý Deck
        </Link>
        <Link href="/vocabulary/manage/cards" className="pb-2 border-b-2 hover:text-primary">
          Thêm thẻ lẻ
        </Link>
        <Link href="/vocabulary/manage/import" className="pb-2 border-b-2 hover:text-primary">
          Import hàng loạt
        </Link>
      </div>
      {children}
    </div>
  );
}
