import { cookies } from "next/headers";

const COOKIE_NAME = "cerins_uid";
const MAX_AGE = 60 * 60 * 24 * 7;

function isSecureCookie(): boolean {
  if (process.env.COOKIE_SECURE === "true") return true;
  if (process.env.COOKIE_SECURE === "false") return false;
  return process.env.NODE_ENV === "production";
}

export async function setSessionUserId(userId: number): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, String(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureCookie(),
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function getSessionUserId(): Promise<number | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
