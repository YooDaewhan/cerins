import { NextResponse } from "next/server";
import { getPool } from "@/src/lib/db";
import { requireAdmin } from "@/src/lib/auth";
import { sanitizePostHtml } from "@/src/lib/sanitizeHtml";

interface TemplateRow {
  id: number;
  name: string;
  subject: string;
  body_html: string;
  created_at: string;
  updated_at: string;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const pool = getPool();
  const [rows] = await pool.execute(
    `SELECT id, name, subject, body_html, created_at, updated_at
       FROM email_templates ORDER BY updated_at DESC`,
  );
  return NextResponse.json({ templates: rows as TemplateRow[] });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

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
  const [result] = await pool.execute(
    `INSERT INTO email_templates (name, subject, body_html) VALUES (?, ?, ?)`,
    [name, subject.slice(0, 255), html],
  );
  return NextResponse.json({ ok: true, id: (result as { insertId: number }).insertId });
}
