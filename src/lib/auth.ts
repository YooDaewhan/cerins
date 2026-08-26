import { getPool } from "@/src/lib/db";
import { getSessionUserId } from "@/src/lib/session";
import { isAdminLevel, isStaffLevel } from "@/src/lib/userTypes";
import type { User } from "@/src/lib/types";

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
  account_type: "personal" | "business";
  user_level: number;
  created_at: string;
  updated_at: string;
}

function fromRow(row: UserRow): User {
  return {
    id: row.id,
    login_id: row.login_id,
    email: row.email,
    company: row.company,
    company_phone: row.company_phone,
    company_address: row.company_address,
    job_title: row.job_title,
    country: row.country,
    email_consent: row.email_consent === 1,
    account_type: row.account_type,
    user_level: row.user_level,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function getCurrentUser(): Promise<User | null> {
  const uid = await getSessionUserId();
  if (!uid) return null;
  const pool = getPool();
  const [rows] = await pool.execute(
    `SELECT id, login_id, email, company, company_phone, company_address, job_title, country, email_consent, account_type, user_level, created_at, updated_at
       FROM users WHERE id = ? LIMIT 1`,
    [uid],
  );
  const list = rows as UserRow[];
  return list.length === 0 ? null : fromRow(list[0]);
}

export async function requireAdmin(): Promise<User | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!isAdminLevel(user.user_level)) return null;
  return user;
}

// 로그인한 사용자면 통과(고객 포함). 의뢰 등록/마이페이지 등에 사용.
export async function requireUser(): Promise<User | null> {
  return getCurrentUser();
}

// 직원(7) 또는 관리자(9)만 통과. 의뢰 처리 액션에 사용.
export async function requireStaff(): Promise<User | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!isStaffLevel(user.user_level)) return null;
  return user;
}
