import { NextResponse } from "next/server";
import { getPool } from "@/src/lib/db";
import { requireAdmin } from "@/src/lib/auth";
import { sanitizePostHtml } from "@/src/lib/sanitizeHtml";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, { params }: Ctx) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const { id } = await params;

  let body: { name?: string; subject?: string; body_html?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const subject = (body.subject ?? "").trim();
  const html = sanitizePostHtml(body.body_html ?? "");
  if (!name || name.length > 190) {
    return NextResponse.json({ error: "양식 이름을 입력하세요." }, { status: 400 });
  }

  const pool = getPool();
  await pool.execute(
    `UPDATE email_templates SET name = ?, subject = ?, body_html = ? WHERE id = ?`,
    [name, subject.slice(0, 255), html, id],
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const { id } = await params;
  const pool = getPool();
  await pool.execute(`DELETE FROM email_templates WHERE id = ?`, [id]);
  return NextResponse.json({ ok: true });
}
