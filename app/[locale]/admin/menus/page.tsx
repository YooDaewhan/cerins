import type { Metadata } from "next";
import MenusAdminClient from "./MenusAdminClient";

export const metadata: Metadata = {
  title: "관리자 - 메뉴 - CERINS",
};

export const dynamic = "force-dynamic";

export default function AdminMenusPage() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">메뉴 관리</h2>
      <MenusAdminClient />
    </div>
  );
}
