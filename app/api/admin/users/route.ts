import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getPool } from "@/src/lib/db";
import { requireAdmin } from "@/src/lib/auth";
import {
  DEFAULT_USER_LEVEL,
  isAccountType,
  type AccountType,
} from "@/src/lib/userTypes";

interface CreateBody {
  login_id?: string;
  password?: string;
  email?: string;
  email_consent?: boolean;
  account_type?: string;
  user_level?: number;
}

interface UserRow {
  id: number;
  login_id: string;
  email: string;
  company: string | null;
  company_phone: string | null;
  company_address: string | null;
  job_title: string | null;
  country: string | null;
  email_consent: number;
  account_type: AccountType;
  user_level: number;
  created_at: string;
  updated_at: string;
}

const LOGIN_ID_RE = /^[a-zA-Z0-9_]{4,32}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const pool = getPool();
  const [rows] = await pool.execute(
    `SELECT id, login_id, email, company, company_phone, company_address, job_title, country, email_consent, account_type, user_level, created_at, updated_at
       FROM users ORDER BY id DESC`,
  );
  const list = (rows as UserRow[]).map((r) => ({
    id: r.id,
    login_id: r.login_id,
    email: r.email,
    company: r.company,
    company_phone: r.company_phone,
    company_address: r.company_address,
    job_title: r.job_title,
    country: r.country,
    email_consent: r.email_consent === 1,
    account_type: r.account_type,
    user_level: r.user_level,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
  return NextResponse.json({ users: list });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  const login_id = (body.login_id ?? "").trim();
  const password = body.password ?? "";
  const email = (body.email ?? "").trim().toLowerCase();
  const email_consent = body.email_consent === true ? 1 : 0;
  const account_type_raw = body.account_type ?? "personal";
  const user_level =
    typeof body.user_level === "number" && Number.isFinite(body.user_level)
      ? Math.trunc(body.user_level)
      : DEFAULT_USER_LEVEL;

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
  if (!isAccountType(account_type_raw)) {
    return NextResponse.json(
      { error: "회원 구분 값이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const password_hash = await bcrypt.hash(password, 10);

  try {
    const pool = getPool();
    const [result] = await pool.execute(
      `INSERT INTO users (login_id, password_hash, email, email_consent, account_type, user_level)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [login_id, password_hash, email, email_consent, account_type_raw, user_level],
    );
    const insertId = (result as { insertId: number }).insertId;
    return NextResponse.json({ ok: true, id: insertId });
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { error: "이미 사용 중인 아이디 또는 이메일입니다." },
        { status: 409 },
      );
    }
    console.error("admin user create error", err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}
