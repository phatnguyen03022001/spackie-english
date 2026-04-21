export const vocabKeys = {
  all: ["vocabulary"] as const,

  // Management
  decks: () => [...vocabKeys.all, "management", "decks"] as const,
  deck: (id: string) => [...vocabKeys.decks(), id] as const,
  analytics: (id: string) => [...vocabKeys.deck(id), "analytics"] as const,

  // Learning (Student)
  public: () => [...vocabKeys.all, "learning", "public"] as const,
  preview: (id: string) => [...vocabKeys.public(), "preview", id] as const,
  enrolled: () => [...vocabKeys.all, "learning", "enrolled"] as const,
  dueCount: () => [...vocabKeys.all, "learning", "due-count"] as const,
  sessions: () => [...vocabKeys.all, "learning", "sessions"] as const,
  recommended: () => [...vocabKeys.all, "learning", "recommended"] as const,

  // Dashboard
  stats: () => [...vocabKeys.all, "dashboard", "stats"] as const,
  forecast: () => [...vocabKeys.all, "dashboard", "forecast"] as const,
  heatmap: () => [...vocabKeys.all, "dashboard", "heatmap"] as const,
};
