import { NextResponse } from "next/server";
import { getPool } from "@/src/lib/db";
import { requireAdmin } from "@/src/lib/auth";

interface LogRow {
  id: number;
  subject: string;
  body_html: string;
  recipients: string[]; // mysql2 parses JSON columns automatically
  sent_count: number;
  failed_count: number;
  error: string | null;
  sent_by_login: string | null;
  created_at: string;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const pool = getPool();
  const [rows] = await pool.execute(
    `SELECT l.id, l.subject, l.body_html, l.recipients, l.sent_count, l.failed_count,
            l.error, u.login_id AS sent_by_login, l.created_at
       FROM email_logs l
       LEFT JOIN users u ON u.id = l.sent_by
      ORDER BY l.id DESC
      LIMIT 200`,
  );
  return NextResponse.json({ logs: rows as LogRow[] });
}
