import { NextResponse } from "next/server";
import { getPool } from "@/src/lib/db";
import { sendMailSafe } from "@/src/lib/mail";

interface SendCodeBody {
  email?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_TTL_SECONDS = 5 * 60;

export async function POST(req: Request) {
  let body: SendCodeBody;
  try {
    body = (await req.json()) as SendCodeBody;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 190) {
    return NextResponse.json({ error: "이메일 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const pool = getPool();

  const [userRows] = await pool.execute("SELECT 1 FROM users WHERE email = ? LIMIT 1", [email]);
  if ((userRows as unknown[]).length > 0) {
    return NextResponse.json({ error: "이미 가입된 이메일입니다." }, { status: 409 });
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));

  await pool.execute(
    `INSERT INTO email_verifications (email, code, expires_at, verified_at)
     VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND), NULL)
     ON DUPLICATE KEY UPDATE code = VALUES(code), expires_at = VALUES(expires_at), verified_at = NULL`,
    [email, code, CODE_TTL_SECONDS],
  );

  const { ok, error } = await sendMailSafe({
    to: email,
    subject: "[Cerins] 이메일 인증번호",
    text: `이메일 인증번호는 [${code}] 입니다. 5분 이내에 입력해 주세요.`,
    html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1a1a2e">
      <h2 style="color:#B4123A">이메일 인증번호</h2>
      <p>아래 인증번호를 5분 이내에 입력해 주세요.</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:4px">${code}</p>
    </div>`,
    context: `EMAIL_VERIFICATION ${email}`,
  });

  if (!ok) {
    return NextResponse.json(
      { error: error ?? "인증 메일 발송에 실패했습니다." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
