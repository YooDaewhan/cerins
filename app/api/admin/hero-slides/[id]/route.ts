import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getPool } from "@/src/lib/db";
import { requireAdmin } from "@/src/lib/auth";

interface PatchBody {
  locale?: string;
  eyebrow?: string;
  headline?: string;
  sub?: string;
  image?: string;
  fallback?: string;
  sort_order?: number;
  is_visible?: boolean;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export async function PATCH(req: Request, ctx: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const { id: idRaw } = await ctx.params;
  const id = parseId(idRaw);
  if (id === null) {
    return NextResponse.json({ error: "잘못된 슬라이드 ID 입니다." }, { status: 400 });
  }

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  const sets: string[] = [];
  const params: (string | number)[] = [];
  const STRING_FIELDS: (keyof PatchBody)[] = [
    "locale",
    "eyebrow",
    "headline",
    "sub",
    "image",
    "fallback",
  ];
  for (const k of STRING_FIELDS) {
    const v = body[k];
    if (typeof v === "string") {
      const t = v.trim();
      if (t.length === 0 && k !== "fallback") {
        return NextResponse.json(
          { error: `${k} 은 비울 수 없습니다.` },
          { status: 400 },
        );
      }
      sets.push(`\`${k}\` = ?`);
      params.push(t);
    }
  }
  if (typeof body.sort_order === "number" && Number.isFinite(body.sort_order)) {
    sets.push("sort_order = ?");
    params.push(Math.trunc(body.sort_order));
  }
  if (typeof body.is_visible === "boolean") {
    sets.push("is_visible = ?");
    params.push(body.is_visible ? 1 : 0);
  }
  if (sets.length === 0) {
    return NextResponse.json({ error: "변경할 항목이 없습니다." }, { status: 400 });
  }
  params.push(id);

  try {
    const pool = getPool();
    const [result] = await pool.execute(
      `UPDATE home_slides SET ${sets.join(", ")} WHERE id = ?`,
      params,
    );
    const affected = (result as { affectedRows: number }).affectedRows;
    if (affected === 0) {
      return NextResponse.json({ error: "슬라이드를 찾을 수 없습니다." }, { status: 404 });
    }
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin hero-slide patch error", err);
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
    return NextResponse.json({ error: "잘못된 슬라이드 ID 입니다." }, { status: 400 });
  }

  try {
    const pool = getPool();
    const [result] = await pool.execute(`DELETE FROM home_slides WHERE id = ?`, [id]);
    const affected = (result as { affectedRows: number }).affectedRows;
    if (affected === 0) {
      return NextResponse.json({ error: "슬라이드를 찾을 수 없습니다." }, { status: 404 });
    }
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin hero-slide delete error", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
