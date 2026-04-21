import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ locale: string; role: string }>;
}

export default async function RoleRootPage({ params }: Props) {
  const { locale, role } = await params;

  // Optional: kiểm tra role hợp lệ
  const validRoles = ["teacher", "student", "admin"];
  if (!validRoles.includes(role.toLowerCase())) {
    redirect(`/${locale}/login`); // hoặc notFound()
  }

  redirect(`/${locale}/${role}/vocabulary`);
}
