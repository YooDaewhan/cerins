import { getPool } from "@/src/lib/db";
import { getSessionUserId } from "@/src/lib/session";
import { isAdminLevel } from "@/src/lib/userTypes";
import type { User } from "@/src/lib/types";

interface UserRow {
  id: number;
  login_id: string;
  email: string;
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
    `SELECT id, login_id, email, email_consent, account_type, user_level, created_at, updated_at
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
