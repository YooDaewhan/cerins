import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type { RowDataPacket } from "mysql2/promise";
import { getPool } from "@/src/lib/db";
import { requireAdmin } from "@/src/lib/auth";
import type { LocaleCode } from "@/src/lib/types";

interface PatchBody {
  parent_id?: number | null;
  page_id?: number | null;
  url?: string | null;
  mega_image_url?: string | null;
  sort_order?: number;
  is_visible?: boolean;
  translations?: Partial<Record<LocaleCode, string>>;
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
  const trimmed = v.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function normalizeNullableInt(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  const n = Math.trunc(v);
  return n > 0 ? n : null;
}

export async function PATCH(req: Request, ctx: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { id: idRaw } = await ctx.params;
  const id = parseId(idRaw);
  if (id === null) {
    return NextResponse.json({ error: "잘못된 메뉴 ID 입니다." }, { status: 400 });
  }

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  const sets: string[] = [];
  const params: (string | number | null)[] = [];

  if ("parent_id" in body) {
    const v = normalizeNullableInt(body.parent_id);
    if (v === id) {
      return NextResponse.json(
        { error: "자기 자신을 상위 메뉴로 지정할 수 없습니다." },
        { status: 400 },
      );
    }
    sets.push("parent_id = ?");
    params.push(v);
  }
  if ("page_id" in body) {
    sets.push("page_id = ?");
    params.push(normalizeNullableInt(body.page_id));
  }
  if ("url" in body) {
    sets.push("url = ?");
    params.push(normalizeNullableString(body.url));
  }
  if ("mega_image_url" in body) {
    sets.push("mega_image_url = ?");
    params.push(normalizeNullableString(body.mega_image_url));
  }
  if (typeof body.sort_order === "number" && Number.isFinite(body.sort_order)) {
    sets.push("sort_order = ?");
    params.push(Math.trunc(body.sort_order));
  }
  if (typeof body.is_visible === "boolean") {
    sets.push("is_visible = ?");
    params.push(body.is_visible ? 1 : 0);
  }

  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    if (sets.length > 0) {
      params.push(id);
      const [result] = await conn.execute(
        `UPDATE menus SET ${sets.join(", ")} WHERE id = ?`,
        params,
      );
      const affected = (result as { affectedRows: number }).affectedRows;
      if (affected === 0) {
        await conn.rollback();
        return NextResponse.json({ error: "메뉴를 찾을 수 없습니다." }, { status: 404 });
      }
    }

    if (body.translations) {
      for (const [locale, label] of Object.entries(body.translations)) {
        const text = (label ?? "").trim();
        if (text.length === 0) {
          await conn.execute(
            "DELETE FROM menu_translations WHERE menu_id = ? AND locale = ?",
            [id, locale],
          );
          continue;
        }
        const [existing] = await conn.query<RowDataPacket[]>(
          "SELECT id FROM menu_translations WHERE menu_id = ? AND locale = ?",
          [id, locale],
        );
        if (existing.length > 0) {
          await conn.execute(
            "UPDATE menu_translations SET label = ? WHERE menu_id = ? AND locale = ?",
            [text, id, locale],
          );
        } else {
          const [maxRow] = await conn.query<RowDataPacket[]>(
            "SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM menu_translations",
          );
          const nextId = Number((maxRow[0] as { next_id: number }).next_id);
          await conn.execute(
            `INSERT INTO menu_translations (id, menu_id, locale, label)
             VALUES (?, ?, ?, ?)`,
            [nextId, id, locale, text],
          );
        }
      }
    }

    await conn.commit();
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    console.error("admin menu patch error", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  } finally {
    conn.release();
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
    return NextResponse.json({ error: "잘못된 메뉴 ID 입니다." }, { status: 400 });
  }

  try {
    const pool = getPool();
    const [result] = await pool.execute(`DELETE FROM menus WHERE id = ?`, [id]);
    const affected = (result as { affectedRows: number }).affectedRows;
    if (affected === 0) {
      return NextResponse.json({ error: "메뉴를 찾을 수 없습니다." }, { status: 404 });
    }
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin menu delete error", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
