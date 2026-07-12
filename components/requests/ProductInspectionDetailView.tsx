"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { PAYMENT_STATUS_LABELS, MESSAGE_TYPE_LABELS } from "@/src/lib/serviceRequestTypes";
import {
  UploadFields,
  type UploadFieldsHandle,
} from "@/components/requests/UploadFields";
import {
  PI_STATUS_LABELS,
  PI_CUSTOMER_STATUS_LABELS,
  PI_MILESTONES,
  PI_SUBMISSION_METHODS,
  PI_SUBMISSION_METHOD_LABELS,
  piFileTypeLabel,
  type PiStatus,
} from "@/src/lib/productInspectionTypes";
import CurrencyPicker from "@/components/requests/CurrencyPicker";
import type { PiAction } from "@/src/lib/productInspectionWorkflow";
import type { ProductInspectionDetailBundle } from "@/src/lib/productInspectionRequestDetail";
import AssigneeInfo from "@/components/requests/AssigneeInfo";

interface StaffCandidate { id: number; login_id: string; email: string; user_level: number }

interface Props {
  bundle: ProductInspectionDetailBundle;
}

export default function ProductInspectionDetailView({ bundle }: Props) {
  const { request: r, role, files, inspection, payments, messages, histories, block, actions } = bundle;
  const isInternal = role === "STAFF" || role === "ADMIN";

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openForm, setOpenForm] = useState<string | null>(null);

  async function runAction(body: Record<string, unknown>): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/requests/${r.id}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) { setError(data.error ?? "처리에 실패했습니다."); return false; }
      window.location.reload();
      return true;
    } catch {
      setError("네트워크 오류가 발생했습니다."); return false;
    } finally { setBusy(false); }
  }

  const activeMilestone = PI_MILESTONES.findIndex((m) => m.statuses.includes(r.status as PiStatus));

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-mono text-gray-400">{r.request_number ?? "접수번호 미발급"}</p>
            <h1 className="text-xl font-bold text-(--brand) mt-1">{r.title}</h1>
            <p className="text-xs text-gray-500 mt-1">제품검사</p>
          </div>
          <span className="rounded-full bg-(--brand)/10 text-(--brand) text-xs font-semibold px-3 py-1">
            {isInternal
              ? `${PI_STATUS_LABELS[r.status as PiStatus] ?? r.status} (step ${r.workflow_step})`
              : PI_CUSTOMER_STATUS_LABELS[r.status as PiStatus] ?? r.status}
          </span>
        </div>
        <div className="mt-5 flex items-center gap-1">
          {PI_MILESTONES.map((m, i) => (
            <div key={m.label} className="flex-1">
              <div className={`h-1.5 rounded-full ${i <= activeMilestone ? "bg-(--brand)" : "bg-gray-200"}`} />
              <p className={`text-[10px] mt-1 ${i === activeMilestone ? "text-(--brand) font-semibold" : "text-gray-400"}`}>{m.label}</p>
            </div>
          ))}
        </div>
      </div>

      {error && <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2">{error}</div>}

      {/* 검사 보류 안내 */}
      {block && (block.customer_visible || isInternal) && (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <b>검사 진행 보류</b>
          {block.needed_action && <div className="mt-1">필요한 조치: {block.needed_action}</div>}
          {isInternal && block.resume_status && (
            <div className="text-[11px] mt-1 text-amber-600">해결 후 복귀: {PI_STATUS_LABELS[block.resume_status as PiStatus] ?? block.resume_status}</div>
          )}
        </div>
      )}

      {/* 신청 정보 */}
      <Card title="신청 정보">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Info label="회사명" value={r.company_name} />
          <Info label="담당자(고객)" value={`${r.contact_name} / ${r.contact_phone}`} />
          <Info label="이메일" value={r.contact_email} />
          <Info label="신청일" value={r.submitted_at ?? r.created_at} />
          {isInternal && <Info label="담당 직원" value={bundle.assignee?.login_id ?? "미지정"} />}
          {r.completed_at && <Info label="업무 완료일" value={r.completed_at} />}
        </dl>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 mb-1">의뢰 내용</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.description}</p>
        </div>
      </Card>

      {/* 담당자 안내 (고객 전용, 지정된 경우만) */}
      {!isInternal && <AssigneeInfo assignee={bundle.assignee} />}

      {/* 반려/보완 사유 */}
      {messages.filter((m) => m.message_type === "REJECTION").length > 0 && (
        <Card title="보완 요청 사유">
          <ul className="space-y-2">
            {messages.filter((m) => m.message_type === "REJECTION").map((m) => (
              <li key={m.id} className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{m.message}</p>
                <p className="text-[10px] text-gray-400 mt-1">{m.created_at}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* 검사 일정 */}
      {inspection && (inspection.planned_start_date || inspection.actual_start_date) && (
        <Card title="검사 일정">
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
            <Info label="검사 시작(예정)" value={inspection.planned_start_date ?? "-"} />
            <Info label="검사 종료(예정)" value={inspection.planned_end_date ?? "-"} />
            <Info label="예정 시간" value={timeRange(inspection.planned_start_time, inspection.planned_end_time)} />
            {inspection.inspection_location && <Info label="검사 장소" value={inspection.inspection_location} />}
            {inspection.actual_start_date && <Info label="검사 시작(실제)" value={inspection.actual_start_date} />}
            {inspection.actual_end_date && <Info label="검사 완료일" value={inspection.actual_end_date} />}
            {(inspection.actual_start_time || inspection.actual_end_time) && (
              <Info label="실제 시간" value={timeRange(inspection.actual_start_time, inspection.actual_end_time)} />
            )}
            {inspection.report_submitted_at && <Info label="리포트 제출일" value={inspection.report_submitted_at} />}
          </dl>
        </Card>
      )}

      {/* 외부 인증기관 리포트 제출 정보 (내부 전용) */}
      {isInternal && inspection?.external_agency_name && (
        <Card title="외부 인증기관 리포트 제출 (내부)">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Info label="전달 인증기관" value={inspection.external_agency_name} />
            {inspection.external_agency_department && <Info label="담당 부서" value={inspection.external_agency_department} />}
            {inspection.external_agency_contact_name && <Info label="담당자" value={inspection.external_agency_contact_name} />}
            {inspection.external_agency_contact_email && <Info label="담당자 이메일" value={inspection.external_agency_contact_email} />}
            {inspection.external_agency_contact_phone && <Info label="담당자 연락처" value={inspection.external_agency_contact_phone} />}
            {inspection.report_submission_method && <Info label="제출 방법" value={inspection.report_submission_method} />}
            {inspection.external_reference_number && <Info label="외부 접수번호" value={inspection.external_reference_number} />}
            {inspection.report_submitted_at && <Info label="리포트 제출일" value={inspection.report_submitted_at} />}
          </dl>
        </Card>
      )}

      {/* 외부 인증기관 입금 정보 (내부 전용) */}
      {isInternal && payments.length > 0 && (
        <Card title="외부 인증기관 정산 입금 (내부)">
          <ul className="space-y-2">
            {payments.map((p) => (
              <li key={p.id} className="border border-gray-100 rounded-md px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{p.payer_organization_name ?? "-"}</span>
                  <span className="text-xs font-semibold text-gray-600">{PAYMENT_STATUS_LABELS[p.status] ?? p.status}</span>
                </div>
                <div className="text-gray-500 text-xs mt-1">
                  {p.paid_amount != null && <span>입금액 {Number(p.paid_amount).toLocaleString("en-US")} {p.currency ?? ""}</span>}
                  {p.payment_date && <span> · {p.payment_date}</span>}
                  {p.received_account && <span> · 수취계좌 {p.received_account}</span>}
                  {p.external_reference_number && <span> · 정산번호 {p.external_reference_number}</span>}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* 메모 */}
      {messages.filter((m) => ["CUSTOMER_MEMO", "PROGRESS_MEMO", "INTERNAL_MEMO"].includes(m.message_type)).length > 0 && (
        <Card title="메모">
          <ul className="space-y-2">
            {messages.filter((m) => ["CUSTOMER_MEMO", "PROGRESS_MEMO", "INTERNAL_MEMO"].includes(m.message_type)).map((m) => (
              <li key={m.id} className={`rounded-md px-3 py-2 border ${m.message_type === "INTERNAL_MEMO" ? "bg-gray-100 border-gray-200" : "bg-white border-gray-100"}`}>
                <p className="text-[11px] font-semibold text-gray-500">
                  {MESSAGE_TYPE_LABELS[m.message_type as keyof typeof MESSAGE_TYPE_LABELS] ?? m.message_type}
                  {m.message_type === "INTERNAL_MEMO" && " (내부)"}
                </p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{m.message}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* 첨부파일 */}
      <Card title="첨부파일">
        {files.length === 0 ? (
          <p className="text-sm text-gray-400">첨부파일이 없습니다.</p>
        ) : (
          <ul className="space-y-1.5">
            {files.map((f) => (
              <li key={f.id} className="flex items-center justify-between text-sm">
                <span className="truncate">
                  <span className="text-[11px] font-semibold text-gray-400 mr-2">{piFileTypeLabel(f.file_type)}</span>
                  {f.original_name}
                </span>
                <a href={`/api/files/${f.id}`} className="text-xs font-semibold text-(--brand) underline flex-shrink-0 ml-2">다운로드</a>
              </li>
            ))}
          </ul>
        )}
        {!isInternal && (
          <p className="text-[11px] text-gray-400 mt-2">내부 검사 리포트 등 내부 자료는 표시되지 않습니다.</p>
        )}
      </Card>

      {/* 액션 패널 */}
      <ActionPanel
        bundle={bundle}
        actions={actions}
        role={role}
        busy={busy}
        openForm={openForm}
        setOpenForm={setOpenForm}
        runAction={runAction}
        requestId={r.id}
        status={r.status as PiStatus}
        setError={setError}
      />

      {/* 이력 (내부) */}
      {isInternal && histories.length > 0 && (
        <Card title="이력">
          <ul className="space-y-1 text-xs text-gray-500">
            {histories.map((h) => (
              <li key={h.id} className="flex gap-2">
                <span className="text-gray-400">{h.created_at}</span>
                <span className="font-semibold text-gray-600">{h.action}</span>
                {h.from_status && h.to_status && h.from_status !== h.to_status && <span>{h.from_status} → {h.to_status}</span>}
                {h.message && <span className="text-gray-500">· {h.message}</span>}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

/* ------------------------------- 액션 패널 --------------------------- */

function ActionPanel(props: {
  bundle: ProductInspectionDetailBundle;
  actions: PiAction[];
  role: string;
  busy: boolean;
  openForm: string | null;
  setOpenForm: (v: string | null) => void;
  runAction: (body: Record<string, unknown>) => Promise<boolean>;
  requestId: number;
  status: PiStatus;
  setError: (v: string | null) => void;
}) {
  const { actions, role, busy, openForm, setOpenForm, runAction, requestId, status, bundle } = props;
  const has = (a: PiAction) => actions.includes(a);
  const [reason, setReason] = useState("");
  const [neededDocs, setNeededDocs] = useState("");
  const [customerVisible, setCustomerVisible] = useState(false);
  const [staff, setStaff] = useState<StaffCandidate[]>([]);
  const [assignee, setAssignee] = useState<number | "">("");
  // 인라인 업로드 블록 공용 ref(한 번에 하나만 열림).
  const uploadRef = useRef<UploadFieldsHandle>(null);
  async function runActionWithFiles(body: Record<string, unknown>) {
    if ((await uploadRef.current?.flush()) === false) return;
    await runAction(body);
  }

  useEffect(() => {
    if (role !== "ADMIN") return;
    fetch("/api/admin/requests/staff-candidates", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { staff: [] }))
      .then((d: { staff: StaffCandidate[] }) => setStaff(d.staff ?? []))
      .catch(() => setStaff([]));
  }, [role]);

  const isRequested = status === "PRODUCT_INSPECTION_REQUESTED";
  const canReassign = role === "ADMIN" && !!bundle.request.request_number && !isRequested;
  const anyButton = actions.length > 0 || (role === "ADMIN" && (isRequested || canReassign));
  if (!anyButton) return null;

  const btn = "rounded-md text-sm font-semibold px-4 py-2 disabled:opacity-50";
  const primary = `${btn} bg-(--brand) text-white hover:opacity-90`;
  const danger = `${btn} bg-red-600 text-white hover:opacity-90`;
  const ghost = `${btn} border border-gray-300 hover:bg-gray-50`;
  const toggle = (k: string) => setOpenForm(openForm === k ? null : k);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
      <h2 className="text-sm font-bold text-gray-800">처리</h2>
      <div className="flex flex-wrap gap-2">
        {/* 담당자 지정/변경 */}
        {role === "ADMIN" && (isRequested || canReassign) && (
          <button className={ghost} disabled={busy} onClick={() => toggle("assign")}>
            {isRequested ? "담당자 지정" : "담당자 변경"}
          </button>
        )}
        {has("PI_REJECT_REQUEST") && <button className={danger} disabled={busy} onClick={() => toggle("reject")}>보완 요청</button>}
        {has("PI_CONFIRM_SCHEDULE") && <button className={primary} disabled={busy} onClick={() => toggle("schedule")}>검사 일정 확정</button>}
        {has("PI_RESUBMIT_REQUEST") && <button className={primary} disabled={busy} onClick={() => toggle("resubmit")}>보완 후 재제출</button>}

        {has("PI_UPDATE_SCHEDULE") && <button className={ghost} disabled={busy} onClick={() => toggle("updateSchedule")}>일정 변경</button>}
        {has("PI_START_INSPECTION") && <button className={primary} disabled={busy} onClick={() => runAction({ action: "PI_START_INSPECTION" })}>검사 시작</button>}
        {has("PI_BLOCK_INSPECTION") && <button className={danger} disabled={busy} onClick={() => toggle("blockInspection")}>검사 진행 불가</button>}
        {has("PI_RESUME_INSPECTION") && <button className={primary} disabled={busy} onClick={() => runAction({ action: "PI_RESUME_INSPECTION" })}>검사 재개</button>}
        {has("PI_COMPLETE_INSPECTION") && <button className={primary} disabled={busy} onClick={() => toggle("complete")}>검사 완료</button>}

        {has("PI_SUBMIT_REPORT") && <button className={primary} disabled={busy} onClick={() => toggle("report")}>리포트 제출 완료</button>}
        {has("PI_BLOCK_REPORT") && <button className={danger} disabled={busy} onClick={() => toggle("blockReport")}>리포트 문제 발생</button>}
        {has("PI_RESUME_REPORT") && <button className={primary} disabled={busy} onClick={() => runAction({ action: "PI_RESUME_REPORT" })}>리포트 문제 해결</button>}

        {has("PI_RECORD_PAYMENT") && <button className={ghost} disabled={busy} onClick={() => toggle("payment")}>외부기관 입금 입력</button>}
        {has("PI_BLOCK_PAYMENT") && <button className={danger} disabled={busy} onClick={() => toggle("blockPayment")}>입금 문제 발생</button>}
        {has("PI_RESUME_PAYMENT") && <button className={primary} disabled={busy} onClick={() => runAction({ action: "PI_RESUME_PAYMENT" })}>입금 문제 해결</button>}
        {has("PI_COMPLETE") && <button className={primary} disabled={busy} onClick={() => runAction({ action: "PI_COMPLETE" })}>최종 완료</button>}
      </div>

      {/* 보완 요청 */}
      {openForm === "reject" && (
        <div className="border-t border-gray-100 pt-4 space-y-2">
          <Labeled label="보완이 필요한 이유 (필수)"><textarea className={`${inputCls} min-h-20`} value={reason} onChange={(e) => setReason(e.target.value)} /></Labeled>
          <Labeled label="필요한 추가자료 (선택)"><textarea className={`${inputCls} min-h-16`} value={neededDocs} onChange={(e) => setNeededDocs(e.target.value)} /></Labeled>
          <button className={danger} disabled={busy || !reason.trim()} onClick={() => runAction({ action: "PI_REJECT_REQUEST", reason, needed_docs: neededDocs })}>보완 요청 발송</button>
        </div>
      )}

      {/* 보완 후 재제출(고객): 제품사진 추가 + 재제출 */}
      {openForm === "resubmit" && (
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <p className="text-xs text-gray-500">필요 시 제품사진을 선택하고 재제출하세요. 선택한 사진은 재제출 시 함께 업로드됩니다. (기존 사진 유지)</p>
          <PiUpload ref={uploadRef} requestId={requestId} types={["PRODUCT_INSPECTION_PHOTO"]} accept={{ PRODUCT_INSPECTION_PHOTO: "image/*" }} onError={props.setError} />
          <button className={primary} disabled={busy} onClick={() => runActionWithFiles({ action: "PI_RESUBMIT_REQUEST" })}>재제출 (담당자 재검토 요청)</button>
        </div>
      )}

      {/* 검사 일정 확정 */}
      {openForm === "schedule" && (
        <ScheduleForm busy={busy} withMemo
          submitLabel="검사 일정 확정 (고객 안내 발송)"
          onSubmit={(pi_schedule) => runAction({ action: "PI_CONFIRM_SCHEDULE", pi_schedule })} />
      )}
      {/* 검사 일정 변경 */}
      {openForm === "updateSchedule" && (
        <ScheduleForm busy={busy} withReason
          submitLabel="일정 변경 (고객 안내 발송)"
          onSubmit={(pi_schedule_update) => runAction({ action: "PI_UPDATE_SCHEDULE", pi_schedule_update })} />
      )}

      {/* 검사 진행 불가 */}
      {openForm === "blockInspection" && (
        <div className="border-t border-gray-100 pt-4 space-y-2">
          <Labeled label="진행 불가 사유 (필수)"><textarea className={`${inputCls} min-h-20`} value={reason} onChange={(e) => setReason(e.target.value)} /></Labeled>
          <Labeled label="필요한 조치 (선택)"><textarea className={`${inputCls} min-h-16`} value={neededDocs} onChange={(e) => setNeededDocs(e.target.value)} /></Labeled>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={customerVisible} onChange={(e) => setCustomerVisible(e.target.checked)} />
            고객에게 공개하고 안내 메일 발송
          </label>
          <button className={danger} disabled={busy || !reason.trim()}
            onClick={() => runAction({ action: "PI_BLOCK_INSPECTION", reason, needed_action: neededDocs, customer_visible: customerVisible })}>제출</button>
        </div>
      )}

      {/* 검사 완료 */}
      {openForm === "complete" && (
        <CompleteForm busy={busy} onSubmit={(pi_complete) => runAction({ action: "PI_COMPLETE_INSPECTION", pi_complete })} />
      )}

      {/* 리포트 제출 완료 */}
      {openForm === "report" && (
        <ReportForm busy={busy} requestId={requestId} onError={props.setError}
          onSubmit={(pi_report) => runAction({ action: "PI_SUBMIT_REPORT", pi_report })} />
      )}
      {openForm === "blockReport" && (
        <div className="border-t border-gray-100 pt-4 space-y-2">
          <Labeled label="문제 유형 (선택)"><input className={inputCls} value={neededDocs} onChange={(e) => setNeededDocs(e.target.value)} /></Labeled>
          <Labeled label="문제 사유 (필수)"><textarea className={`${inputCls} min-h-20`} value={reason} onChange={(e) => setReason(e.target.value)} /></Labeled>
          <button className={danger} disabled={busy || !reason.trim()} onClick={() => runAction({ action: "PI_BLOCK_REPORT", reason, problem_type: neededDocs })}>제출</button>
        </div>
      )}

      {/* 외부기관 입금 입력 */}
      {openForm === "payment" && (
        <PaymentForm busy={busy} requestId={requestId} onError={props.setError}
          onSubmit={(pi_payment) => runAction({ action: "PI_RECORD_PAYMENT", pi_payment })} />
      )}
      {openForm === "blockPayment" && (
        <div className="border-t border-gray-100 pt-4 space-y-2">
          <Labeled label="문제 유형 (선택)"><input className={inputCls} value={neededDocs} onChange={(e) => setNeededDocs(e.target.value)} /></Labeled>
          <Labeled label="문제 사유 (필수)"><textarea className={`${inputCls} min-h-20`} value={reason} onChange={(e) => setReason(e.target.value)} /></Labeled>
          <button className={danger} disabled={busy || !reason.trim()} onClick={() => runAction({ action: "PI_BLOCK_PAYMENT", reason, problem_type: neededDocs })}>제출</button>
        </div>
      )}

      {/* 담당자 지정/변경 */}
      {openForm === "assign" && (
        <div className="border-t border-gray-100 pt-4 space-y-2">
          <label className="text-xs font-semibold text-gray-600">담당 직원 선택</label>
          <select className={selectCls} value={assignee} onChange={(e) => setAssignee(e.target.value ? Number(e.target.value) : "")}>
            <option value="">직원 선택...</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.login_id} ({s.email})</option>)}
          </select>
          <button className={primary} disabled={busy || !assignee}
            onClick={() => runAction({ action: isRequested ? "PI_ASSIGN_STAFF" : "PI_REASSIGN_STAFF", assignee_user_id: assignee })}>
            {isRequested ? "지정 (접수번호 발급)" : "담당자 변경"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------- 하위 폼 ---------------------------- */

function ScheduleForm(props: {
  busy: boolean; withMemo?: boolean; withReason?: boolean; submitLabel: string;
  onSubmit: (v: Record<string, string | undefined>) => void;
}) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [loc, setLoc] = useState("");
  const [customerMemo, setCustomerMemo] = useState("");
  const [internalMemo, setInternalMemo] = useState("");
  const [changeReason, setChangeReason] = useState("");
  return (
    <div className="border-t border-gray-100 pt-4 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Labeled label="검사 시작일 (필수)"><input type="date" className={inputCls} value={start} onChange={(e) => setStart(e.target.value)} /></Labeled>
        <Labeled label="검사 종료일 (필수)"><input type="date" className={inputCls} value={end} onChange={(e) => setEnd(e.target.value)} /></Labeled>
        <Labeled label="시작 시간 (선택)"><input type="time" className={inputCls} value={startTime} onChange={(e) => setStartTime(e.target.value)} /></Labeled>
        <Labeled label="종료 시간 (선택)"><input type="time" className={inputCls} value={endTime} onChange={(e) => setEndTime(e.target.value)} /></Labeled>
      </div>
      <Labeled label="검사 장소"><input className={inputCls} value={loc} onChange={(e) => setLoc(e.target.value)} /></Labeled>
      {props.withMemo && (
        <>
          <Labeled label="고객 공개 메모"><input className={inputCls} value={customerMemo} onChange={(e) => setCustomerMemo(e.target.value)} /></Labeled>
          <Labeled label="내부 메모 (비공개)"><input className={inputCls} value={internalMemo} onChange={(e) => setInternalMemo(e.target.value)} /></Labeled>
        </>
      )}
      {props.withReason && (
        <Labeled label="일정 변경 사유 (필수)"><textarea className={`${inputCls} min-h-16`} value={changeReason} onChange={(e) => setChangeReason(e.target.value)} /></Labeled>
      )}
      <button className="rounded-md bg-(--brand) text-white text-sm font-semibold px-4 py-2 disabled:opacity-50"
        disabled={props.busy || !start || !end || (props.withReason && !changeReason.trim())}
        onClick={() => props.onSubmit({
          planned_start_date: start, planned_end_date: end,
          planned_start_time: startTime || undefined, planned_end_time: endTime || undefined,
          inspection_location: loc || undefined,
          customer_memo: props.withMemo ? (customerMemo || undefined) : undefined,
          internal_memo: props.withMemo ? (internalMemo || undefined) : undefined,
          change_reason: props.withReason ? changeReason : undefined,
        })}>
        {props.submitLabel}
      </button>
    </div>
  );
}

function CompleteForm(props: { busy: boolean; onSubmit: (v: Record<string, string | undefined>) => void }) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [internalMemo, setInternalMemo] = useState("");
  const [customerMemo, setCustomerMemo] = useState("");
  return (
    <div className="border-t border-gray-100 pt-4 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Labeled label="실제 검사 시작일 (필수)"><input type="date" className={inputCls} value={start} onChange={(e) => setStart(e.target.value)} /></Labeled>
        <Labeled label="실제 검사 완료일 (필수)"><input type="date" className={inputCls} value={end} onChange={(e) => setEnd(e.target.value)} /></Labeled>
        <Labeled label="시작 시간 (선택)"><input type="time" className={inputCls} value={startTime} onChange={(e) => setStartTime(e.target.value)} /></Labeled>
        <Labeled label="완료 시간 (선택)"><input type="time" className={inputCls} value={endTime} onChange={(e) => setEndTime(e.target.value)} /></Labeled>
      </div>
      <Labeled label="내부 메모 (비공개)"><input className={inputCls} value={internalMemo} onChange={(e) => setInternalMemo(e.target.value)} /></Labeled>
      <Labeled label="고객 공개 메모"><input className={inputCls} value={customerMemo} onChange={(e) => setCustomerMemo(e.target.value)} /></Labeled>
      <button className="rounded-md bg-(--brand) text-white text-sm font-semibold px-4 py-2 disabled:opacity-50"
        disabled={props.busy || !start || !end}
        onClick={() => props.onSubmit({
          actual_start_date: start, actual_end_date: end,
          actual_start_time: startTime || undefined, actual_end_time: endTime || undefined,
          internal_memo: internalMemo || undefined, customer_memo: customerMemo || undefined,
        })}>
        검사 완료 (고객 안내 발송)
      </button>
    </div>
  );
}

function ReportForm(props: {
  busy: boolean; requestId: number; onError: (v: string | null) => void;
  onSubmit: (v: Record<string, string | undefined>) => void;
}) {
  const [agency, setAgency] = useState("");
  const [dept, setDept] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [ref, setRef] = useState("");
  const [method, setMethod] = useState("");
  const [submittedAt, setSubmittedAt] = useState("");
  const [memo, setMemo] = useState("");
  const upRef = useRef<UploadFieldsHandle>(null);
  return (
    <div className="border-t border-gray-100 pt-4 space-y-2">
      <p className="text-[11px] text-gray-500">내부 검사 리포트를 선택하세요(고객 비공개). 아래 제출 버튼을 누를 때 함께 업로드됩니다.</p>
      <PiUpload ref={upRef} requestId={props.requestId}
        types={["PRODUCT_INSPECTION_REPORT", "PRODUCT_INSPECTION_REPORT_ATTACHMENT"]} onError={props.onError} />
      <Labeled label="전달 인증기관명 (필수)"><input className={inputCls} value={agency} onChange={(e) => setAgency(e.target.value)} /></Labeled>
      <div className="grid grid-cols-2 gap-2">
        <Labeled label="담당 부서"><input className={inputCls} value={dept} onChange={(e) => setDept(e.target.value)} /></Labeled>
        <Labeled label="담당자명"><input className={inputCls} value={contact} onChange={(e) => setContact(e.target.value)} /></Labeled>
        <Labeled label="담당자 이메일"><input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} /></Labeled>
        <Labeled label="담당자 연락처"><input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} /></Labeled>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Labeled label="제출 방법">
          <select className={selectCls} value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="">선택...</option>
            {PI_SUBMISSION_METHODS.map((m) => <option key={m} value={m}>{PI_SUBMISSION_METHOD_LABELS[m]}</option>)}
          </select>
        </Labeled>
        <Labeled label="리포트 제출일 (필수)"><input type="date" className={inputCls} value={submittedAt} onChange={(e) => setSubmittedAt(e.target.value)} /></Labeled>
      </div>
      <Labeled label="외부 접수번호 (선택)"><input className={inputCls} value={ref} onChange={(e) => setRef(e.target.value)} /></Labeled>
      <Labeled label="전달 메모 (내부)"><input className={inputCls} value={memo} onChange={(e) => setMemo(e.target.value)} /></Labeled>
      <button className="rounded-md bg-(--brand) text-white text-sm font-semibold px-4 py-2 disabled:opacity-50"
        disabled={props.busy || !agency.trim() || !submittedAt}
        onClick={async () => {
          if ((await upRef.current?.flush()) === false) return;
          props.onSubmit({
            external_agency_name: agency, external_agency_department: dept || undefined,
            external_agency_contact_name: contact || undefined, external_agency_contact_email: email || undefined,
            external_agency_contact_phone: phone || undefined, external_reference_number: ref || undefined,
            report_submission_method: method || undefined, report_submitted_at: submittedAt, transfer_memo: memo || undefined,
          });
        }}>
        리포트 제출 완료 (고객 안내 발송)
      </button>
    </div>
  );
}

function PaymentForm(props: {
  busy: boolean; requestId: number; onError: (v: string | null) => void;
  onSubmit: (v: Record<string, string | number | undefined>) => void;
}) {
  const [org, setOrg] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("KRW");
  const [date, setDate] = useState("");
  const [depositor, setDepositor] = useState("");
  const [account, setAccount] = useState("");
  const [ref, setRef] = useState("");
  const [memo, setMemo] = useState("");
  const upRef = useRef<UploadFieldsHandle>(null);
  return (
    <div className="border-t border-gray-100 pt-4 space-y-2">
      <p className="text-[11px] text-gray-500">외부 인증기관이 회사에 지급한 정산 입금 정보입니다(고객에게 공개되지 않음).</p>
      <Labeled label="입금 기관명 (필수)"><input className={inputCls} value={org} onChange={(e) => setOrg(e.target.value)} /></Labeled>
      <div className="grid grid-cols-2 gap-2">
        <Labeled label="입금 금액 (필수)"><input type="number" className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} /></Labeled>
        <Labeled label="통화">
          <CurrencyPicker value={currency} onChange={setCurrency} selectClassName={selectCls} inputClassName={inputCls} />
        </Labeled>
        <Labeled label="입금일자 (필수)"><input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></Labeled>
        <Labeled label="송금자명"><input className={inputCls} value={depositor} onChange={(e) => setDepositor(e.target.value)} /></Labeled>
      </div>
      <Labeled label="수취 계좌"><input className={inputCls} value={account} onChange={(e) => setAccount(e.target.value)} /></Labeled>
      <Labeled label="외부 정산번호"><input className={inputCls} value={ref} onChange={(e) => setRef(e.target.value)} /></Labeled>
      <Labeled label="내부 메모"><input className={inputCls} value={memo} onChange={(e) => setMemo(e.target.value)} /></Labeled>
      <p className="text-[11px] text-gray-500">입금 증빙 파일을 선택하면 아래 버튼을 누를 때 함께 업로드됩니다(내부 전용).</p>
      <PiUpload ref={upRef} requestId={props.requestId} types={["PRODUCT_INSPECTION_PAYMENT_PROOF"]} onError={props.onError} />
      <button className="rounded-md bg-(--brand) text-white text-sm font-semibold px-4 py-2 disabled:opacity-50"
        disabled={props.busy || !org.trim() || !amount || !date}
        onClick={async () => {
          if ((await upRef.current?.flush()) === false) return;
          props.onSubmit({
            payer_organization_name: org, paid_amount: Number(amount), currency, payment_date: date,
            depositor_name: depositor || undefined, received_account: account || undefined,
            external_reference_number: ref || undefined, internal_memo: memo || undefined,
          });
        }}>
        입금 정보 저장
      </button>
    </div>
  );
}

// 제품검사 파일 업로드. types 배열의 각 종류별 입력을 렌더.
// 자체 업로드 버튼 없이 flush() 를 노출 → 부모 액션 버튼이 업로드를 함께 처리.
const PiUpload = forwardRef<
  UploadFieldsHandle,
  { requestId: number; types: string[]; accept?: Record<string, string>; onError: (v: string | null) => void }
>(function PiUpload({ requestId, types, accept, onError }, ref) {
  return (
    <UploadFields
      ref={ref}
      requestId={requestId}
      onError={onError}
      items={types.map((t) => ({ name: `files_${t}`, label: piFileTypeLabel(t), accept: accept?.[t] }))}
    />
  );
});

/* ------------------------------- 프리미티브 ------------------------- */

const inputCls = "w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-(--brand) focus:outline-none";
const selectCls = `${inputCls} bg-white`;

function timeRange(a: string | null, b: string | null): string {
  if (!a && !b) return "-";
  return `${a ? a.slice(0, 5) : "-"} ~ ${b ? b.slice(0, 5) : "-"}`;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h2 className="text-sm font-bold text-gray-800 mb-3">{title}</h2>
      {children}
    </div>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold text-gray-400 uppercase">{label}</dt>
      <dd className="text-sm text-gray-800">{value}</dd>
    </div>
  );
}
function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}
