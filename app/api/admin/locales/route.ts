import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type { RowDataPacket } from "mysql2/promise";
import { getPool } from "@/src/lib/db";
import { requireAdmin } from "@/src/lib/auth";

interface LocaleRow extends RowDataPacket {
  code: string;
  name: string;
  native_name: string;
  is_enabled: number;
  sort_order: number;
}

interface CreateBody {
  code?: string;
  name?: string;
  native_name?: string;
  is_enabled?: boolean;
  sort_order?: number;
}

const CODE_RE = /^[a-z]{2,8}(-[A-Za-z0-9]{2,8})?$/;

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const pool = getPool();
  const [rows] = await pool.query<LocaleRow[]>(
    "SELECT code, name, native_name, is_enabled, sort_order FROM locales ORDER BY sort_order, code",
  );
  return NextResponse.json({
    locales: rows.map((r) => ({
      code: r.code,
      name: r.name,
      native_name: r.native_name,
      is_enabled: r.is_enabled === 1,
      sort_order: r.sort_order,
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

  const code = (body.code ?? "").trim().toLowerCase();
  const name = (body.name ?? "").trim();
  const native_name = (body.native_name ?? "").trim();
  if (!CODE_RE.test(code)) {
    return NextResponse.json(
      { error: "코드는 소문자 2~8자 (예: ko, en, ja, zh-Hant) 이어야 합니다." },
      { status: 400 },
    );
  }
  if (!name || !native_name) {
    return NextResponse.json(
      { error: "언어 이름과 표기명은 필수입니다." },
      { status: 400 },
    );
  }
  const is_enabled = body.is_enabled === false ? 0 : 1;
  const sort_order =
    typeof body.sort_order === "number" && Number.isFinite(body.sort_order)
      ? Math.trunc(body.sort_order)
      : 0;

  const pool = getPool();
  try {
    await pool.execute(
      `INSERT INTO locales (code, name, native_name, is_enabled, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
      [code, name, native_name, is_enabled, sort_order],
    );
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true, code });
  } catch (err) {
    const e = err as { code?: string };
    if (e.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "이미 존재하는 언어 코드입니다." },
        { status: 409 },
      );
    }
    console.error("admin locale create error", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
