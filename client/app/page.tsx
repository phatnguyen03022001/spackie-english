import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, GraduationCap, Trophy, Users, Star } from "lucide-react";

export default function EnglishLearningHome() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* --- HERO SECTION --- */}
      <div className="bg-red-100 text-primary-foreground p-10 text-4xl">Tesst Primary OKLCH</div>
      <section className="relative py-20 px-6 text-center bg-stone-100/50 dark:bg-stone-900/20">
        <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 px-4 py-1">
          Chương trình học chuẩn quốc tế 2026
        </Badge>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
          Chinh phục Tiếng Anh <br />
          <span className="text-primary">Đột phá sự nghiệp</span>
        </h1>
        <p className="max-w-2xl mx-auto text-muted-foreground text-lg mb-10">
          Nền tảng học tập thông minh sử dụng AI giúp bạn giao tiếp thành thạo chỉ sau 3 tháng. Học mọi lúc, mọi nơi với
          lộ trình cá nhân hóa.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="bg-primary text-primary-foreground hover:opacity-90 px-8">
            Bắt đầu học ngay
          </Button>
          <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary/5">
            Dùng thử miễn phí
          </Button>
        </div>
      </section>

      {/* --- STATS SECTION --- */}
      <div className="flex justify-center -mt-8 px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-card border shadow-xl rounded-2xl p-6 w-full max-w-5xl">
          {[
            { label: "Học viên", value: "50,000+", icon: Users },
            { label: "Khóa học", value: "120+", icon: BookOpen },
            { label: "Giảng viên", value: "500+", icon: GraduationCap },
            { label: "Giải thưởng", value: "15", icon: Trophy },
          ].map((stat, i) => (
            <div key={i} className="text-center flex flex-col items-center">
              <stat.icon className="w-6 h-6 text-primary mb-2" />
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-xs text-muted-foreground uppercase">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* --- FEATURED COURSES --- */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-3xl font-bold mb-2">Khóa học nổi bật</h2>
            <p className="text-muted-foreground">Lựa chọn lộ trình phù hợp với mục tiêu của bạn</p>
          </div>
          <Button variant="ghost" className="text-primary hover:text-primary hover:bg-primary/10">
            Xem tất cả →
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { title: "IELTS Masterclass", level: "Band 7.5+", price: "2.500.000đ", image: "📚" },
            { title: "English for Business", level: "Professional", price: "1.800.000đ", image: "💼" },
            { title: "Communication Pro", level: "Everyday life", price: "1.200.000đ", image: "🗣️" },
          ].map((course, i) => (
            <Card
              key={i}
              className="group hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-orange-500/10">
              <CardHeader className="bg-stone-50 dark:bg-stone-900/50 h-32 flex items-center justify-center text-5xl">
                {course.image}
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center mb-2">
                  <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
                    {course.level}
                  </Badge>
                  <div className="flex items-center text-yellow-500 text-sm">
                    <Star className="w-4 h-4 fill-current mr-1" /> 4.9
                  </div>
                </div>
                <CardTitle className="mb-2 group-hover:text-primary transition-colors">{course.title}</CardTitle>
                <CardDescription>Học cùng giảng viên bản xứ và nhận chứng chỉ sau khóa học.</CardDescription>
              </CardContent>
              <CardFooter className="flex justify-between items-center border-t pt-4">
                <span className="font-bold text-lg">{course.price}</span>
                <Button size="sm" className="bg-primary hover:bg-primary/90">
                  Đăng ký
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      {/* --- CTA SECTION --- */}
      <section className="bg-primary mx-6 mb-20 rounded-3xl py-16 px-6 text-center text-primary-foreground">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">Bạn đã sẵn sàng nâng tầm bản thân?</h2>
        <p className="mb-10 opacity-90 max-w-xl mx-auto">
          Tham gia cùng cộng đồng hơn 50.000 học viên đang tiến bộ mỗi ngày. Ưu đãi giảm 30% cho học viên mới trong
          tháng này.
        </p>
        <Button
          size="lg"
          variant="secondary"
          className="bg-white text-primary hover:bg-stone-100 font-bold px-10 py-6 text-lg rounded-full">
          Nhận ưu đãi ngay
        </Button>
      </section>
    </div>
  );
}
