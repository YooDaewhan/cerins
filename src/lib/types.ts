// Shape mirrors the planned MySQL schema. When the real DB lands, these
// interfaces stay; only src/lib/mockRepository.ts changes.

export type LocaleCode = "ko" | "en" | "ja" | "zh" | "ru";

export type PageTemplate =
  | "home"
  | "about"
  | "certification"
  | "inspection"
  | "services"
  | "news_list"
  | "contact"
  | "simple";

export interface Locale {
  code: LocaleCode;
  name: string;
  native_name: string;
  is_enabled: boolean;
  sort_order: number;
}

export interface PageContentBlock {
  heading: string;
  body: string;
}

export interface Page {
  id: number;
  slug: string;
  template: PageTemplate;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PageTranslation {
  id: number;
  page_id: number;
  locale: LocaleCode;
  title: string;
  subtitle?: string;
  hero_image?: string;
  // MySQL: JSON column
  content: PageContentBlock[];
  meta_title: string;
  meta_description: string;
  created_at: string;
  updated_at: string;
}

export interface Menu {
  id: number;
  parent_id: number | null;
  page_id: number | null;
  url: string | null;
  // Decorative background image for the mega-menu panel (top-level menus only).
  // MySQL future column: VARCHAR NULL.
  mega_image_url: string | null;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface MenuTranslation {
  id: number;
  menu_id: number;
  locale: LocaleCode;
  label: string;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: number;
  board_code: string;
  locale: LocaleCode;
  slug: string;
  title: string;
  summary: string;
  content: string;
  thumbnail?: string;
  author?: string;
  is_published: boolean;
  published_at: string;
  created_at: string;
  updated_at: string;
}

export interface Partner {
  id: number;
  name: string;
  logo?: string;
  website?: string;
  sort_order: number;
  is_visible: boolean;
}

export interface HeroSlide {
  id: number;
  locale: LocaleCode;
  eyebrow: string;
  headline: string;
  sub: string;
  image: string;
  fallback: string;
  sort_order: number;
  is_visible: boolean;
}

export interface MenuNode extends Menu {
  label: string;
  href: string;
  children: MenuNode[];
}

export interface PageWithTranslation {
  page: Page;
  translation: PageTranslation;
  translation_locale: LocaleCode;
  fallback_used: boolean;
}

export interface AlternateUrl {
  locale: LocaleCode;
  url: string;
}

// MySQL future table: site_assets (key/value image catalog managed in admin).
export interface SiteAssets {
  default_hero_image: string;
}

import type { AccountType } from "@/src/lib/userTypes";

export interface User {
  id: number;
  login_id: string;
  email: string;
  email_consent: boolean;
  account_type: AccountType;
  user_level: number;
  created_at: string;
  updated_at: string;
}
