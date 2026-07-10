import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type { RowDataPacket } from "mysql2/promise";
import { getPool } from "@/src/lib/db";
import { requireAdmin } from "@/src/lib/auth";
import type { PageContentBlock, PageTemplate } from "@/src/lib/types";

const TEMPLATES: PageTemplate[] = [
  "home",
  "about",
  "certification",
  "inspection",
  "services",
  "news_list",
  "contact",
  "simple",
];

function isTemplate(v: unknown): v is PageTemplate {
  return typeof v === "string" && (TEMPLATES as string[]).includes(v);
}

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

interface PageRow extends RowDataPacket {
  id: number;
  slug: string;
  template: PageTemplate;
  parent_id: number | null;
  is_published: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface TransRow extends RowDataPacket {
  id: number;
  page_id: number;
  locale: string;
  title: string;
  subtitle: string | null;
  hero_image: string | null;
  content: string | PageContentBlock[];
  meta_title: string;
  meta_description: string;
  meta_keywords: string | string[] | null;
  created_at: string;
  updated_at: string;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function normalizeContent(raw: string | PageContentBlock[]): PageContentBlock[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as PageContentBlock[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeKeywords(raw: string | string[] | null): string[] {
  const arr =
    typeof raw === "string"
      ? (() => {
          try {
            return JSON.parse(raw);
          } catch {
            return [];
          }
        })()
      : raw;
  return Array.isArray(arr) ? arr.filter((s): s is string => typeof s === "string") : [];
}

export async function GET(_req: Request, ctx: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const { id: idRaw } = await ctx.params;
  const id = parseId(idRaw);
  if (id === null) {
    return NextResponse.json({ error: "잘못된 페이지 ID 입니다." }, { status: 400 });
  }

  const pool = getPool();
  const [[pageRows], [transRows]] = await Promise.all([
    pool.query<PageRow[]>("SELECT * FROM pages WHERE id = ?", [id]),
    pool.query<TransRow[]>("SELECT * FROM page_translations WHERE page_id = ?", [id]),
  ]);

  if (pageRows.length === 0) {
    return NextResponse.json({ error: "페이지를 찾을 수 없습니다." }, { status: 404 });
  }
  const p = pageRows[0];
  return NextResponse.json({
    page: {
      id: p.id,
      slug: p.slug,
      template: p.template,
      parent_id: p.parent_id,
      is_published: p.is_published === 1,
      sort_order: p.sort_order,
      created_at: p.created_at,
      updated_at: p.updated_at,
    },
    translations: transRows.map((t) => ({
      id: t.id,
      page_id: t.page_id,
      locale: t.locale,
      title: t.title,
      subtitle: t.subtitle,
      hero_image: t.hero_image,
      content: normalizeContent(t.content),
      meta_title: t.meta_title,
      meta_description: t.meta_description,
      meta_keywords: normalizeKeywords(t.meta_keywords),
    })),
  });
}

interface PatchBody {
  slug?: string;
  template?: string;
  parent_id?: number | null;
  sort_order?: number;
  is_published?: boolean;
}

export async function PATCH(req: Request, ctx: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const { id: idRaw } = await ctx.params;
  const id = parseId(idRaw);
  if (id === null) {
    return NextResponse.json({ error: "잘못된 페이지 ID 입니다." }, { status: 400 });
  }

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  const sets: string[] = [];
  const params: (string | number | null)[] = [];

  if (typeof body.slug === "string") {
    const slug = body.slug.trim();
    if (!SLUG_RE.test(slug) || slug.length > 128) {
      return NextResponse.json(
        { error: "slug은 소문자/숫자/-만 가능합니다." },
        { status: 400 },
      );
    }
    sets.push("slug = ?");
    params.push(slug);
  }
  if (typeof body.template === "string") {
    if (!isTemplate(body.template)) {
      return NextResponse.json(
        { error: "올바른 템플릿이 아닙니다." },
        { status: 400 },
      );
    }
    sets.push("template = ?");
    params.push(body.template);
  }
  if (typeof body.sort_order === "number" && Number.isFinite(body.sort_order)) {
    sets.push("sort_order = ?");
    params.push(Math.trunc(body.sort_order));
  }
  if (typeof body.is_published === "boolean") {
    sets.push("is_published = ?");
    params.push(body.is_published ? 1 : 0);
  }
  if (body.parent_id !== undefined) {
    const raw = body.parent_id;
    const parent_id =
      raw === null
        ? null
        : Number.isFinite(raw) && (raw as number) > 0
          ? Math.trunc(raw as number)
          : null;

    if (parent_id !== null) {
      if (parent_id === id) {
        return NextResponse.json({ error: "자기 자신을 상위로 지정할 수 없습니다." }, { status: 400 });
      }
      const pool = getPool();
      const [parentRows] = await pool.query<RowDataPacket[]>(
        "SELECT template, parent_id FROM pages WHERE id = ?",
        [parent_id],
      );
      const parent = parentRows[0] as
        | { template: PageTemplate; parent_id: number | null }
        | undefined;
      if (!parent) {
        return NextResponse.json({ error: "상위 페이지를 찾을 수 없습니다." }, { status: 400 });
      }
      if (parent.parent_id !== null) {
        return NextResponse.json({ error: "하위의 하위(2단계 초과)는 지원하지 않습니다." }, { status: 400 });
      }
      // 자식이 이미 있는 페이지는 자식이 될 수 없음(2단계 제한)
      const [childRows] = await pool.query<RowDataPacket[]>(
        "SELECT COUNT(*) AS n FROM pages WHERE parent_id = ?",
        [id],
      );
      if (Number((childRows[0] as { n: number }).n) > 0) {
        return NextResponse.json(
          { error: "하위 페이지가 있는 페이지는 다른 페이지의 하위가 될 수 없습니다." },
          { status: 400 },
        );
      }
    }
    sets.push("parent_id = ?");
    params.push(parent_id);
  }
  if (sets.length === 0) {
    return NextResponse.json({ error: "변경할 항목이 없습니다." }, { status: 400 });
  }
  params.push(id);

  try {
    const pool = getPool();
    const [result] = await pool.execute(
      `UPDATE pages SET ${sets.join(", ")} WHERE id = ?`,
      params,
    );
    const affected = (result as { affectedRows: number }).affectedRows;
    if (affected === 0) {
      return NextResponse.json({ error: "페이지를 찾을 수 없습니다." }, { status: 404 });
    }
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "이미 사용 중인 slug 입니다." },
        { status: 409 },
      );
    }
    console.error("admin page patch error", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const { id: idRaw } = await ctx.params;
  const id = parseId(idRaw);
  if (id === null) {
    return NextResponse.json({ error: "잘못된 페이지 ID 입니다." }, { status: 400 });
  }
  try {
    const pool = getPool();
    const [result] = await pool.execute("DELETE FROM pages WHERE id = ?", [id]);
    const affected = (result as { affectedRows: number }).affectedRows;
    if (affected === 0) {
      return NextResponse.json({ error: "페이지를 찾을 수 없습니다." }, { status: 404 });
    }
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin page delete error", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
