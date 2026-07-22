import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type { RowDataPacket } from "mysql2/promise";
import { getPool } from "@/src/lib/db";
import { requireAdmin } from "@/src/lib/auth";

interface PutBody {
  title?: string;
  subtitle?: string | null;
  hero_image?: string | null;
  content?: unknown;
  meta_title?: string;
  meta_description?: string;
  meta_keywords?: unknown;
}

interface RouteContext {
  params: Promise<{ id: string; locale: string }>;
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

// content는 에디터가 만든 HTML 문자열. JSON 컬럼에 문자열로 저장한다.
function normalizeContent(raw: unknown): string {
  return typeof raw === "string" ? raw : "";
}

// 검색용 태그: 문자열 배열로 정규화(공백제거·빈값제거·중복제거, 최대 30개).
function normalizeKeywords(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const t = item.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
    if (out.length >= 30) break; // ponytail: 태그 상한, 필요하면 상향
  }
  return out;
}

export async function PUT(req: Request, ctx: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const { id: idRaw, locale } = await ctx.params;
  const id = parseId(idRaw);
  if (id === null) {
    return NextResponse.json({ error: "잘못된 페이지 ID 입니다." }, { status: 400 });
  }
  if (!/^[a-z]{2,8}(-[A-Za-z0-9]{2,8})?$/.test(locale)) {
    return NextResponse.json({ error: "잘못된 로케일 입니다." }, { status: 400 });
  }

  let body: PutBody;
  try {
    body = (await req.json()) as PutBody;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  const title = (body.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "제목은 필수입니다." }, { status: 400 });
  }
  const subtitle = normalizeNullableString(body.subtitle);
  const hero_image = normalizeNullableString(body.hero_image);
  const meta_title = (body.meta_title ?? "").trim() || title;
  const meta_description = (body.meta_description ?? "").trim();
  const meta_keywords = normalizeKeywords(body.meta_keywords);
  const content = normalizeContent(body.content);

  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [pageRows] = await conn.query<RowDataPacket[]>(
      "SELECT id FROM pages WHERE id = ?",
      [id],
    );
    if (pageRows.length === 0) {
      await conn.rollback();
      return NextResponse.json(
        { error: "페이지를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    const [existing] = await conn.query<RowDataPacket[]>(
      "SELECT id FROM page_translations WHERE page_id = ? AND locale = ?",
      [id, locale],
    );

    if (existing.length > 0) {
      await conn.execute(
        `UPDATE page_translations
            SET title = ?, subtitle = ?, hero_image = ?, content = ?,
                meta_title = ?, meta_description = ?, meta_keywords = ?
          WHERE page_id = ? AND locale = ?`,
        [
          title,
          subtitle,
          hero_image,
          JSON.stringify(content),
          meta_title,
          meta_description,
          JSON.stringify(meta_keywords),
          id,
          locale,
        ],
      );
    } else {
      const [maxRow] = await conn.query<RowDataPacket[]>(
        "SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM page_translations",
      );
      const newId = Number((maxRow[0] as { next_id: number }).next_id);
      await conn.execute(
        `INSERT INTO page_translations
           (id, page_id, locale, title, subtitle, hero_image, content, meta_title, meta_description, meta_keywords)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newId,
          id,
          locale,
          title,
          subtitle,
          hero_image,
          JSON.stringify(content),
          meta_title,
          meta_description,
          JSON.stringify(meta_keywords),
        ],
      );
    }

    await conn.commit();
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true });
  } catch (err) {
    await conn.rollback();
    console.error("admin page translation upsert error", err);
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
  const { id: idRaw, locale } = await ctx.params;
  const id = parseId(idRaw);
  if (id === null) {
    return NextResponse.json({ error: "잘못된 페이지 ID 입니다." }, { status: 400 });
  }
  if (!/^[a-z]{2,8}(-[A-Za-z0-9]{2,8})?$/.test(locale)) {
    return NextResponse.json({ error: "잘못된 로케일 입니다." }, { status: 400 });
  }

  try {
    const pool = getPool();
    const [result] = await pool.execute(
      "DELETE FROM page_translations WHERE page_id = ? AND locale = ?",
      [id, locale],
    );
    const affected = (result as { affectedRows: number }).affectedRows;
    if (affected === 0) {
      return NextResponse.json(
        { error: "삭제할 번역이 없습니다." },
        { status: 404 },
      );
    }
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin page translation delete error", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
