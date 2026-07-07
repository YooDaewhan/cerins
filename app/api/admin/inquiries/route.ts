import { NextResponse } from "next/server";
import { getPool } from "@/src/lib/db";
import { requireAdmin } from "@/src/lib/auth";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  try {
    const pool = getPool();
    const [rows] = await pool.execute(
      `SELECT id, name, company, department, country, email, website, phone, subject, message, created_at
         FROM inquiries ORDER BY id DESC LIMIT 500`,
    );
    return NextResponse.json({ items: rows });
  } catch (err) {
    console.error("admin inquiries list error", err);
    return NextResponse.json({ error: "목록을 불러오지 못했습니다." }, { status: 500 });
  }
}
