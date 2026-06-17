import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { getPool } from "@/src/lib/db";
import { requireAdmin } from "@/src/lib/auth";
import type { LocaleCode } from "@/src/lib/types";

interface MenuRow extends RowDataPacket {
  id: number;
  parent_id: number | null;
  page_id: number | null;
  url: string | null;
  mega_image_url: string | null;
  sort_order: number;
  is_visible: number;
  created_at: string;
  updated_at: string;
}

interface TransRow extends RowDataPacket {
  menu_id: number;
  locale: string;
  label: string;
}

interface PageRow extends RowDataPacket {
  id: number;
  slug: string;
  template: string;
  label: string | null;
}

interface LocaleRow extends RowDataPacket {
  code: LocaleCode;
  name: string;
  native_name: string;
  is_enabled: number;
  sort_order: number;
}

interface CreateBody {
  parent_id?: number | null;
  page_id?: number | null;
  url?: string | null;
  mega_image_url?: string | null;
  sort_order?: number;
  is_visible?: boolean;
  translations?: Partial<Record<LocaleCode, string>>;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const pool = getPool();
  const [[menuRows], [transRows], [pageRows], [localeRows]] = await Promise.all([
    pool.query<MenuRow[]>("SELECT * FROM menus ORDER BY sort_order, id"),
    pool.query<TransRow[]>("SELECT menu_id, locale, label FROM menu_translations"),
    pool.query<PageRow[]>(
      `SELECT p.id, p.slug, p.template, pt.title AS label
         FROM pages p
         LEFT JOIN page_translations pt
           ON pt.page_id = p.id AND pt.locale = 'ko'
         WHERE p.is_published = 1
         ORDER BY p.sort_order, p.id`,
    ),
    pool.query<LocaleRow[]>(
      "SELECT * FROM locales WHERE is_enabled = 1 ORDER BY sort_order",
    ),
  ]);

  const transByMenu = new Map<number, Record<string, string>>();
  for (const t of transRows) {
    const map = transByMenu.get(t.menu_id) ?? {};
    map[t.locale] = t.label;
    transByMenu.set(t.menu_id, map);
  }

  const menus = menuRows.map((m) => ({
    id: m.id,
    parent_id: m.parent_id,
    page_id: m.page_id,
    url: m.url,
    mega_image_url: m.mega_image_url,
    sort_order: m.sort_order,
    is_visible: m.is_visible === 1,
    translations: transByMenu.get(m.id) ?? {},
  }));

  return NextResponse.json({
    menus,
    pages: pageRows,
    locales: localeRows.map((l) => ({
      code: l.code,
      name: l.name,
      native_name: l.native_name,
      is_enabled: l.is_enabled === 1,
      sort_order: l.sort_order,
    })),
  });
}

function normalizeNullableString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function normalizeNullableInt(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  const n = Math.trunc(v);
  return n > 0 ? n : null;
}

async function nextId(conn: PoolConnection, table: string): Promise<number> {
  const [rows] = await conn.query<RowDataPacket[]>(
    `SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM ${table}`,
  );
  return Number((rows[0] as { next_id: number }).next_id);
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

  const parent_id = normalizeNullableInt(body.parent_id);
  const page_id = normalizeNullableInt(body.page_id);
  const url = normalizeNullableString(body.url);
  const mega_image_url = normalizeNullableString(body.mega_image_url);
  const sort_order =
    typeof body.sort_order === "number" && Number.isFinite(body.sort_order)
      ? Math.trunc(body.sort_order)
      : 0;
  const is_visible = body.is_visible === false ? 0 : 1;
  const translations = body.translations ?? {};

  const koLabel = (translations.ko ?? "").trim();
  if (!koLabel) {
    return NextResponse.json(
      { error: "한국어 라벨은 필수입니다." },
      { status: 400 },
    );
  }

  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    if (parent_id !== null) {
      const [parentRows] = await conn.query<RowDataPacket[]>(
        "SELECT id FROM menus WHERE id = ?",
        [parent_id],
      );
      if (parentRows.length === 0) {
        await conn.rollback();
        return NextResponse.json(
          { error: "상위 메뉴를 찾을 수 없습니다." },
          { status: 400 },
        );
      }
    }

    const menuId = await nextId(conn, "menus");
    await conn.execute(
      `INSERT INTO menus (id, parent_id, page_id, url, mega_image_url, sort_order, is_visible)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [menuId, parent_id, page_id, url, mega_image_url, sort_order, is_visible],
    );

    let transId = await nextId(conn, "menu_translations");
    for (const [locale, label] of Object.entries(translations)) {
      const text = (label ?? "").trim();
      if (!text) continue;
      await conn.execute(
        `INSERT INTO menu_translations (id, menu_id, locale, label)
         VALUES (?, ?, ?, ?)`,
        [transId, menuId, locale, text],
      );
      transId += 1;
    }

    await conn.commit();
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, id: menuId });
  } catch (err) {
    await conn.rollback();
    console.error("admin menu create error", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  } finally {
    conn.release();
  }
}
