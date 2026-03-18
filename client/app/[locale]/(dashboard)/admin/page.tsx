export default function AdminUsersPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-red-600">Quản lý người dùng</h1>
      <table className="w-full border-collapse rounded-lg overflow-hidden border">
        <thead className="bg-zinc-100 dark:bg-zinc-800">
          <tr>
            <th className="p-3 text-left">Họ tên</th>
            <th className="p-3 text-left">Email</th>
            <th className="p-3 text-left">Vai trò</th>
            <th className="p-3 text-left">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {/* Map data users từ API tại đây */}
          <tr className="border-t">
            <td className="p-3">Nguyễn Văn A</td>
            <td className="p-3">student@example.com</td>
            <td className="p-3">
              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">STUDENT</span>
            </td>
            <td className="p-3 text-primary cursor-pointer hover:underline">Sửa</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
