import { NextResponse } from "next/server";
import { getPool } from "@/src/lib/db";

interface VerifyCodeBody {
  email?: string;
  code?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_RE = /^\d{6}$/;

export async function POST(req: Request) {
  let body: VerifyCodeBody;
  try {
    body = (await req.json()) as VerifyCodeBody;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const code = (body.code ?? "").trim();

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "이메일 형식이 올바르지 않습니다." }, { status: 400 });
  }
  if (!CODE_RE.test(code)) {
    return NextResponse.json({ error: "인증번호는 숫자 6자리여야 합니다." }, { status: 400 });
  }

  const pool = getPool();
  const [rows] = await pool.execute(
    "SELECT code, (expires_at < NOW()) AS expired FROM email_verifications WHERE email = ? LIMIT 1",
    [email],
  );
  const row = (rows as { code: string; expired: number }[])[0];

  if (!row) {
    return NextResponse.json(
      { error: "인증번호를 먼저 발송해 주세요." },
      { status: 400 },
    );
  }
  if (row.expired) {
    return NextResponse.json(
      { error: "인증번호가 만료되었습니다. 다시 발송해 주세요." },
      { status: 400 },
    );
  }
  if (row.code !== code) {
    return NextResponse.json({ error: "인증번호가 일치하지 않습니다." }, { status: 400 });
  }

  await pool.execute(
    "UPDATE email_verifications SET verified_at = NOW() WHERE email = ?",
    [email],
  );

  return NextResponse.json({ ok: true });
}
