import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type { RowDataPacket } from "mysql2/promise";
import { getPool } from "@/src/lib/db";
import { requireAdmin } from "@/src/lib/auth";
import { DEFAULT_LOCALE } from "@/src/lib/i18n";

interface PatchBody {
  name?: string;
  native_name?: string;
  is_enabled?: boolean;
  sort_order?: number;
}

interface RouteContext {
  params: Promise<{ code: string }>;
}

// ponytail: PK code 자체는 수정 불가 — FK RESTRICT 걸린 5개 테이블에 cascade rename 만들 이유 없음.
// 잘못 넣었으면 지우고 새로 추가.

export async function PATCH(req: Request, ctx: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const { code: raw } = await ctx.params;
  const code = raw.toLowerCase();

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  const sets: string[] = [];
  const params: (string | number)[] = [];

  if (typeof body.name === "string") {
    const v = body.name.trim();
    if (!v) return NextResponse.json({ error: "언어 이름은 비울 수 없습니다." }, { status: 400 });
    sets.push("name = ?");
    params.push(v);
  }
  if (typeof body.native_name === "string") {
    const v = body.native_name.trim();
    if (!v) return NextResponse.json({ error: "표기명은 비울 수 없습니다." }, { status: 400 });
    sets.push("native_name = ?");
    params.push(v);
  }
  if (typeof body.is_enabled === "boolean") {
    if (code === DEFAULT_LOCALE && body.is_enabled === false) {
      return NextResponse.json(
        { error: `기본 언어 (${DEFAULT_LOCALE}) 는 비활성화할 수 없습니다.` },
        { status: 400 },
      );
    }
    sets.push("is_enabled = ?");
    params.push(body.is_enabled ? 1 : 0);
  }
  if (typeof body.sort_order === "number" && Number.isFinite(body.sort_order)) {
    sets.push("sort_order = ?");
    params.push(Math.trunc(body.sort_order));
  }
  if (sets.length === 0) {
    return NextResponse.json({ error: "변경할 항목이 없습니다." }, { status: 400 });
  }
  params.push(code);

  try {
    const pool = getPool();
    const [result] = await pool.execute(
      `UPDATE locales SET ${sets.join(", ")} WHERE code = ?`,
      params,
    );
    const affected = (result as { affectedRows: number }).affectedRows;
    if (affected === 0) {
      return NextResponse.json({ error: "언어를 찾을 수 없습니다." }, { status: 404 });
    }
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin locale patch error", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: RouteContext) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const { code: raw } = await ctx.params;
  const code = raw.toLowerCase();

  if (code === DEFAULT_LOCALE) {
    return NextResponse.json(
      { error: `기본 언어 (${DEFAULT_LOCALE}) 는 삭제할 수 없습니다.` },
      { status: 400 },
    );
  }

  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    // 사용 중인 번역/글이 있으면 미리 막고 friendly 메시지 반환 (FK 는 RESTRICT).
    const [[mt], [pt], [posts], [slides]] = await Promise.all([
      conn.query<RowDataPacket[]>(
        "SELECT COUNT(*) AS n FROM menu_translations WHERE locale = ?",
        [code],
      ),
      conn.query<RowDataPacket[]>(
        "SELECT COUNT(*) AS n FROM page_translations WHERE locale = ?",
        [code],
      ),
      conn.query<RowDataPacket[]>(
        "SELECT COUNT(*) AS n FROM posts WHERE locale = ?",
        [code],
      ),
      conn.query<RowDataPacket[]>(
        "SELECT COUNT(*) AS n FROM home_slides WHERE locale = ?",
        [code],
      ),
    ]);
    const counts = {
      menu: Number((mt[0] as { n: number }).n),
      page: Number((pt[0] as { n: number }).n),
      post: Number((posts[0] as { n: number }).n),
      slide: Number((slides[0] as { n: number }).n),
    };
    const used = counts.menu + counts.page + counts.post + counts.slide;
    if (used > 0) {
      return NextResponse.json(
        {
          error: `사용 중인 언어입니다. (메뉴 ${counts.menu} · 페이지 ${counts.page} · 뉴스 ${counts.post} · 슬라이드 ${counts.slide}) 먼저 정리하세요.`,
        },
        { status: 409 },
      );
    }

    const [result] = await conn.execute("DELETE FROM locales WHERE code = ?", [code]);
    const affected = (result as { affectedRows: number }).affectedRows;
    if (affected === 0) {
      return NextResponse.json({ error: "언어를 찾을 수 없습니다." }, { status: 404 });
    }
    revalidatePath("/", "layout");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin locale delete error", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  } finally {
    conn.release();
  }
}
