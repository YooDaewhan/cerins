import type { Locale } from "@/src/lib/types";

// MySQL future table: locales
export const locales: Locale[] = [
  { code: "ko", name: "Korean", native_name: "한국어", is_enabled: true, sort_order: 1 },
  { code: "en", name: "English", native_name: "English", is_enabled: true, sort_order: 2 },
  { code: "ja", name: "Japanese", native_name: "日本語", is_enabled: true, sort_order: 3 },
  { code: "zh", name: "Chinese", native_name: "中文", is_enabled: true, sort_order: 4 },
  { code: "ru", name: "Russian", native_name: "Русский", is_enabled: true, sort_order: 5 },
];
