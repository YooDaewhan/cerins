import type { Metadata } from "next";
import { requireAdmin } from "@/src/lib/auth";
import AdminUsersClient from "./AdminUsersClient";

export const metadata: Metadata = {
  title: "관리자 - 회원 - CERINS",
};

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  // Layout already enforces admin auth; we just need the current user id here.
  const admin = await requireAdmin();
  if (!admin) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">회원 관리</h2>
      <AdminUsersClient currentUserId={admin.id} />
    </div>
  );
}
