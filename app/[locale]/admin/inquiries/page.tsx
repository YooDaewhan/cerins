import type { Metadata } from "next";
import FeedbackAdminClient from "../feedback/FeedbackAdminClient";

export const metadata: Metadata = {
  title: "관리자 - 문의 - CERINS",
};

export const dynamic = "force-dynamic";

export default function AdminInquiriesPage() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">문의 내역</h2>
      <FeedbackAdminClient kind="inquiry" endpoint="/api/admin/inquiries" />
    </div>
  );
}
