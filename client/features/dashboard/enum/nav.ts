import {
  LayoutDashboard,
  Languages,
  Headphones,
  LibraryBig,
  Compass,
  BookOpenCheck,
  FolderKanban,
  Users,
  GraduationCap,
  LayoutList,
  UserCog,
  ShieldCheck,
  Settings,
  LucideIcon,
} from "lucide-react";

export interface NavItem {
  titleKey: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  labelKey: string;
  items: NavItem[];
}

// ========== ITEMS CHUNG (dành cho mọi role) ==========
const COMMON_ITEMS: NavItem[] = [{ titleKey: "dashboard", href: "/vocabulary", icon: LayoutDashboard }];

// ========== MODULE VOCABULARY ==========
// Dành cho học viên (student)
const STUDENT_VOCAB_ITEMS: NavItem[] = [
  { titleKey: "vocabulary_explore", href: "/vocabulary/decks", icon: Compass },
  { titleKey: "my_decks", href: "/vocabulary/my-decks", icon: BookOpenCheck },
  { titleKey: "review", href: "/vocabulary/review", icon: LibraryBig },
];

// Dành cho giáo viên (teacher)
const TEACHER_VOCAB_ITEMS: NavItem[] = [{ titleKey: "manage_decks", href: "/vocabulary/manage", icon: FolderKanban }];

// ========== CÁC MODULE KHÁC ==========
const LISTEN_ITEM: NavItem = { titleKey: "listen", href: "/listen", icon: Headphones };
const TRANSLATE_ITEM: NavItem = { titleKey: "translate", href: "/translate", icon: Languages };

// ========== DÀNH RIÊNG CHO TEACHER ==========
const TEACHER_CLASS_ITEMS: NavItem[] = [
  { titleKey: "classes", href: "/classes", icon: Users },
  { titleKey: "grades", href: "/grades", icon: GraduationCap },
  { titleKey: "curriculum", href: "/curriculum", icon: LayoutList },
];

// ========== DÀNH RIÊNG CHO ADMIN ==========
const ADMIN_ITEMS: NavItem[] = [
  { titleKey: "users", href: "/users", icon: UserCog },
  { titleKey: "logs", href: "/logs", icon: ShieldCheck },
  { titleKey: "settings", href: "/settings", icon: Settings },
];

// Helper: thêm prefix role vào href (ví dụ: /STUDENT/vocabulary/decks)
const prefixHref = (items: NavItem[], role: string): NavItem[] => {
  const prefix = `/${role.toLowerCase()}`;
  return items.map((item) => ({ ...item, href: `${prefix}${item.href}` }));
};

// Cấu hình cho từng role
export const ROLE_NAV_CONFIG: Record<string, NavGroup[]> = {
  STUDENT: [
    { labelKey: "group_main", items: prefixHref(COMMON_ITEMS, "STUDENT") },
    { labelKey: "group_vocabulary", items: prefixHref(STUDENT_VOCAB_ITEMS, "STUDENT") },
    { labelKey: "group_tools", items: prefixHref([LISTEN_ITEM, TRANSLATE_ITEM], "STUDENT") },
  ],
  TEACHER: [
    { labelKey: "group_main", items: prefixHref(COMMON_ITEMS, "TEACHER") },
    { labelKey: "group_vocabulary", items: prefixHref([...STUDENT_VOCAB_ITEMS, ...TEACHER_VOCAB_ITEMS], "TEACHER") },
    { labelKey: "group_teaching", items: prefixHref(TEACHER_CLASS_ITEMS, "TEACHER") },
    { labelKey: "group_tools", items: prefixHref([LISTEN_ITEM, TRANSLATE_ITEM], "TEACHER") },
  ],
  ADMIN: [
    { labelKey: "group_main", items: prefixHref(COMMON_ITEMS, "ADMIN") },
    { labelKey: "group_vocabulary", items: prefixHref([...STUDENT_VOCAB_ITEMS, ...TEACHER_VOCAB_ITEMS], "ADMIN") },
    { labelKey: "group_teaching", items: prefixHref(TEACHER_CLASS_ITEMS, "ADMIN") },
    { labelKey: "group_system", items: prefixHref(ADMIN_ITEMS, "ADMIN") },
    { labelKey: "group_tools", items: prefixHref([LISTEN_ITEM, TRANSLATE_ITEM], "ADMIN") },
  ],
};
