export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      {/* Có thể thêm Progress Bar học tập tại đây */}
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <h2 className="text-sm font-medium text-muted-foreground">Student Workspace</h2>
      </div>
      {children}
    </div>
  );
}
