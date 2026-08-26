// Shape mirrors the planned MySQL schema. When the real DB lands, these
// interfaces stay; only src/lib/mockRepository.ts changes.

export type LocaleCode = "ko" | "en" | "ja" | "zh" | "ru" | "kk" | "vi";

export type PageTemplate =
  | "home"
  | "about"
  | "certification"
  | "inspection"
  | "services"
  | "news_list"
  | "faq_list"
  | "contact"
  | "simple";

export type SearchScope = "all" | "certification" | "inspection";
export type SearchOp = "and" | "or" | "not";
export type SearchMode = "near" | "exact" | "begin";

export interface SearchHit {
  type: string; // 표시용 라벨 (인증/검사/뉴스/FAQ/페이지 …)
  title: string;
  href: string;
  snippet: string | null;
  context: string | null; // 상위 분류명 등 브레드크럼
  terms: string[]; // 강조할 검색어 (NOT 조건 제외)
}

export interface Locale {
  code: LocaleCode;
  name: string;
  native_name: string;
  is_enabled: boolean;
  sort_order: number;
}

// 구(舊) 블록 구조. content는 이제 HTML 문자열이지만, 과거 데이터 변환을 위해
// 타입은 남겨둔다. → src/lib/pageContent.ts 의 pageContentToHtml 참조.
export interface PageContentBlock {
  heading: string;
  body: string;
}

export interface Page {
  id: number;
  slug: string;
  template: PageTemplate;
  // 2단계 트리. 최상위는 null/undefined. 모킹 데이터는 보통 생략.
  parent_id?: number | null;
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
  // 본문 오른쪽 열에 붙는 사진. 비우면 본문이 전체 폭을 쓴다.
  side_image?: string | null;
  // MySQL: JSON column. HTML 문자열(포스트 본문과 동일). 구 데이터는 읽을 때 변환.
  content: string;
  meta_title: string;
  meta_description: string;
  meta_keywords?: string[]; // 검색용 태그(JSON 배열). DB는 항상 반환, mock 시드는 생략 가능.
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
  // 사이트 진입 팝업 노출 여부 + 팝업 레이아웃 타입(1~3).
  is_popup: boolean;
  popup_type: number;
  // 팝업 노출기간(YYYY-MM-DD). null = 제한 없음.
  popup_start: string | null;
  popup_end: string | null;
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

/** 인증 항목: 하위 인증서 페이지 제목 + 상세 페이지 링크 */
export interface CertificationLink {
  title: string;
  href: string;
}

/** 메인페이지 인증 섹션용: 인증 국가 페이지 + 하위 인증서 페이지 목록 */
export interface CertificationCountry {
  slug: string;
  title: string;
  subtitle: string | null;
  content: string;
  certifications: CertificationLink[];
}

/** 메인 히어로 슬라이더 우측 태그 클라우드용: 인증서/검사 하위 페이지 제목 + 링크 */
export interface HeroTag {
  title: string;
  href: string;
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
  // 메인 히어로 우하단에 상시 노출되는 단일 소개 동영상(링크/업로드). 없으면 빈 문자열.
  hero_video: string;
}

import type { AccountType } from "@/src/lib/userTypes";

export interface User {
  id: number;
  login_id: string;
  email: string;
  company: string | null;
  // 2026-08-26 이후 가입자는 필수. 그 이전 가입자는 NULL 일 수 있다.
  company_phone: string | null;
  company_address: string | null;
  job_title: string | null;
  country: string | null;
  email_consent: boolean;
  account_type: AccountType;
  user_level: number;
  created_at: string;
  updated_at: string;
}
