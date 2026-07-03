import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type { RowDataPacket } from "mysql2/promise";
import { getPool } from "@/src/lib/db";
import { requireAdmin } from "@/src/lib/auth";
import type { PageTemplate } from "@/src/lib/types";

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

interface TransCountRow extends RowDataPacket {
  page_id: number;
  locales: string;
}

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

interface CreateBody {
  slug?: string;
  template?: string;
  parent_id?: number | null;
  sort_order?: number;
  is_published?: boolean;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const pool = getPool();
  const [[pages], [transCounts]] = await Promise.all([
    pool.query<PageRow[]>(
      "SELECT id, slug, template, parent_id, is_published, sort_order, created_at, updated_at FROM pages ORDER BY sort_order, id",
    ),
    pool.query<TransCountRow[]>(
      `SELECT page_id, GROUP_CONCAT(locale ORDER BY locale) AS locales
         FROM page_translations
         GROUP BY page_id`,
    ),
  ]);

  const localesByPage = new Map<number, string[]>();
  for (const r of transCounts) {
    localesByPage.set(r.page_id, r.locales ? r.locales.split(",") : []);
  }

  return NextResponse.json({
    pages: pages.map((p) => ({
      id: p.id,
      slug: p.slug,
      template: p.template,
      parent_id: p.parent_id,
      is_published: p.is_published === 1,
      sort_order: p.sort_order,
      created_at: p.created_at,
      updated_at: p.updated_at,
      translation_locales: localesByPage.get(p.id) ?? [],
    })),
    templates: TEMPLATES,
  });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  const slug = (body.slug ?? "").trim();
  const template = body.template;
  const sort_order =
    typeof body.sort_order === "number" && Number.isFinite(body.sort_order)
      ? Math.trunc(body.sort_order)
      : 0;
  const is_published = body.is_published === false ? 0 : 1;
  const rawParent = body.parent_id;
  const parent_id =
    rawParent == null
      ? null
      : Number.isFinite(rawParent) && (rawParent as number) > 0
        ? Math.trunc(rawParent as number)
        : null;

  if (!SLUG_RE.test(slug) || slug.length > 128) {
    return NextResponse.json(
      { error: "slug은 소문자/숫자/-만 가능합니다." },
      { status: 400 },
    );
  }
  if (!isTemplate(template)) {
    return NextResponse.json(
      { error: "올바른 템플릿이 아닙니다." },
      { status: 400 },
    );
  }

  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    if (parent_id !== null) {
      const [parentRows] = await conn.query<RowDataPacket[]>(
        "SELECT template, parent_id FROM pages WHERE id = ?",
        [parent_id],
      );
      const parent = parentRows[0] as
        | { template: PageTemplate; parent_id: number | null }
        | undefined;
      if (!parent) {
        await conn.rollback();
        return NextResponse.json({ error: "상위 페이지를 찾을 수 없습니다." }, { status: 400 });
      }
      if (parent.template !== template) {
        await conn.rollback();
        return NextResponse.json({ error: "상위 페이지의 템플릿과 일치해야 합니다." }, { status: 400 });
      }
      if (parent.parent_id !== null) {
        await conn.rollback();
        return NextResponse.json({ error: "하위의 하위(2단계 초과)는 지원하지 않습니다." }, { status: 400 });
      }
    }

    const [dup] = await conn.query<RowDataPacket[]>(
      "SELECT id FROM pages WHERE slug = ?",
      [slug],
    );
    if (dup.length > 0) {
      await conn.rollback();
      return NextResponse.json(
        { error: "이미 사용 중인 slug 입니다." },
        { status: 409 },
      );
    }

    const [maxRow] = await conn.query<RowDataPacket[]>(
      "SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM pages",
    );
    const id = Number((maxRow[0] as { next_id: number }).next_id);

    await conn.execute(
      `INSERT INTO pages (id, slug, template, parent_id, is_published, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, slug, template, parent_id, is_published, sort_order],
    );
    await conn.commit();
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    await conn.rollback();
    console.error("admin page create error", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  } finally {
    conn.release();
  }
}
