export default function TeacherClassesPage() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Danh sách lớp học</h1>
        <button className="bg-primary text-white px-4 py-2 rounded-md">Tạo lớp mới</button>
      </div>
      <div className="rounded-md border bg-white dark:bg-zinc-900 h-64 flex items-center justify-center">
        <p className="text-muted-foreground">Chưa có lớp học nào được tạo.</p>
      </div>
    </div>
  );
}
