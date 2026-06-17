import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type { RowDataPacket } from "mysql2/promise";
import { getPool } from "@/src/lib/db";
import { requireAdmin } from "@/src/lib/auth";

interface PartnerRow extends RowDataPacket {
  id: number;
  name: string;
  logo: string | null;
  website: string | null;
  sort_order: number;
  is_visible: number;
}

interface CreateBody {
  name?: string;
  logo?: string | null;
  website?: string | null;
  sort_order?: number;
  is_visible?: boolean;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const pool = getPool();
  const [rows] = await pool.query<PartnerRow[]>(
    "SELECT * FROM partners ORDER BY sort_order, id",
  );
  return NextResponse.json({
    partners: rows.map((r) => ({
      id: r.id,
      name: r.name,
      logo: r.logo,
      website: r.website,
      sort_order: r.sort_order,
      is_visible: r.is_visible === 1,
    })),
  });
}

function normalizeNullableString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
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

  const name = (body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "파트너 이름은 필수입니다." }, { status: 400 });
  }
  const logo = normalizeNullableString(body.logo);
  const website = normalizeNullableString(body.website);
  const sort_order =
    typeof body.sort_order === "number" && Number.isFinite(body.sort_order)
      ? Math.trunc(body.sort_order)
      : 0;
  const is_visible = body.is_visible === false ? 0 : 1;

  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [maxRow] = await conn.query<RowDataPacket[]>(
      "SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM partners",
    );
    const id = Number((maxRow[0] as { next_id: number }).next_id);
    await conn.execute(
      `INSERT INTO partners (id, name, logo, website, sort_order, is_visible)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, name, logo, website, sort_order, is_visible],
    );
    await conn.commit();
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    await conn.rollback();
    console.error("admin partner create error", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  } finally {
    conn.release();
  }
}
