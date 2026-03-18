export default function StudentPage() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <h1 className="col-span-full text-2xl font-bold">Chào mừng bạn quay lại học tập!</h1>
      {/* Render các widget như: Bài học gần đây, Từ vựng mới... */}
      <div className="h-32 rounded-xl border-2 border-dashed border-zinc-200" />
      <div className="h-32 rounded-xl border-2 border-dashed border-zinc-200" />
      <div className="h-32 rounded-xl border-2 border-dashed border-zinc-200" />
    </div>
  );
}
