import { NextResponse } from "next/server";
import { getPool } from "@/src/lib/db";
import { requireAdmin } from "@/src/lib/auth";
import { sanitizePostHtml } from "@/src/lib/sanitizeHtml";
import { sendMailSafe } from "@/src/lib/mail";

interface SendBody {
  user_ids?: number[];
  subject?: string;
  body_html?: string;
}

// html 본문에서 대략적인 text 대체본 생성(메일 클라이언트 fallback용).
function htmlToText(html: string): string {
  return html
    .replace(/<\/(p|div|h[1-4]|li|tr)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  let body: SendBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  const ids = Array.isArray(body.user_ids)
    ? body.user_ids.filter((n) => Number.isInteger(n))
    : [];
  const subject = (body.subject ?? "").trim();
  const html = sanitizePostHtml(body.body_html ?? "");

  if (ids.length === 0) {
    return NextResponse.json({ error: "수신자를 선택하세요." }, { status: 400 });
  }
  if (!subject) {
    return NextResponse.json({ error: "제목을 입력하세요." }, { status: 400 });
  }
  if (!html) {
    return NextResponse.json({ error: "본문을 입력하세요." }, { status: 400 });
  }

  const pool = getPool();
  // 수신 동의(email_consent=1)한 회원만 대상으로 필터 — 서버 측 강제.
  const placeholders = ids.map(() => "?").join(",");
  const [rows] = await pool.execute(
    `SELECT email FROM users WHERE id IN (${placeholders}) AND email_consent = 1`,
    ids,
  );
  const emails = (rows as { email: string }[]).map((r) => r.email);
  if (emails.length === 0) {
    return NextResponse.json(
      { error: "수신 동의한 대상이 없습니다." },
      { status: 400 },
    );
  }

  const text = htmlToText(html);
  let sent = 0;
  let failed = 0;
  let firstError: string | null = null;
  // ponytail: 순차 발송(관리자 트리거, 수백 명 수준). 대량이면 큐/배치로 승격.
  for (const to of emails) {
    const { ok, error } = await sendMailSafe({
      to,
      subject,
      text,
      html,
      context: `ADMIN_BULK ${to}`,
    });
    if (ok) sent++;
    else {
      failed++;
      if (!firstError) firstError = error ?? "unknown";
    }
  }

  await pool.execute(
    `INSERT INTO email_logs (subject, body_html, recipients, sent_count, failed_count, error, sent_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [subject, html, JSON.stringify(emails), sent, failed, firstError, admin.id],
  );

  return NextResponse.json({ ok: true, sent, failed, total: emails.length });
}
