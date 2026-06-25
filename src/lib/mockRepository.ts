import type { RowDataPacket } from "mysql2";
import { getPool } from "@/src/lib/db";
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
  SiteAssets,
} from "@/src/lib/types";

function pathForPage(
  page: { template: PageTemplate; slug: string; parent_id?: number | null },
  locale: LocaleCode,
  parentSlug?: string | null,
): string {
  const path = (() => {
    switch (page.template) {
      case "home":          return "/";
      case "about":         return page.slug === "about" ? "/about" : `/about/${page.slug}`;
      case "certification":
        if (page.slug === "certification") return "/certification";
        return parentSlug
          ? `/certification/${parentSlug}/${page.slug}`
          : `/certification/${page.slug}`;
      case "inspection":
        if (page.slug === "inspection") return "/inspection";
        return parentSlug
          ? `/inspection/${parentSlug}/${page.slug}`
          : `/inspection/${page.slug}`;
      case "services":      return `/services/${page.slug}`;
      case "contact":       return "/contact";
      case "news_list":     return "/news";
      case "simple":        return `/${page.slug}`;
    }
  })();
  return buildLocalizedPathImpl(locale, path);
}

// ── Locales ────────────────────────────────────────────────────────────────

export async function getEnabledLocales(): Promise<Locale[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT * FROM locales WHERE is_enabled = 1 ORDER BY sort_order",
  );
  return rows as unknown as Locale[];
}

export function getDefaultLocale(): LocaleCode {
  return DEFAULT_LOCALE;
}

export function getLocaleFromPath(pathname: string): LocaleCode {
  return splitLocaleFromPath(pathname).locale;
}

// ── Pages ──────────────────────────────────────────────────────────────────

export async function getPageBySlug(slug: string): Promise<Page | null> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT * FROM pages WHERE slug = ? AND is_published = 1",
    [slug],
  );
  return rows.length ? (rows[0] as unknown as Page) : null;
}

export async function getPageTranslation(
  pageId: number,
  locale: LocaleCode,
): Promise<PageTranslation | null> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT * FROM page_translations WHERE page_id = ? AND locale = ?",
    [pageId, locale],
  );
  return rows.length ? (rows[0] as unknown as PageTranslation) : null;
}

export async function getPageWithTranslation(
  slug: string,
  locale: LocaleCode,
): Promise<PageWithTranslation | null> {
  const page = await getPageBySlug(slug);
  if (!page) return null;

  const preferred = await getPageTranslation(page.id, locale);
  if (preferred) {
    return { page, translation: preferred, translation_locale: locale, fallback_used: false };
  }

  if (locale !== DEFAULT_LOCALE) {
    const fallback = await getPageTranslation(page.id, DEFAULT_LOCALE);
    if (fallback) {
      return { page, translation: fallback, translation_locale: DEFAULT_LOCALE, fallback_used: true };
    }
  }

  return null;
}

