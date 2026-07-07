import type { Metadata } from "next";
import FeedbackAdminClient from "../feedback/FeedbackAdminClient";

export const metadata: Metadata = {
  title: "관리자 - 직원평가 - CERINS",
};

export const dynamic = "force-dynamic";

export default function AdminStaffEvaluationsPage() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">직원 평가</h2>
      <FeedbackAdminClient kind="staff" endpoint="/api/admin/reviews/staff" />
    </div>
  );
}
