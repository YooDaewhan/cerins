// The ONLY data-access layer the rest of the app should touch. When MySQL
// lands, every function below becomes async and queries the DB; nothing
// upstream of this file needs to change because every consumer already calls
// these functions instead of importing mock arrays directly.

import { locales } from "@/src/mocks/locales";
import { pages } from "@/src/mocks/pages";
import { pageTranslations } from "@/src/mocks/pageTranslations";
import { menus } from "@/src/mocks/menus";
import { menuTranslations } from "@/src/mocks/menuTranslations";
import { posts, postAuthors } from "@/src/mocks/posts";
import { partners } from "@/src/mocks/partners";
import { heroSlides } from "@/src/mocks/heroSlides";
import {
  DEFAULT_LOCALE,
  buildLocalizedPath as buildLocalizedPathImpl,
  splitLocaleFromPath,
} from "@/src/lib/i18n";
import type {
  AlternateUrl,
  HeroSlide,
  Locale,
  LocaleCode,
  Menu,
  MenuNode,
  Page,
  PageTemplate,
  PageTranslation,
  PageWithTranslation,
  Partner,
  Post,
} from "@/src/lib/types";

// ── Locales ────────────────────────────────────────────────────────────────

export function getEnabledLocales(): Locale[] {
  return locales
    .filter((l) => l.is_enabled)
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function getDefaultLocale(): LocaleCode {
  return DEFAULT_LOCALE;
}

export function getLocaleFromPath(pathname: string): LocaleCode {
  return splitLocaleFromPath(pathname).locale;
}

// ── Pages ──────────────────────────────────────────────────────────────────

export function getPageBySlug(slug: string): Page | null {
  return pages.find((p) => p.slug === slug && p.is_published) ?? null;
}

export function getPageTranslation(
  pageId: number,
  locale: LocaleCode,
): PageTranslation | null {
  return (
    pageTranslations.find((t) => t.page_id === pageId && t.locale === locale) ??
    null
  );
}

/**
 * Lookup a page by slug + locale, with ko-fallback.
 * Returns null if the slug doesn't exist, the page is unpublished, or no
 * translation exists in either the requested locale or the default.
 */
export function getPageWithTranslation(
  slug: string,
  locale: LocaleCode,
): PageWithTranslation | null {
  const page = getPageBySlug(slug);
  if (!page) return null;

  const preferred = getPageTranslation(page.id, locale);
  if (preferred) {
    return {
      page,
      translation: preferred,
      translation_locale: locale,
      fallback_used: false,
    };
  }

  if (locale !== DEFAULT_LOCALE) {
    const fallback = getPageTranslation(page.id, DEFAULT_LOCALE);
    if (fallback) {
      return {
        page,
        translation: fallback,
        translation_locale: DEFAULT_LOCALE,
        fallback_used: true,
      };
    }
  }

  return null;
}

/**
 * Published pages of a given template, sorted, each joined to its
 * (locale-with-ko-fallback) translation. Drops rows whose translation is
 * missing in BOTH the requested locale and the default.
 */
export function listPagesByTemplate(
  template: PageTemplate,
  locale: LocaleCode,
): PageWithTranslation[] {
  return pages
    .filter((p) => p.template === template && p.is_published)
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((p) => getPageWithTranslation(p.slug, locale))
    .filter((x): x is PageWithTranslation => x !== null);
}

// ── Menus ──────────────────────────────────────────────────────────────────

function menuLabel(menuId: number, locale: LocaleCode): string {
  const preferred = menuTranslations.find(
    (t) => t.menu_id === menuId && t.locale === locale,
  );
  if (preferred) return preferred.label;
  const fallback = menuTranslations.find(
    (t) => t.menu_id === menuId && t.locale === DEFAULT_LOCALE,
  );
  return fallback?.label ?? "";
}

function menuHref(menu: Menu, locale: LocaleCode): string {
  if (menu.url) {
    return menu.url; // external or hand-written URL
  }
  if (menu.page_id !== null) {
    const page = pages.find((p) => p.id === menu.page_id);
    if (page) return pathForPage(page, locale);
  }
  return "#";
}

function pathForPage(page: Page, locale: LocaleCode): string {
  // Map (template, slug) → canonical app route, then prefix with locale.
  const path = (() => {
    switch (page.template) {
      case "home":          return "/";
      case "about":         return page.slug === "about" ? "/about" : `/about/${page.slug}`;
      case "certification": return page.slug === "certification" ? "/certification" : `/certification/${page.slug}`;
      case "inspection":    return page.slug === "inspection" ? "/inspection" : `/inspection/${page.slug}`;
      case "services":      return `/services/${page.slug}`;
      case "contact":       return "/contact";
      case "news_list":     return "/news";
      case "simple":        return `/${page.slug}`;
    }
  })();
  return buildLocalizedPathImpl(locale, path);
}

/**
 * Build the localized, visible menu tree. Hidden menus and their descendants
 * are pruned.
 */
export function getMenus(locale: LocaleCode): MenuNode[] {
  const byParent = new Map<number | null, Menu[]>();
  for (const m of menus) {
    if (!m.is_visible) continue;
    const arr = byParent.get(m.parent_id) ?? [];
    arr.push(m);
    byParent.set(m.parent_id, arr);
  }
  for (const arr of byParent.values()) {
    arr.sort((a, b) => a.sort_order - b.sort_order);
  }

  const build = (parent: number | null): MenuNode[] =>
    (byParent.get(parent) ?? []).map((m) => ({
      ...m,
      label: menuLabel(m.id, locale),
      href: menuHref(m, locale),
      children: build(m.id),
    }));

  return build(null);
}

// ── Posts ──────────────────────────────────────────────────────────────────

export function getPosts(boardCode: string, locale: LocaleCode): Post[] {
  return posts
    .filter(
      (p) =>
        p.board_code === boardCode &&
        p.locale === locale &&
        p.is_published,
    )
    .slice()
    .sort((a, b) =>
      a.published_at < b.published_at ? 1 : a.published_at > b.published_at ? -1 : 0,
    );
}

export function getPostBySlug(
  boardCode: string,
  slug: string,
  locale: LocaleCode,
): Post | null {
  return (
    posts.find(
      (p) =>
        p.board_code === boardCode &&
        p.locale === locale &&
        p.slug === slug &&
        p.is_published,
    ) ?? null
  );
}

export function getPostAuthor(postId: number): string {
  return postAuthors[postId] ?? "CERINS Editorial";
}

// ── Partners / hero slides ─────────────────────────────────────────────────

export function listPartners(): Partner[] {
  return partners
    .filter((p) => p.is_visible)
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function getHomeSlides(locale: LocaleCode): HeroSlide[] {
  const preferred = heroSlides
    .filter((s) => s.locale === locale && s.is_visible)
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);
  if (preferred.length > 0) return preferred;
  return heroSlides
    .filter((s) => s.locale === DEFAULT_LOCALE && s.is_visible)
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);
}

