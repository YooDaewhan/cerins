import type { RowDataPacket } from "mysql2";
import { getPool } from "@/src/lib/db";
import {
  DEFAULT_LOCALE,
  buildLocalizedPath as buildLocalizedPathImpl,
  splitLocaleFromPath,
} from "@/src/lib/i18n";
import type {
  AlternateUrl,
  CertificationCountry,
  CertificationLink,
  HeroSlide,
  HeroTag,
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
  SearchHit,
  SearchMode,
  SearchOp,
  SearchScope,
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
      case "faq_list":      return "/faq";
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

// 메인페이지 인증 섹션용: 인증 국가(최상위 certification 페이지)와
// 그 하위 인증서 페이지 제목 목록. 어드민 페이지 관리의 "+하위" 로 추가한
// 하위 페이지가 그대로 인증서 목록이 된다.
export async function listCertificationCountries(
  locale: LocaleCode,
): Promise<CertificationCountry[]> {
  const all = await listPagesByTemplate("certification", locale, "any");
  const slugById = new Map<number, string>();
  for (const { page } of all) slugById.set(page.id, page.slug);

  const certsByParent = new Map<number, CertificationLink[]>();
  for (const { page, translation } of all) {
    if (page.parent_id == null) continue;
    const list = certsByParent.get(page.parent_id) ?? [];
    list.push({
      title: translation.title,
      href: pathForPage(page, locale, slugById.get(page.parent_id) ?? null),
    });
    certsByParent.set(page.parent_id, list);
  }
  return all
    .filter(({ page }) => page.parent_id == null && page.slug !== "certification")
    .map(({ page, translation }) => ({
      slug: page.slug,
      title: translation.title,
      subtitle: translation.subtitle ?? null,
      content: Array.isArray(translation.content) ? translation.content : [],
      certifications: certsByParent.get(page.id) ?? [],
    }));
}

// 메인 히어로 우측 태그 클라우드용: 인증(certification)·검사(inspection) 템플릿의
// 하위 페이지(=인증서/검사 항목)들을 제목 + 링크 형태로 뽑아온다. 부모(국가/분류)
// 페이지는 제외하고, 두 템플릿을 번갈아 섞어 limit개까지 반환한다.
export async function listHeroTags(
  locale: LocaleCode,
  limit = 15,
): Promise<HeroTag[]> {
  const [certs, inspections] = await Promise.all([
    listPagesByTemplate("certification", locale, "any"),
    listPagesByTemplate("inspection", locale, "any"),
  ]);

  const slugById = new Map<number, string>();
  for (const { page } of [...certs, ...inspections]) slugById.set(page.id, page.slug);

  const toTags = (pages: PageWithTranslation[]): HeroTag[] =>
    pages
      .filter(({ page }) => page.parent_id != null)
      .map(({ page, translation }) => ({
        title: translation.title,
        href: pathForPage(page, locale, slugById.get(page.parent_id!) ?? null),
      }));

  // 인증/검사를 번갈아 배치해 한쪽으로 치우치지 않게 한다.
  const certTags = toTags(certs);
  const inspTags = toTags(inspections);
  const interleaved: HeroTag[] = [];
  for (let i = 0; i < Math.max(certTags.length, inspTags.length); i++) {
    if (certTags[i]) interleaved.push(certTags[i]);
    if (inspTags[i]) interleaved.push(inspTags[i]);
  }
  return interleaved.slice(0, limit);
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

// 사이트 진입 팝업으로 지정된(공개 + 팝업 체크) 뉴스. 최신순.
export async function getPopupPosts(
  boardCode: string,
  locale: LocaleCode,
): Promise<Post[]> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT * FROM posts WHERE board_code = ? AND locale = ? AND is_published = 1 AND is_popup = 1 ORDER BY published_at DESC, id DESC",
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

// ── Advanced search ─────────────────────────────────────────────────────────
// ponytail: 전체 문서를 메모리에 올려 JS로 평가한다. 페이지/게시글이 수백 건
// 규모라 충분하고, 조건마다 검색범위/매칭모드가 달라도 자연스럽게 처리된다.
// 데이터가 커지면 FULLTEXT 인덱스 또는 검색엔진으로 교체.

const TEMPLATE_LABEL: Record<PageTemplate, string> = {
  home: "홈",
  about: "회사소개",
  certification: "인증",
  inspection: "검사",
  services: "서비스",
  news_list: "뉴스",
  faq_list: "FAQ",
  contact: "문의",
  simple: "페이지",
};

export interface SearchCondition {
  op: SearchOp; // 앞 조건과의 결합 (첫 조건은 무시)
  scope: SearchScope; // 이 조건이 뒤질 범위
  text: string;
  mode: SearchMode; // 이 조건의 매칭 방식
}

interface SearchDoc {
  scopeKey: PageTemplate | "post"; // 검색범위 판정용
  typeLabel: string;
  title: string;
  href: string;
  snippet: string | null;
  context: string | null;
  haystack: string; // 소문자 검색 대상 텍스트
  tokens: string[]; // 소문자 토큰 (~로 시작 판정용)
}

function toText(v: unknown): string {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.map(toText).join(" ");
  if (v && typeof v === "object") return Object.values(v).map(toText).join(" ");
  return v == null ? "" : String(v);
}

function makeHaystack(parts: unknown[]): { haystack: string; tokens: string[] } {
  const text = parts.map(toText).join(" ").toLowerCase();
  return { haystack: text, tokens: text.split(/[\s\-_/,.()[\]"']+/).filter(Boolean) };
}

function inScope(doc: SearchDoc, scope: SearchScope): boolean {
  if (scope === "all") return true;
  return doc.scopeKey === scope; // certification | inspection
}

function textMatch(doc: SearchDoc, text: string, mode: SearchMode): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return true;
  if (mode === "exact") return doc.haystack.includes(t);
  if (mode === "begin") return doc.tokens.some((tok) => tok.startsWith(t));
  return t.split(/\s+/).every((w) => doc.haystack.includes(w)); // near: 단어별 모두 포함
}

// 조건들을 왼쪽→오른쪽 결합: OR=또는, NOT=제외, 그 외 AND. 각 조건은 자기 범위/모드로 판정.
function matchDoc(doc: SearchDoc, conds: SearchCondition[]): boolean {
  const one = (c: SearchCondition) => inScope(doc, c.scope) && textMatch(doc, c.text, c.mode);
  let res = one(conds[0]);
  for (let i = 1; i < conds.length; i++) {
    const m = one(conds[i]);
    if (conds[i].op === "or") res = res || m;
    else if (conds[i].op === "not") res = res && !m;
    else res = res && m;
  }
  return res;
}

export async function searchSite(opts: {
  conditions: SearchCondition[];
  locale: LocaleCode;
}): Promise<SearchHit[]> {
  const { locale } = opts;
  const conditions = opts.conditions.filter((c) => c.text.trim());
  if (conditions.length === 0) return [];
  const pool = getPool();

  const docs: SearchDoc[] = [];

  // 페이지 (모든 템플릿) --------------------------------------------------------
  {
    const [pageRows] = await pool.query<RowDataPacket[]>(
      "SELECT id, slug, template, parent_id FROM pages WHERE is_published = 1 ORDER BY sort_order",
    );
    const pages = pageRows as unknown as Array<{
      id: number;
      slug: string;
      template: PageTemplate;
      parent_id: number | null;
    }>;
    const slugById = new Map<number, string>();
    for (const p of pages) slugById.set(p.id, p.slug);

    const ids = pages.map((p) => p.id);
    const transByPage = new Map<number, RowDataPacket>();
    if (ids.length) {
      const [transRows] = await pool.query<RowDataPacket[]>(
        "SELECT * FROM page_translations WHERE page_id IN (?) AND locale IN (?)",
        [ids, [locale, DEFAULT_LOCALE]],
      );
      // 요청 로케일 우선, 없으면 기본 로케일.
      for (const t of transRows as RowDataPacket[]) {
        const existing = transByPage.get(t.page_id);
        if (!existing || (t.locale === locale && existing.locale !== locale)) {
          transByPage.set(t.page_id, t);
        }
      }
    }

    for (const p of pages) {
      const t = transByPage.get(p.id);
      if (!t) continue;
      const parentSlug = p.parent_id != null ? slugById.get(p.parent_id) ?? null : null;
      const { haystack, tokens } = makeHaystack([
        t.title,
        t.subtitle,
        t.meta_title,
        t.meta_description,
        t.meta_keywords,
        t.content,
      ]);
      docs.push({
        scopeKey: p.template,
        typeLabel: TEMPLATE_LABEL[p.template],
        title: t.title,
        href: pathForPage(p, locale, parentSlug),
        snippet: t.subtitle || t.meta_description || null,
        context: parentSlug,
        haystack,
        tokens,
      });
    }
  }

  // 게시글 (뉴스/FAQ) ----------------------------------------------------------
  {
    const [postRows] = await pool.query<RowDataPacket[]>(
      "SELECT board_code, slug, title, summary, content FROM posts WHERE is_published = 1 AND locale = ? ORDER BY published_at DESC",
      [locale],
    );
    for (const r of postRows as unknown as Array<{
      board_code: string;
      slug: string;
      title: string;
      summary: string;
      content: string;
    }>) {
      const { haystack, tokens } = makeHaystack([r.title, r.summary, r.content]);
      docs.push({
        scopeKey: "post",
        typeLabel: r.board_code === "faq" ? "FAQ" : "뉴스",
        title: r.title,
        href: buildLocalizedPathImpl(locale, `/${r.board_code}/${r.slug}`),
        snippet: r.summary || null,
        context: null,
        haystack,
        tokens,
      });
    }
  }

  return docs
    .filter((doc) => matchDoc(doc, conditions))
    .slice(0, 100) // ponytail: 상한
    .map((doc) => ({
      type: doc.typeLabel,
      title: doc.title,
      href: doc.href,
      snippet: doc.snippet,
      context: doc.context,
    }));
}

export async function getParentSlug(parentId: number | null): Promise<string | null> {
  if (parentId == null) return null;
  const [rs] = await getPool().query<RowDataPacket[]>(
    "SELECT slug FROM pages WHERE id = ?",
    [parentId],
  );
  return (rs[0] as { slug?: string } | undefined)?.slug ?? null;
}
