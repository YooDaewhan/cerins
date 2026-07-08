import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getPool } from "@/src/lib/db";
import { setSessionUserId } from "@/src/lib/session";
import {
  defaultLevelForAccountType,
  isAccountType,
  type AccountType,
} from "@/src/lib/userTypes";

interface SignupBody {
  login_id?: string;
  password?: string;
  email?: string;
  company?: string;
  job_title?: string;
  country?: string;
  email_consent?: boolean;
  account_type?: string;
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
  const company = (body.company ?? "").trim() || null;
  const job_title = (body.job_title ?? "").trim() || null;
  const country = (body.country ?? "").trim() || null;
  const email_consent = body.email_consent === true ? 1 : 0;
  const account_type_raw = body.account_type ?? "personal";

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
  if ((company && company.length > 190) || (job_title && job_title.length > 190)) {
    return NextResponse.json(
      { error: "회사명/직위는 190자 이내여야 합니다." },
      { status: 400 },
    );
  }
  if (!isAccountType(account_type_raw)) {
    return NextResponse.json(
      { error: "회원 구분 값이 올바르지 않습니다." },
      { status: 400 },
    );
  }
  const account_type: AccountType = account_type_raw;

  const pool = getPool();

  if (country) {
    const [countryRows] = await pool.execute(
      "SELECT 1 FROM locales WHERE code = ? AND is_enabled = 1 LIMIT 1",
      [country],
    );
    if ((countryRows as unknown[]).length === 0) {
      return NextResponse.json({ error: "국가 값이 올바르지 않습니다." }, { status: 400 });
    }
  }

  const password_hash = await bcrypt.hash(password, 10);

  try {
    const [result] = await pool.execute(
      `INSERT INTO users (login_id, password_hash, email, company, job_title, country, email_consent, account_type, user_level)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        login_id,
        password_hash,
        email,
        company,
        job_title,
        country,
        email_consent,
        account_type,
        defaultLevelForAccountType(account_type),
      ],
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
