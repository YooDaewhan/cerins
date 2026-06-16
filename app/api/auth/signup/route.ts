import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getPool } from "@/src/lib/db";
import { setSessionUserId } from "@/src/lib/session";

interface SignupBody {
  login_id?: string;
  password?: string;
  email?: string;
  email_consent?: boolean;
}

const LOGIN_ID_RE = /^[a-zA-Z0-9_]{4,32}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: SignupBody;
  try {
    body = (await req.json()) as SignupBody;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  const login_id = (body.login_id ?? "").trim();
  const password = body.password ?? "";
  const email = (body.email ?? "").trim().toLowerCase();
  const email_consent = body.email_consent === true ? 1 : 0;

  if (!LOGIN_ID_RE.test(login_id)) {
    return NextResponse.json(
      { error: "아이디는 영문/숫자/_ 4-32자여야 합니다." },
      { status: 400 },
    );
  }
  if (password.length < 8 || password.length > 128) {
    return NextResponse.json(
      { error: "비밀번호는 8-128자여야 합니다." },
      { status: 400 },
    );
  }
  if (!EMAIL_RE.test(email) || email.length > 190) {
    return NextResponse.json({ error: "이메일 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const pool = getPool();
  const password_hash = await bcrypt.hash(password, 10);

  try {
    const [result] = await pool.execute(
      `INSERT INTO users (login_id, password_hash, email, email_consent)
       VALUES (?, ?, ?, ?)`,
      [login_id, password_hash, email, email_consent],
    );
    const insertId = (result as { insertId: number }).insertId;
    await setSessionUserId(insertId);
    return NextResponse.json({ ok: true, id: insertId });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "이미 사용 중인 아이디 또는 이메일입니다." },
        { status: 409 },
      );
    }
    console.error("signup error", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
