import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type { RowDataPacket } from "mysql2/promise";
import { getPool } from "@/src/lib/db";
import { requireAdmin } from "@/src/lib/auth";

interface SlideRow extends RowDataPacket {
  id: number;
  locale: string;
  eyebrow: string;
  headline: string;
  sub: string;
  image: string;
  fallback: string;
  sort_order: number;
  is_visible: number;
}

interface LocaleRow extends RowDataPacket {
  code: string;
  name: string;
  native_name: string;
  is_enabled: number;
  sort_order: number;
}

interface CreateBody {
  locale?: string;
  eyebrow?: string;
  headline?: string;
  sub?: string;
  image?: string;
  fallback?: string;
  sort_order?: number;
  is_visible?: boolean;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const pool = getPool();
  const [[rows], [localeRows]] = await Promise.all([
    pool.query<SlideRow[]>(
      "SELECT * FROM home_slides ORDER BY locale, sort_order, id",
    ),
    pool.query<LocaleRow[]>(
      "SELECT * FROM locales WHERE is_enabled = 1 ORDER BY sort_order",
    ),
  ]);

  return NextResponse.json({
    slides: rows.map((r) => ({
      id: r.id,
      locale: r.locale,
      eyebrow: r.eyebrow,
      headline: r.headline,
      sub: r.sub,
      image: r.image,
      fallback: r.fallback,
      sort_order: r.sort_order,
      is_visible: r.is_visible === 1,
    })),
    locales: localeRows.map((l) => ({
      code: l.code,
      name: l.name,
      native_name: l.native_name,
    })),
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

  const locale = (body.locale ?? "").trim();
  const eyebrow = (body.eyebrow ?? "").trim();
  const headline = (body.headline ?? "").trim();
  const sub = (body.sub ?? "").trim();
  const image = (body.image ?? "").trim();
  const fallback = (body.fallback ?? "#000000").trim();
  const sort_order =
    typeof body.sort_order === "number" && Number.isFinite(body.sort_order)
      ? Math.trunc(body.sort_order)
      : 0;
  const is_visible = body.is_visible === false ? 0 : 1;

  if (!locale || !eyebrow || !headline || !sub || !image) {
    return NextResponse.json(
      { error: "locale, eyebrow, headline, sub, image 은 필수입니다." },
      { status: 400 },
    );
  }

  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [maxRow] = await conn.query<RowDataPacket[]>(
      "SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM home_slides",
    );
    const id = Number((maxRow[0] as { next_id: number }).next_id);

    await conn.execute(
      `INSERT INTO home_slides (id, locale, eyebrow, headline, sub, image, fallback, sort_order, is_visible)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, locale, eyebrow, headline, sub, image, fallback, sort_order, is_visible],
    );
    await conn.commit();
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, id });
  } catch (err: unknown) {
    await conn.rollback();
    const e = err as { code?: string };
    if (e.code === "ER_NO_REFERENCED_ROW_2" || e.code === "ER_NO_REFERENCED_ROW") {
      return NextResponse.json(
        { error: "사용할 수 없는 로케일입니다." },
        { status: 400 },
      );
    }
    console.error("admin hero-slide create error", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  } finally {
    conn.release();
  }
}
