import type { Metadata } from "next";
import PartnersAdminClient from "./PartnersAdminClient";

export const metadata: Metadata = {
  title: "관리자 - 파트너 - CERINS",
};

export const dynamic = "force-dynamic";

export default function AdminPartnersPage() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">파트너 관리</h2>
      <PartnersAdminClient />
    </div>
  );
}
