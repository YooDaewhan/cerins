import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type { RowDataPacket } from "mysql2/promise";
import { getPool } from "@/src/lib/db";
import { requireAdmin } from "@/src/lib/auth";

// 관리자 UI 에서 관리 가능한 site_assets 키 화이트리스트.
// 임의 키 삽입을 막고, 알려진 단일 자산만 읽기/쓰기 허용한다.
const ALLOWED_KEYS = ["default_hero_image", "hero_video"] as const;
type AllowedKey = (typeof ALLOWED_KEYS)[number];

function isAllowedKey(k: unknown): k is AllowedKey {
  return typeof k === "string" && (ALLOWED_KEYS as readonly string[]).includes(k);
}

interface AssetRow extends RowDataPacket {
  key: string;
  value: string;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const pool = getPool();
  const [rows] = await pool.query<AssetRow[]>(
    "SELECT `key`, `value` FROM site_assets",
  );
  const assets: Record<string, string> = {};
  for (const key of ALLOWED_KEYS) assets[key] = "";
  for (const row of rows) {
    if (isAllowedKey(row.key)) assets[row.key] = row.value;
  }
  return NextResponse.json({ assets });
}

interface PatchBody {
  key?: string;
  value?: string;
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  if (!isAllowedKey(body.key)) {
    return NextResponse.json({ error: "허용되지 않은 키입니다." }, { status: 400 });
  }
  const value = typeof body.value === "string" ? body.value.trim() : "";

  try {
    const pool = getPool();
    await pool.execute(
      "INSERT INTO site_assets (`key`, `value`) VALUES (?, ?) " +
        "ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)",
      [body.key, value],
    );
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin site-asset patch error", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
