import {
  LucideIcon,
  LayoutDashboard,
  Headphones,
  BookMarked,
  Languages,
  Users,
  GraduationCap,
  LayoutList,
  UserCog,
  ShieldCheck,
  Settings,
} from "lucide-react";

export interface NavItem {
  titleKey: string; // Key này sẽ gọi t("titleKey")
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  labelKey: string; // Key này sẽ gọi t("labelKey")
  items: NavItem[];
}

// Định nghĩa các item với key
const STUDENT_BASE: NavItem[] = [
  { titleKey: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { titleKey: "listen", href: "/listen", icon: Headphones },
  { titleKey: "vocabulary", href: "/vocabulary", icon: BookMarked },
  { titleKey: "translate", href: "/translate", icon: Languages },
];

const TEACHER_BASE: NavItem[] = [
  { titleKey: "classes", href: "/classes", icon: Users },
  { titleKey: "grades", href: "/grades", icon: GraduationCap },
  { titleKey: "curriculum", href: "/curriculum", icon: LayoutList },
];

const ADMIN_BASE: NavItem[] = [
  { titleKey: "users", href: "/users", icon: UserCog },
  { titleKey: "logs", href: "/logs", icon: ShieldCheck },
  { titleKey: "settings", href: "/settings", icon: Settings },
];

// Hàm prefix giữ nguyên
const getNavWithPrefix = (items: NavItem[], role: string): NavItem[] => {
  const prefix = `/${role.toLowerCase()}`;
  return items.map((item) => ({ ...item, href: `${prefix}${item.href}` }));
};

export const ROLE_NAV_CONFIG: Record<string, NavGroup[]> = {
  STUDENT: [{ labelKey: "group_study", items: getNavWithPrefix(STUDENT_BASE, "STUDENT") }],
  TEACHER: [
    { labelKey: "group_study", items: getNavWithPrefix(STUDENT_BASE, "TEACHER") },
    { labelKey: "group_teaching", items: getNavWithPrefix(TEACHER_BASE, "TEACHER") },
  ],
  ADMIN: [
    { labelKey: "group_study", items: getNavWithPrefix(STUDENT_BASE, "ADMIN") },
    { labelKey: "group_teaching", items: getNavWithPrefix(TEACHER_BASE, "ADMIN") },
    { labelKey: "group_system", items: getNavWithPrefix(ADMIN_BASE, "ADMIN") },
  ],
};
