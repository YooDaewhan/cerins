import type { Metadata } from "next";
import FeedbackAdminClient from "../feedback/FeedbackAdminClient";

export const metadata: Metadata = {
  title: "관리자 - 고객만족도 - CERINS",
};

export const dynamic = "force-dynamic";

export default function AdminSatisfactionPage() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">고객 만족도</h2>
      <FeedbackAdminClient kind="satisfaction" endpoint="/api/admin/reviews/satisfaction" />
    </div>
  );
}
