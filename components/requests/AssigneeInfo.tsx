import type { UserBrief } from "@/src/lib/serviceRequestTypes";

// 고객용 담당자 안내 카드. 담당자가 지정된 경우에만 노출된다(미지정이면 렌더링하지 않음).
// 모든 의뢰 상세 뷰(TRCU/CEC/제품검사/스크랩)에서 공통으로 사용한다.
export default function AssigneeInfo({ assignee }: { assignee: UserBrief | null }) {
  if (!assignee) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h2 className="text-sm font-bold text-gray-800 mb-3">담당자 안내</h2>
      <p className="text-xs text-gray-500 mb-4">
        의뢰 담당자가 지정되었습니다. 문의사항은 아래 담당자에게 연락해 주세요.
      </p>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <div>
          <dt className="text-[11px] font-semibold text-gray-400 uppercase">담당자</dt>
          <dd className="text-sm text-gray-800">
            {assignee.login_id}
            {assignee.job_title ? ` · ${assignee.job_title}` : ""}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold text-gray-400 uppercase">이메일</dt>
          <dd className="text-sm text-gray-800">
            <a href={`mailto:${assignee.email}`} className="text-(--brand) underline break-all">
              {assignee.email}
            </a>
          </dd>
        </div>
        {assignee.company && (
          <div>
            <dt className="text-[11px] font-semibold text-gray-400 uppercase">소속</dt>
            <dd className="text-sm text-gray-800">{assignee.company}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