export async function listPagesByTemplate(
  template: PageTemplate,
  locale: LocaleCode,
  parentFilter: number | null | "any" = "any",
): Promise<PageWithTranslation[]> {
  const pool = getPool();
  const where =
    parentFilter === "any"
      ? "template = ? AND is_published = 1"
      : parentFilter === null
        ? "template = ? AND is_published = 1 AND parent_id IS NULL"
        : "template = ? AND is_published = 1 AND parent_id = ?";
  const params: (string | number)[] =
    parentFilter === "any" || parentFilter === null
      ? [template]
      : [template, parentFilter];
  const [pageRows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM pages WHERE ${where} ORDER BY sort_order`,
    params,
  );
  const pages = pageRows as unknown as Page[];
  if (!pages.length) return [];

  const ids = pages.map((p) => p.id);
  const [transRows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM page_translations WHERE page_id IN (?) AND locale IN (?)",
    [ids, [locale, DEFAULT_LOCALE]],
  );
  const translations = transRows as unknown as PageTranslation[];

  const transMap = new Map<string, PageTranslation>();
  for (const t of translations) {
    const key = `${t.page_id}:${t.locale}`;
    if (!transMap.has(key)) transMap.set(key, t);
  }

  const results: PageWithTranslation[] = [];
  for (const page of pages) {
    const preferred = transMap.get(`${page.id}:${locale}`);
    if (preferred) {
      results.push({ page, translation: preferred, translation_locale: locale, fallback_used: false });
      continue;
    }
    if (locale !== DEFAULT_LOCALE) {
      const fallback = transMap.get(`${page.id}:${DEFAULT_LOCALE}`);
      if (fallback) {
        results.push({ page, translation: fallback, translation_locale: DEFAULT_LOCALE, fallback_used: true });
      }
    }
  }
  return results;
}

// ── Menus ──────────────────────────────────────────────────────────────────

export async function getMenus(locale: LocaleCode): Promise<MenuNode[]> {
  const pool = getPool();

  const [[menuRows], [transRows], [pageRows]] = await Promise.all([
    pool.query<RowDataPacket[]>("SELECT * FROM menus WHERE is_visible = 1 ORDER BY sort_order"),
    pool.query<RowDataPacket[]>(
      "SELECT menu_id, locale, label FROM menu_translations WHERE locale IN (?)",
      [[locale, DEFAULT_LOCALE]],
    ),
    pool.query<RowDataPacket[]>("SELECT id, slug, template, parent_id FROM pages"),
  ]);

  const menus = menuRows as unknown as Menu[];
  const pageMap = new Map(
    (pageRows as unknown as Array<{ id: number; slug: string; template: PageTemplate; parent_id: number | null }>).map(
      (p) => [p.id, p],
    ),
  );

  // Prefer requested locale; fall back to DEFAULT_LOCALE
  const labelMap = new Map<number, string>();
  const transArr = transRows as unknown as Array<{ menu_id: number; locale: string; label: string }>;
  for (const t of transArr) {
    if (t.locale === DEFAULT_LOCALE && !labelMap.has(t.menu_id)) {
      labelMap.set(t.menu_id, t.label);
    }
  }
  for (const t of transArr) {
    if (t.locale === locale) {
      labelMap.set(t.menu_id, t.label);
    }
  }

  const byParent = new Map<number | null, Menu[]>();
  for (const m of menus) {
    const arr = byParent.get(m.parent_id) ?? [];
    arr.push(m);
    byParent.set(m.parent_id, arr);
  }

  const getHref = (menu: Menu): string => {
    if (menu.url) return menu.url;
    if (menu.page_id !== null) {
      const page = pageMap.get(menu.page_id);
      if (page) {
        const parent = page.parent_id != null ? pageMap.get(page.parent_id) : null;
        return pathForPage(page, locale, parent?.slug ?? null);
      }
    }
    return "#";
  };

  const build = (parent: number | null): MenuNode[] =>
    (byParent.get(parent) ?? []).map((m) => ({
      ...m,
      label: labelMap.get(m.id) ?? "",
      href: getHref(m),
      children: build(m.id),
    }));

  return build(null);
}

// ── Posts ──────────────────────────────────────────────────────────────────

export async function getPosts(boardCode: string, locale: LocaleCode): Promise<Post[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT * FROM posts WHERE board_code = ? AND locale = ? AND is_published = 1 ORDER BY published_at DESC",
    [boardCode, locale],
  );
  return rows as unknown as Post[];
}

export async function getPostBySlug(
  boardCode: string,
  slug: string,
  locale: LocaleCode,
): Promise<Post | null> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT * FROM posts WHERE board_code = ? AND locale = ? AND slug = ? AND is_published = 1",
    [boardCode, locale, slug],
  );
  return rows.length ? (rows[0] as unknown as Post) : null;
}

export async function getPostAuthor(postId: number): Promise<string> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT author FROM posts WHERE id = ?",
    [postId],
  );
  return (rows[0] as unknown as { author?: string })?.author ?? "CERINS Editorial";
}

// ── Site-wide assets ───────────────────────────────────────────────────────

export async function getSiteAssets(): Promise<SiteAssets> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT `key`, `value` FROM site_assets",
  );
  const map: Record<string, string> = {};
  for (const row of rows as unknown as Array<{ key: string; value: string }>) {
    map[row.key] = row.value;
  }
  return { default_hero_image: map.default_hero_image ?? "" };
}

export async function getDefaultHeroImage(): Promise<string> {
  return (await getSiteAssets()).default_hero_image;
}

// ── Partners / hero slides ─────────────────────────────────────────────────

export async function listPartners(): Promise<Partner[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT * FROM partners WHERE is_visible = 1 ORDER BY sort_order",
  );
  return rows as unknown as Partner[];
}

export async function getHomeSlides(locale: LocaleCode): Promise<HeroSlide[]> {
  const pool = getPool();
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM home_slides WHERE locale = ? AND is_visible = 1 ORDER BY sort_order",
    [locale],
  );
  if (rows.length) return rows as unknown as HeroSlide[];

  const [fallback] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM home_slides WHERE locale = ? AND is_visible = 1 ORDER BY sort_order",
    [DEFAULT_LOCALE],
  );
  return fallback as unknown as HeroSlide[];
}

// ── URL builders / SEO ─────────────────────────────────────────────────────

export function buildLocalizedPath(locale: LocaleCode, slugOrPath: string): string {
  return buildLocalizedPathImpl(locale, slugOrPath);
}

export async function getAlternateUrls(slug: string): Promise<AlternateUrl[]> {
  const page = await getPageBySlug(slug);
  if (!page) return [];

  const parentSlug = page.parent_id != null
    ? (await getPool().query<RowDataPacket[]>(
        "SELECT slug FROM pages WHERE id = ?",
        [page.parent_id],
      ).then(([rs]) => (rs[0] as { slug?: string } | undefined)?.slug ?? null))
    : null;

  const [locales, [transRows]] = await Promise.all([
    getEnabledLocales(),
    getPool().query<RowDataPacket[]>(
      "SELECT DISTINCT locale FROM page_translations WHERE page_id = ?",
      [page.id],
    ),
  ]);

  const available = new Set(
    (transRows as unknown as Array<{ locale: string }>).map((r) => r.locale),
  );
  const hasDefault = available.has(DEFAULT_LOCALE);

  return locales
    .filter((l: Locale) => available.has(l.code) || hasDefault)
    .map((l: Locale) => ({ locale: l.code, url: pathForPage(page, l.code, parentSlug) }));
}

export async function listPagesByTemplateRaw(template: PageTemplate): Promise<Page[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT * FROM pages WHERE template = ? AND is_published = 1 ORDER BY sort_order",
    [template],
  );
  return rows as unknown as Page[];
}

export async function listPublishedPostSlugs(
  boardCode: string,
  locale: LocaleCode,
): Promise<string[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT slug FROM posts WHERE board_code = ? AND locale = ? AND is_published = 1",
    [boardCode, locale],
  );
  return (rows as unknown as Array<{ slug: string }>).map((r) => r.slug);
}

// ── Sitemap helpers ────────────────────────────────────────────────────────

export async function listPublishedPages(): Promise<Page[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT * FROM pages WHERE is_published = 1 ORDER BY sort_order",
  );
  return rows as unknown as Page[];
}

export function urlForPage(
  page: Page,
  locale: LocaleCode,
  parentSlug?: string | null,
): string {
  return pathForPage(page, locale, parentSlug);
}

// 같은 부모를 가진 형제(혹은 자식)를 한꺼번에 가져옴. 사이드네비/하위 카드 목록용.
export async function listChildPages(
  parentId: number,
  locale: LocaleCode,
): Promise<PageWithTranslation[]> {
  return listPagesByTemplate(
    (await getPool()
      .query<RowDataPacket[]>("SELECT template FROM pages WHERE id = ?", [parentId])
      .then(([rs]) => (rs[0] as { template?: PageTemplate } | undefined)?.template)) ??
      "simple",
    locale,
    parentId,
  );
}

export async function getParentSlug(parentId: number | null): Promise<string | null> {
  if (parentId == null) return null;
  const [rs] = await getPool().query<RowDataPacket[]>(
    "SELECT slug FROM pages WHERE id = ?",
    [parentId],
  );
  return (rs[0] as { slug?: string } | undefined)?.slug ?? null;
}