// ── URL builders / SEO ─────────────────────────────────────────────────────

export function buildLocalizedPath(locale: LocaleCode, slugOrPath: string): string {
  return buildLocalizedPathImpl(locale, slugOrPath);
}

/**
 * For a given page slug, return one URL per enabled locale that actually has
 * a translation (or the ko fallback). Used for sitemap and hreflang.
 */
export function getAlternateUrls(slug: string): AlternateUrl[] {
  const page = getPageBySlug(slug);
  if (!page) return [];
  return getEnabledLocales()
    .filter((l) => {
      const direct = getPageTranslation(page.id, l.code);
      const fallback = getPageTranslation(page.id, DEFAULT_LOCALE);
      return Boolean(direct ?? fallback);
    })
    .map((l) => ({ locale: l.code, url: pathForPage(page, l.code) }));
}

/**
 * Lightweight `Page` listing by template — used by route `generateStaticParams`
 * to enumerate prebuildable slugs without going through translation joins.
 */
export function listPagesByTemplateRaw(template: PageTemplate): Page[] {
  return pages
    .filter((p) => p.template === template && p.is_published)
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function listPublishedPostSlugs(boardCode: string, locale: LocaleCode): string[] {
  return posts
    .filter((p) => p.board_code === boardCode && p.locale === locale && p.is_published)
    .map((p) => p.slug);
}

// ── Sitemap helpers ────────────────────────────────────────────────────────

export function listPublishedPages(): Page[] {
  return pages
    .filter((p) => p.is_published)
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function urlForPage(page: Page, locale: LocaleCode): string {
  return pathForPage(page, locale);
}
