import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getPool } from "@/src/lib/db";
import { requireAdmin } from "@/src/lib/auth";

interface PatchBody {
  name?: string;
  logo?: string | null;
  website?: string | null;
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

function normalizeNullableString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}

export async function PATCH(req: Request, ctx: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const { id: idRaw } = await ctx.params;
  const id = parseId(idRaw);
  if (id === null) {
    return NextResponse.json({ error: "잘못된 파트너 ID 입니다." }, { status: 400 });
  }

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  const sets: string[] = [];
  const params: (string | number | null)[] = [];

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json(
        { error: "파트너 이름은 비울 수 없습니다." },
        { status: 400 },
      );
    }
    sets.push("name = ?");
    params.push(name);
  }
  if ("logo" in body) {
    sets.push("logo = ?");
    params.push(normalizeNullableString(body.logo));
  }
  if ("website" in body) {
    sets.push("website = ?");
    params.push(normalizeNullableString(body.website));
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
      `UPDATE partners SET ${sets.join(", ")} WHERE id = ?`,
      params,
    );
    const affected = (result as { affectedRows: number }).affectedRows;
    if (affected === 0) {
      return NextResponse.json({ error: "파트너를 찾을 수 없습니다." }, { status: 404 });
    }
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin partner patch error", err);
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
    return NextResponse.json({ error: "잘못된 파트너 ID 입니다." }, { status: 400 });
  }
  try {
    const pool = getPool();
    const [result] = await pool.execute(`DELETE FROM partners WHERE id = ?`, [id]);
    const affected = (result as { affectedRows: number }).affectedRows;
    if (affected === 0) {
      return NextResponse.json({ error: "파트너를 찾을 수 없습니다." }, { status: 404 });
    }
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin partner delete error", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
