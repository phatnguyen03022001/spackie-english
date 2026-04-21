import { LayoutDashboard, Compass, BookOpenCheck, LibraryBig, FolderKanban, LucideIcon } from "lucide-react";

export interface NavItem {
  titleKey: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  labelKey: string;
  items: NavItem[];
}

// ========== ITEMS CHUNG ==========
const COMMON_ITEMS: NavItem[] = [{ titleKey: "dashboard", href: "/vocabulary", icon: LayoutDashboard }];

// ========== MODULE VOCABULARY ==========
const STUDENT_VOCAB_ITEMS: NavItem[] = [
  { titleKey: "vocabulary_explore", href: "/vocabulary/decks", icon: Compass },
  { titleKey: "my_decks", href: "/vocabulary/my-decks", icon: BookOpenCheck },
  { titleKey: "review", href: "/vocabulary/review", icon: LibraryBig },
];

const TEACHER_VOCAB_ITEMS: NavItem[] = [{ titleKey: "manage_decks", href: "/vocabulary/manage", icon: FolderKanban }];

// Helper: thêm prefix role
const prefixHref = (items: NavItem[], role: string): NavItem[] => {
  const prefix = `/${role.toLowerCase()}`;
  return items.map((item) => ({ ...item, href: `${prefix}${item.href}` }));
};

export const ROLE_NAV_CONFIG: Record<string, NavGroup[]> = {
  STUDENT: [
    { labelKey: "group_main", items: prefixHref(COMMON_ITEMS, "STUDENT") },
    { labelKey: "group_vocabulary", items: prefixHref(STUDENT_VOCAB_ITEMS, "STUDENT") },
  ],
  TEACHER: [
    { labelKey: "group_main", items: prefixHref(COMMON_ITEMS, "TEACHER") },
    {
      labelKey: "group_vocabulary",
      items: prefixHref([...STUDENT_VOCAB_ITEMS, ...TEACHER_VOCAB_ITEMS], "TEACHER"),
    },
  ],
  ADMIN: [
    { labelKey: "group_main", items: prefixHref(COMMON_ITEMS, "ADMIN") },
    {
      labelKey: "group_vocabulary",
      items: prefixHref([...STUDENT_VOCAB_ITEMS, ...TEACHER_VOCAB_ITEMS], "ADMIN"),
    },
  ],
};
