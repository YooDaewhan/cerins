"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { PAYMENT_STATUS_LABELS, MESSAGE_TYPE_LABELS } from "@/src/lib/serviceRequestTypes";
import {
  SCRAP_STATUS_LABELS,
  SCRAP_CUSTOMER_STATUS_LABELS,
  SCRAP_MILESTONES,
  scrapFileTypeLabel,
  type ScrapStatus,
} from "@/src/lib/scrapIndiaTypes";
import {
  UploadFields,
  type UploadFieldsHandle,
} from "@/components/requests/UploadFields";
import CurrencyPicker from "@/components/requests/CurrencyPicker";
import type { ScrapAction } from "@/src/lib/scrapIndiaWorkflow";
import type { ScrapIndiaDetailBundle } from "@/src/lib/scrapIndiaRequestDetail";
import AssigneeInfo from "@/components/requests/AssigneeInfo";

interface StaffCandidate { id: number; login_id: string; email: string; user_level: number }

interface Props {
  bundle: ScrapIndiaDetailBundle;
}

export default function ScrapIndiaDetailView({ bundle }: Props) {
  const { request: r, role, files, inspection, dgft, quotation, quotationItems, payments, messages, histories, documentRequirements, block, billing, bank, actions } = bundle;
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

  const activeMilestone = SCRAP_MILESTONES.findIndex((m) => m.statuses.includes(r.status as ScrapStatus));
  const blockLabel = block?.phase === "report" ? "리포트 처리 보류" : block?.phase === "dgft" ? "DGFT 등록 보류" : "검사 진행 보류";

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-mono text-gray-400">{r.request_number ?? "접수번호 미발급"}</p>
            <h1 className="text-xl font-bold text-(--brand) mt-1">{r.title}</h1>
            <p className="text-xs text-gray-500 mt-1">검사 · 스크랩(인도)</p>
          </div>
          <span className="rounded-full bg-(--brand)/10 text-(--brand) text-xs font-semibold px-3 py-1">
            {isInternal
              ? `${SCRAP_STATUS_LABELS[r.status as ScrapStatus] ?? r.status} (step ${r.workflow_step})`
              : SCRAP_CUSTOMER_STATUS_LABELS[r.status as ScrapStatus] ?? r.status}
          </span>
        </div>
        <div className="mt-5 flex items-center gap-1">
          {SCRAP_MILESTONES.map((m, i) => (
            <div key={m.label} className="flex-1">
              <div className={`h-1.5 rounded-full ${i <= activeMilestone ? "bg-(--brand)" : "bg-gray-200"}`} />
              <p className={`text-[10px] mt-1 ${i === activeMilestone ? "text-(--brand) font-semibold" : "text-gray-400"}`}>{m.label}</p>
            </div>
          ))}
        </div>
      </div>

      {error && <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2">{error}</div>}

      {/* 보류 안내 */}
      {block && (block.customer_visible || isInternal) && (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <b>{blockLabel}</b>
          {block.needed_action && <div className="mt-1">필요한 조치: {block.needed_action}</div>}
          {isInternal && block.resume_status && (
            <div className="text-[11px] mt-1 text-amber-600">해결 후 복귀: {SCRAP_STATUS_LABELS[block.resume_status as ScrapStatus] ?? block.resume_status}</div>
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

      {/* 검사 일정 */}
      {inspection && (
        <Card title="검사 일정 / 장소">
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
            <Info label="요청 시작일" value={inspection.requested_start_date ?? "-"} />
            {inspection.requested_end_date && <Info label="요청 종료일" value={inspection.requested_end_date} />}
            <Info label="요청 시간" value={timeRange(inspection.requested_start_time, inspection.requested_end_time)} />
            {inspection.requested_location && <Info label="요청 장소" value={inspection.requested_location} />}
            {inspection.requested_location_detail && <Info label="상세 주소" value={inspection.requested_location_detail} />}
            {inspection.site_contact_name && <Info label="현장 담당자" value={`${inspection.site_contact_name}${inspection.site_contact_phone ? ` / ${inspection.site_contact_phone}` : ""}`} />}
            {inspection.confirmed_start_date && <Info label="확정 시작일" value={inspection.confirmed_start_date} />}
            {inspection.confirmed_end_date && <Info label="확정 종료일" value={inspection.confirmed_end_date} />}
            {(inspection.confirmed_start_time || inspection.confirmed_end_time) && (
              <Info label="확정 시간" value={timeRange(inspection.confirmed_start_time, inspection.confirmed_end_time)} />
            )}
            {inspection.confirmed_location && <Info label="확정 장소" value={inspection.confirmed_location} />}
            {inspection.actual_start_date && <Info label="실제 시작일" value={inspection.actual_start_date} />}
            {inspection.actual_end_date && <Info label="검사 완료일" value={inspection.actual_end_date} />}
            {inspection.schedule_confirmed_at && <Info label="일정 확인 여부" value="확인됨" />}
          </dl>
        </Card>
      )}

      {/* 보완/조정 사유 */}
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

      {/* 제출서류 항목 + 고객 제출 */}
      {documentRequirements.length > 0 && (
        <Card title="제출 서류">
          <ul className="space-y-1.5 text-sm">
            {documentRequirements.map((d) => {
              const submitted = files.filter((f) => f.service_document_requirement_id === d.id);
              return (
                <li key={d.id} className="flex items-start justify-between gap-3 border-b border-gray-50 pb-1.5">
                  <div>
                    <span className="font-semibold">{d.display_name}</span>
                    {d.is_required && <span className="text-red-500 text-xs ml-1">*</span>}
                    {d.description && <p className="text-[11px] text-gray-400">{d.description}</p>}
                  </div>
                  <span className="text-xs text-gray-500 flex-shrink-0">{submitted.length > 0 ? `${submitted.length}개 제출됨` : "미제출"}</span>
                </li>
              );
            })}
          </ul>
          {!isInternal && (
            <p className="text-[11px] text-gray-400 mt-2">필요한 서류를 아래 &quot;처리&quot; 영역에서 업로드한 뒤 제출해 주세요.</p>
          )}
        </Card>
      )}

      {/* 청구 정보 */}
      {quotation && (
        <Card title="청구 정보">
          <ul className="space-y-1 text-sm">
            {quotationItems.map((it) => (
              <li key={it.id} className="flex justify-between">
                <span>{it.item_name}{it.memo ? ` (${it.memo})` : ""}</span>
                <span>{fmtMoney(it.amount, quotation.currency)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-sm font-bold">
            <span>총 청구금액</span>
            <span className="text-(--brand)">{fmtMoney(quotation.total_amount, quotation.currency)}</span>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm mt-3">
            {billing?.due_date && <Info label="지급기한" value={billing.due_date} />}
            <Info label="은행" value={bank.bankName || "-"} />
            <Info label="계좌번호" value={bank.accountNumber || "-"} />
            <Info label="예금주" value={bank.accountHolder || "-"} />
          </dl>
          {quotation.notes && (
            <p className="text-sm text-gray-600 mt-3 whitespace-pre-wrap"><b className="text-xs text-gray-400">청구 안내</b><br />{quotation.notes}</p>
          )}
        </Card>
      )}

      {/* 입금 정보 */}
      {payments.length > 0 && (
        <Card title="입금 정보">
          <ul className="space-y-2">
            {payments.map((p) => (
              <li key={p.id} className="border border-gray-100 rounded-md px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{p.depositor_name || "-"}</span>
                  <span className="text-xs font-semibold text-gray-600">{PAYMENT_STATUS_LABELS[p.status] ?? p.status}</span>
                </div>
                <div className="text-gray-500 text-xs mt-1">
                  {p.payment_date && <span>{p.payment_date}</span>}
                  {p.sender_account && <span> · {p.sender_account}</span>}
                  {p.rejection_reason && <span className="text-red-500"> · 확인불가: {p.rejection_reason}</span>}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* DGFT 등록 정보 */}
      {dgft && (dgft.registration_number || dgft.external_reference_number || dgft.registration_submitted_at || isInternal) && (
        <Card title="DGFT 등록 정보">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Info label="등록 상태" value={dgft.registration_status} />
            {dgft.registration_submitted_at && <Info label="등록 신청일" value={dgft.registration_submitted_at} />}
            {dgft.registration_confirmed_at && <Info label="등록 완료일" value={dgft.registration_confirmed_at} />}
            {dgft.registration_number && <Info label="DGFT 등록번호" value={dgft.registration_number} />}
            {dgft.external_reference_number && <Info label="외부 접수번호" value={dgft.external_reference_number} />}
            {isInternal && dgft.document_prepared_at && <Info label="문서 작성일" value={dgft.document_prepared_at} />}
          </dl>
          {dgft.customer_visible_memo && (
            <p className="text-sm text-gray-600 mt-3 whitespace-pre-wrap">{dgft.customer_visible_memo}</p>
          )}
        </Card>
      )}

      {/* 메모 */}
      {messages.filter((m) => ["CUSTOMER_MEMO", "PROGRESS_MEMO", "INTERNAL_MEMO", "PAYMENT_REJECTION"].includes(m.message_type)).length > 0 && (
        <Card title="메모">
          <ul className="space-y-2">
            {messages.filter((m) => ["CUSTOMER_MEMO", "PROGRESS_MEMO", "INTERNAL_MEMO", "PAYMENT_REJECTION"].includes(m.message_type)).map((m) => (
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
                  <span className="text-[11px] font-semibold text-gray-400 mr-2">{f.display_name_snapshot ?? scrapFileTypeLabel(f.file_type)}</span>
                  {f.original_name}
                </span>
                <a href={`/api/files/${f.id}`} className="text-xs font-semibold text-(--brand) underline flex-shrink-0 ml-2">다운로드</a>
              </li>
            ))}
          </ul>
        )}
        {!isInternal && (
          <p className="text-[11px] text-gray-400 mt-2">내부 검사 리포트·DGFT 내부자료 등은 표시되지 않습니다.</p>
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
        status={r.status as ScrapStatus}
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
  bundle: ScrapIndiaDetailBundle;
  actions: ScrapAction[];
  role: string;
  busy: boolean;
  openForm: string | null;
  setOpenForm: (v: string | null) => void;
  runAction: (body: Record<string, unknown>) => Promise<boolean>;
  requestId: number;
  status: ScrapStatus;
  setError: (v: string | null) => void;
}) {
  const { actions, role, busy, openForm, setOpenForm, runAction, requestId, status, bundle } = props;
  const has = (a: ScrapAction) => actions.includes(a);
  const [reason, setReason] = useState("");
  const [needed, setNeeded] = useState("");
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

  const isRequested = status === "SCRAP_REQUESTED";
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
        {role === "ADMIN" && (isRequested || canReassign) && (
          <button className={ghost} disabled={busy} onClick={() => toggle("assign")}>
            {isRequested ? "담당자 지정" : "담당자 변경"}
          </button>
        )}
        {/* 일정 */}
        {has("SCRAP_CONFIRM_SCHEDULE") && <button className={primary} disabled={busy} onClick={() => toggle("schedule")}>검사일정 확인</button>}
        {has("SCRAP_REQUEST_SCHEDULE_REVISION") && <button className={ghost} disabled={busy} onClick={() => toggle("revision")}>일정 조정 요청</button>}
        {has("SCRAP_RESUBMIT_SCHEDULE") && <button className={primary} disabled={busy} onClick={() => toggle("resubmitSchedule")}>일정 수정 후 재제출</button>}
        {/* 검사 */}
        {has("SCRAP_START_INSPECTION") && <button className={primary} disabled={busy} onClick={() => runAction({ action: "SCRAP_START_INSPECTION" })}>검사 시작</button>}
        {has("SCRAP_BLOCK_INSPECTION") && <button className={danger} disabled={busy} onClick={() => toggle("blockInspection")}>검사 진행 문제</button>}
        {has("SCRAP_RESUME_INSPECTION") && <button className={primary} disabled={busy} onClick={() => runAction({ action: "SCRAP_RESUME_INSPECTION" })}>검사 재개</button>}
        {has("SCRAP_COMPLETE_INSPECTION") && <button className={primary} disabled={busy} onClick={() => toggle("complete")}>검사 완료</button>}
        {/* 고객 서류 */}
        {has("SCRAP_SUBMIT_DOCUMENTS") && <button className={primary} disabled={busy} onClick={() => toggle("submitDocs")}>서류 제출</button>}
        {has("SCRAP_RESUBMIT_DOCUMENTS") && <button className={primary} disabled={busy} onClick={() => toggle("submitDocs")}>서류 재제출</button>}
        {has("SCRAP_APPROVE_DOCUMENTS") && <button className={primary} disabled={busy} onClick={() => runAction({ action: "SCRAP_APPROVE_DOCUMENTS" })}>서류 확인 완료</button>}
        {has("SCRAP_REQUEST_DOCUMENT_REVISION") && <button className={danger} disabled={busy} onClick={() => toggle("docRevision")}>서류 보완 요청</button>}
        {/* 리포트/청구 */}
        {has("SCRAP_COMPLETE_REPORT") && <button className={primary} disabled={busy} onClick={() => toggle("report")}>내부 리포트 완료</button>}
        {has("SCRAP_BLOCK_REPORT") && <button className={danger} disabled={busy} onClick={() => toggle("blockReport")}>리포트 문제 발생</button>}
        {has("SCRAP_RESUME_REPORT") && <button className={primary} disabled={busy} onClick={() => runAction({ action: "SCRAP_RESUME_REPORT" })}>리포트 문제 해결</button>}
        {has("SCRAP_ISSUE_BILLING") && <button className={primary} disabled={busy} onClick={() => toggle("billing")}>청구하기</button>}
        {/* 입금 */}
        {has("SCRAP_SUBMIT_PAYMENT") && <button className={primary} disabled={busy} onClick={() => toggle("payment")}>입금 완료</button>}
        {has("SCRAP_RESUBMIT_PAYMENT") && <button className={primary} disabled={busy} onClick={() => toggle("payment")}>입금 정보 재제출</button>}
        {has("SCRAP_CONFIRM_PAYMENT") && <button className={primary} disabled={busy} onClick={() => toggle("confirmPayment")}>입금 확인</button>}
        {has("SCRAP_REJECT_PAYMENT") && <button className={danger} disabled={busy} onClick={() => toggle("rejectPayment")}>확인 불가</button>}
        {/* DGFT */}
        {has("SCRAP_START_DGFT_DOCUMENT") && <button className={primary} disabled={busy} onClick={() => runAction({ action: "SCRAP_START_DGFT_DOCUMENT" })}>DGFT 문서 작성 시작</button>}
        {has("SCRAP_START_DGFT_REGISTRATION") && <button className={primary} disabled={busy} onClick={() => toggle("dgftStart")}>DGFT 등록 시작</button>}
        {has("SCRAP_BLOCK_DGFT") && <button className={danger} disabled={busy} onClick={() => toggle("blockDgft")}>DGFT 등록 문제</button>}
        {has("SCRAP_RESUME_DGFT") && <button className={primary} disabled={busy} onClick={() => runAction({ action: "SCRAP_RESUME_DGFT" })}>DGFT 문제 해결</button>}
        {has("SCRAP_COMPLETE_DGFT") && <button className={primary} disabled={busy} onClick={() => toggle("completeDgft")}>등록확인 (최종 완료)</button>}
      </div>

      {/* 담당자 지정/변경 */}
      {openForm === "assign" && (
        <div className="border-t border-gray-100 pt-4 space-y-2">
          <label className="text-xs font-semibold text-gray-600">담당 직원 선택</label>
          <select className={selectCls} value={assignee} onChange={(e) => setAssignee(e.target.value ? Number(e.target.value) : "")}>
            <option value="">직원 선택...</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.login_id} ({s.email})</option>)}
          </select>
          <button className={primary} disabled={busy || !assignee}
            onClick={() => runAction({ action: isRequested ? "SCRAP_ASSIGN_STAFF" : "SCRAP_REASSIGN_STAFF", assignee_user_id: assignee })}>
            {isRequested ? "지정 (접수번호 발급)" : "담당자 변경"}
          </button>
        </div>
      )}

      {/* 검사일정 확인 */}
      {openForm === "schedule" && (
        <ConfirmScheduleForm busy={busy} onSubmit={(scrap_schedule) => runAction({ action: "SCRAP_CONFIRM_SCHEDULE", scrap_schedule })} />
      )}
      {/* 일정 조정 요청 */}
      {openForm === "revision" && (
        <RevisionForm busy={busy} onSubmit={(scrap_schedule_revision) => runAction({ action: "SCRAP_REQUEST_SCHEDULE_REVISION", scrap_schedule_revision })} />
      )}
      {/* 고객 일정 재제출 */}
      {openForm === "resubmitSchedule" && (
        <ResubmitScheduleForm busy={busy} onSubmit={(scrap_schedule_resubmit) => runAction({ action: "SCRAP_RESUBMIT_SCHEDULE", scrap_schedule_resubmit })} />
      )}

      {/* 검사 진행 문제 */}
      {openForm === "blockInspection" && (
        <BlockForm busy={busy} reason={reason} setReason={setReason} needed={needed} setNeeded={setNeeded}
          customerVisible={customerVisible} setCustomerVisible={setCustomerVisible} withCustomerToggle
          onSubmit={() => runAction({ action: "SCRAP_BLOCK_INSPECTION", reason, needed_action: needed, customer_visible: customerVisible })} />
      )}
      {/* 검사 완료 */}
      {openForm === "complete" && (
        <CompleteInspectionForm busy={busy} onSubmit={(scrap_complete) => runAction({ action: "SCRAP_COMPLETE_INSPECTION", scrap_complete })} />
      )}

      {/* 고객 서류 제출/재제출 */}
      {openForm === "submitDocs" && (
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <p className="text-xs text-gray-500">필요한 서류를 선택하고 제출하세요. 선택한 파일은 제출 시 함께 업로드됩니다. (필수 * 항목은 모두 제출해야 합니다.)</p>
          <DocUpload ref={uploadRef} requestId={requestId} requirements={bundle.documentRequirements} onError={props.setError} />
          <Labeled label="제출 메모 (선택)"><input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} /></Labeled>
          <button className={primary} disabled={busy}
            onClick={() => runActionWithFiles({ action: has("SCRAP_RESUBMIT_DOCUMENTS") ? "SCRAP_RESUBMIT_DOCUMENTS" : "SCRAP_SUBMIT_DOCUMENTS", note: reason || undefined })}>
            제출
          </button>
        </div>
      )}
      {/* 서류 보완 요청 */}
      {openForm === "docRevision" && (
        <div className="border-t border-gray-100 pt-4 space-y-2">
          <Labeled label="보완 사유 (필수)"><textarea className={`${inputCls} min-h-20`} value={reason} onChange={(e) => setReason(e.target.value)} /></Labeled>
          <Labeled label="보완이 필요한 서류/수정사항 (선택)"><textarea className={`${inputCls} min-h-16`} value={needed} onChange={(e) => setNeeded(e.target.value)} /></Labeled>
          <button className={danger} disabled={busy || !reason.trim()} onClick={() => runAction({ action: "SCRAP_REQUEST_DOCUMENT_REVISION", reason, needed_docs: needed })}>보완 요청 발송</button>
        </div>
      )}

      {/* 내부 리포트 완료 */}
      {openForm === "report" && (
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <p className="text-[11px] text-gray-500">내부 검사 리포트를 선택하세요(고객 비공개). 아래 버튼을 누를 때 함께 업로드됩니다.</p>
          <ScrapUpload ref={uploadRef} requestId={requestId} types={["SCRAP_INSPECTION_REPORT"]} onError={props.setError} />
          <Labeled label="내부 메모 (선택)"><input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} /></Labeled>
          <button className={primary} disabled={busy} onClick={() => runActionWithFiles({ action: "SCRAP_COMPLETE_REPORT", note: reason || undefined })}>내부 리포트 완료</button>
        </div>
      )}
      {openForm === "blockReport" && (
        <BlockForm busy={busy} reason={reason} setReason={setReason} needed={needed} setNeeded={setNeeded}
          customerVisible={customerVisible} setCustomerVisible={setCustomerVisible} withCustomerToggle
          neededLabel="필요한 조치 (선택)"
          onSubmit={() => runAction({ action: "SCRAP_BLOCK_REPORT", reason, needed_action: needed, customer_visible: customerVisible })} />
      )}

      {/* 청구 */}
      {openForm === "billing" && (
        <BillingForm busy={busy} requestId={requestId} onError={props.setError}
          onSubmit={(scrap_billing) => runAction({ action: "SCRAP_ISSUE_BILLING", scrap_billing })} />
      )}

      {/* 입금(고객) */}
      {openForm === "payment" && (
        <PaymentForm busy={busy} requestId={requestId} onError={props.setError}
          onSubmit={(scrap_payment) => runAction({ action: has("SCRAP_RESUBMIT_PAYMENT") ? "SCRAP_RESUBMIT_PAYMENT" : "SCRAP_SUBMIT_PAYMENT", scrap_payment })} />
      )}
      {/* 입금 확인 */}
      {openForm === "confirmPayment" && (
        <div className="border-t border-gray-100 pt-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Labeled label="실제 입금금액 (선택)"><input type="number" className={inputCls} value={needed} onChange={(e) => setNeeded(e.target.value)} /></Labeled>
            <Labeled label="실제 입금일 (선택)"><input type="date" className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} /></Labeled>
          </div>
          <button className={primary} disabled={busy}
            onClick={() => runAction({ action: "SCRAP_CONFIRM_PAYMENT", scrap_payment_confirm: { paid_amount: needed ? Number(needed) : undefined, payment_date: reason || undefined } })}>
            입금 확인
          </button>
        </div>
      )}
      {openForm === "rejectPayment" && (
        <div className="border-t border-gray-100 pt-4 space-y-2">
          <Labeled label="확인 불가 사유 (필수)"><textarea className={`${inputCls} min-h-20`} value={reason} onChange={(e) => setReason(e.target.value)} /></Labeled>
          <button className={danger} disabled={busy || !reason.trim()} onClick={() => runAction({ action: "SCRAP_REJECT_PAYMENT", reason })}>확인 불가 처리 (고객 안내)</button>
        </div>
      )}

      {/* DGFT 등록 시작 */}
      {openForm === "dgftStart" && (
        <DgftForm busy={busy} requestId={requestId} onError={props.setError} submitLabel="DGFT 등록 시작"
          onSubmit={(scrap_dgft_start, upload) => { void upload; return runAction({ action: "SCRAP_START_DGFT_REGISTRATION", scrap_dgft_start }); }} />
      )}
      {openForm === "blockDgft" && (
        <BlockForm busy={busy} reason={reason} setReason={setReason} needed={needed} setNeeded={setNeeded}
          customerVisible={customerVisible} setCustomerVisible={setCustomerVisible} withCustomerToggle
          neededLabel="필요한 조치 (선택)"
          onSubmit={() => runAction({ action: "SCRAP_BLOCK_DGFT", reason, needed_action: needed, customer_visible: customerVisible })} />
      )}
      {/* 등록확인(최종 완료) */}
      {openForm === "completeDgft" && (
        <CompleteDgftForm busy={busy} requestId={requestId} onError={props.setError}
          onSubmit={(scrap_dgft_complete) => runAction({ action: "SCRAP_COMPLETE_DGFT", scrap_dgft_complete })} />
      )}
    </div>
  );
}

/* ------------------------------- 하위 폼 ---------------------------- */

function ConfirmScheduleForm(props: { busy: boolean; onSubmit: (v: Record<string, string | undefined>) => void }) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [loc, setLoc] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [customerMemo, setCustomerMemo] = useState("");
  const [internalMemo, setInternalMemo] = useState("");
  return (
    <div className="border-t border-gray-100 pt-4 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Labeled label="확정 시작일 (필수)"><input type="date" className={inputCls} value={start} onChange={(e) => setStart(e.target.value)} /></Labeled>
        <Labeled label="확정 종료일 (필수)"><input type="date" className={inputCls} value={end} onChange={(e) => setEnd(e.target.value)} /></Labeled>
        <Labeled label="시작 시간 (선택)"><input type="time" className={inputCls} value={startTime} onChange={(e) => setStartTime(e.target.value)} /></Labeled>
        <Labeled label="종료 시간 (선택)"><input type="time" className={inputCls} value={endTime} onChange={(e) => setEndTime(e.target.value)} /></Labeled>
      </div>
      <Labeled label="확정 검사 장소"><input className={inputCls} value={loc} onChange={(e) => setLoc(e.target.value)} /></Labeled>
      <Labeled label="일정 변경 사유 (고객 요청과 다르게 확정 시)"><input className={inputCls} value={changeReason} onChange={(e) => setChangeReason(e.target.value)} /></Labeled>
      <Labeled label="고객 공개 메모"><input className={inputCls} value={customerMemo} onChange={(e) => setCustomerMemo(e.target.value)} /></Labeled>
      <Labeled label="내부 메모 (비공개)"><input className={inputCls} value={internalMemo} onChange={(e) => setInternalMemo(e.target.value)} /></Labeled>
      <button className={primaryBtn} disabled={props.busy || !start || !end}
        onClick={() => props.onSubmit({
          confirmed_start_date: start, confirmed_end_date: end,
          confirmed_start_time: startTime || undefined, confirmed_end_time: endTime || undefined,
          confirmed_location: loc || undefined, change_reason: changeReason || undefined,
          customer_memo: customerMemo || undefined, internal_memo: internalMemo || undefined,
        })}>
        검사일정 확인 (고객 안내 발송)
      </button>
    </div>
  );
}

function RevisionForm(props: { busy: boolean; onSubmit: (v: Record<string, string | undefined>) => void }) {
  const [reason, setReason] = useState("");
  const [altStart, setAltStart] = useState("");
  const [altEnd, setAltEnd] = useState("");
  const [altTime, setAltTime] = useState("");
  const [locNote, setLocNote] = useState("");
  const [memo, setMemo] = useState("");
  return (
    <div className="border-t border-gray-100 pt-4 space-y-2">
      <Labeled label="조정 요청 사유 (필수)"><textarea className={`${inputCls} min-h-16`} value={reason} onChange={(e) => setReason(e.target.value)} /></Labeled>
      <div className="grid grid-cols-2 gap-2">
        <Labeled label="가능한 대체 시작일"><input type="date" className={inputCls} value={altStart} onChange={(e) => setAltStart(e.target.value)} /></Labeled>
        <Labeled label="가능한 대체 종료일"><input type="date" className={inputCls} value={altEnd} onChange={(e) => setAltEnd(e.target.value)} /></Labeled>
      </div>
      <Labeled label="가능한 시간"><input className={inputCls} value={altTime} onChange={(e) => setAltTime(e.target.value)} /></Labeled>
      <Labeled label="장소 관련 의견"><input className={inputCls} value={locNote} onChange={(e) => setLocNote(e.target.value)} /></Labeled>
      <Labeled label="고객에게 전달할 메모"><input className={inputCls} value={memo} onChange={(e) => setMemo(e.target.value)} /></Labeled>
      <button className={primaryBtn} disabled={props.busy || !reason.trim()}
        onClick={() => props.onSubmit({
          reason, alt_start_date: altStart || undefined, alt_end_date: altEnd || undefined,
          alt_time: altTime || undefined, location_note: locNote || undefined, customer_memo: memo || undefined,
        })}>
        일정 조정 요청 (고객 안내 발송)
      </button>
    </div>
  );
}

function ResubmitScheduleForm(props: { busy: boolean; onSubmit: (v: Record<string, string | undefined>) => void }) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [loc, setLoc] = useState("");
  const [detail, setDetail] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [note, setNote] = useState("");
  return (
    <div className="border-t border-gray-100 pt-4 space-y-2">
      <p className="text-xs text-gray-500">변경할 항목만 입력하세요. 비워두면 기존 값이 유지됩니다.</p>
      <div className="grid grid-cols-2 gap-2">
        <Labeled label="검사 요청 시작일"><input type="date" className={inputCls} value={start} onChange={(e) => setStart(e.target.value)} /></Labeled>
        <Labeled label="검사 요청 종료일"><input type="date" className={inputCls} value={end} onChange={(e) => setEnd(e.target.value)} /></Labeled>
        <Labeled label="시작 시간"><input type="time" className={inputCls} value={startTime} onChange={(e) => setStartTime(e.target.value)} /></Labeled>
        <Labeled label="종료 시간"><input type="time" className={inputCls} value={endTime} onChange={(e) => setEndTime(e.target.value)} /></Labeled>
      </div>
      <Labeled label="검사 장소"><input className={inputCls} value={loc} onChange={(e) => setLoc(e.target.value)} /></Labeled>
      <Labeled label="상세 주소"><input className={inputCls} value={detail} onChange={(e) => setDetail(e.target.value)} /></Labeled>
      <div className="grid grid-cols-2 gap-2">
        <Labeled label="현장 담당자명"><input className={inputCls} value={contactName} onChange={(e) => setContactName(e.target.value)} /></Labeled>
        <Labeled label="현장 담당자 연락처"><input className={inputCls} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} /></Labeled>
      </div>
      <Labeled label="답변 메모"><input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} /></Labeled>
      <button className={primaryBtn} disabled={props.busy}
        onClick={() => props.onSubmit({
          requested_start_date: start || undefined, requested_end_date: end || undefined,
          requested_start_time: startTime || undefined, requested_end_time: endTime || undefined,
          requested_location: loc || undefined, requested_location_detail: detail || undefined,
          site_contact_name: contactName || undefined, site_contact_phone: contactPhone || undefined,
          note: note || undefined,
        })}>
        일정 재제출
      </button>
    </div>
  );
}

function CompleteInspectionForm(props: { busy: boolean; onSubmit: (v: Record<string, string | undefined>) => void }) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [customerMemo, setCustomerMemo] = useState("");
  const [internalMemo, setInternalMemo] = useState("");
  return (
    <div className="border-t border-gray-100 pt-4 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Labeled label="실제 검사 시작일"><input type="date" className={inputCls} value={start} onChange={(e) => setStart(e.target.value)} /></Labeled>
        <Labeled label="실제 검사 완료일 (필수)"><input type="date" className={inputCls} value={end} onChange={(e) => setEnd(e.target.value)} /></Labeled>
        <Labeled label="시작 시간 (선택)"><input type="time" className={inputCls} value={startTime} onChange={(e) => setStartTime(e.target.value)} /></Labeled>
        <Labeled label="완료 시간 (선택)"><input type="time" className={inputCls} value={endTime} onChange={(e) => setEndTime(e.target.value)} /></Labeled>
      </div>
      <Labeled label="고객 공개 메모"><input className={inputCls} value={customerMemo} onChange={(e) => setCustomerMemo(e.target.value)} /></Labeled>
      <Labeled label="내부 메모 (비공개)"><input className={inputCls} value={internalMemo} onChange={(e) => setInternalMemo(e.target.value)} /></Labeled>
      <button className={primaryBtn} disabled={props.busy || !end}
        onClick={() => props.onSubmit({
          actual_start_date: start || undefined, actual_end_date: end,
          actual_start_time: startTime || undefined, actual_end_time: endTime || undefined,
          customer_memo: customerMemo || undefined, internal_memo: internalMemo || undefined,
        })}>
        검사 완료 (고객 안내 발송)
      </button>
    </div>
  );
}

function BlockForm(props: {
  busy: boolean; reason: string; setReason: (v: string) => void; needed: string; setNeeded: (v: string) => void;
  customerVisible: boolean; setCustomerVisible: (v: boolean) => void; withCustomerToggle?: boolean;
  neededLabel?: string; onSubmit: () => void;
}) {
  return (
    <div className="border-t border-gray-100 pt-4 space-y-2">
      <Labeled label="문제 사유 (필수)"><textarea className={`${inputCls} min-h-20`} value={props.reason} onChange={(e) => props.setReason(e.target.value)} /></Labeled>
      <Labeled label={props.neededLabel ?? "필요한 조치 (선택)"}><textarea className={`${inputCls} min-h-16`} value={props.needed} onChange={(e) => props.setNeeded(e.target.value)} /></Labeled>
      {props.withCustomerToggle && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={props.customerVisible} onChange={(e) => props.setCustomerVisible(e.target.checked)} />
          고객에게 공개하고 안내 메일 발송
        </label>
      )}
      <button className={dangerBtn} disabled={props.busy || !props.reason.trim()} onClick={props.onSubmit}>제출</button>
    </div>
  );
}

interface BillingRow { item_name: string; quantity: string; unit_price: string; memo: string }

function BillingForm(props: {
  busy: boolean; requestId: number; onError: (v: string | null) => void;
  onSubmit: (v: Record<string, unknown>) => void;
}) {
  const [rows, setRows] = useState<BillingRow[]>([{ item_name: "", quantity: "1", unit_price: "", memo: "" }]);
  const [currency, setCurrency] = useState("KRW");
  const [dueDate, setDueDate] = useState("");
  const [guide, setGuide] = useState("");
  const upRef = useRef<UploadFieldsHandle>(null);
  const total = rows.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.unit_price) || 0), 0);
  const setRow = (i: number, patch: Partial<BillingRow>) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  return (
    <div className="border-t border-gray-100 pt-4 space-y-3">
      <p className="text-[11px] text-gray-500">청구서/세금계산서 파일을 선택하세요(고객 공개). 아래 버튼을 누를 때 함께 업로드됩니다.</p>
      <ScrapUpload ref={upRef} requestId={props.requestId} types={["SCRAP_BILLING_DOCUMENT", "SCRAP_TAX_INVOICE"]} onError={props.onError} />
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-12 gap-1.5 items-center">
            <input className={`${inputCls} col-span-4`} placeholder="항목명" value={row.item_name} onChange={(e) => setRow(i, { item_name: e.target.value })} />
            <input type="number" className={`${inputCls} col-span-2`} placeholder="수량" value={row.quantity} onChange={(e) => setRow(i, { quantity: e.target.value })} />
            <input type="number" className={`${inputCls} col-span-2`} placeholder="단가" value={row.unit_price} onChange={(e) => setRow(i, { unit_price: e.target.value })} />
            <input className={`${inputCls} col-span-3`} placeholder="비고" value={row.memo} onChange={(e) => setRow(i, { memo: e.target.value })} />
            <button className="col-span-1 text-red-500 text-xs" onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}>삭제</button>
          </div>
        ))}
        <button className="text-xs font-semibold text-(--brand)" onClick={() => setRows((rs) => [...rs, { item_name: "", quantity: "1", unit_price: "", memo: "" }])}>+ 항목 추가</button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Labeled label="통화">
          <CurrencyPicker value={currency} onChange={setCurrency} selectClassName={selectCls} inputClassName={inputCls} />
        </Labeled>
        <Labeled label="지급기한 (선택)"><input type="date" className={inputCls} value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Labeled>
      </div>
      <Labeled label="청구 안내 (선택)"><textarea className={`${inputCls} min-h-16`} value={guide} onChange={(e) => setGuide(e.target.value)} /></Labeled>
      <p className="text-sm font-bold">총 청구금액: {total.toLocaleString("ko-KR")} {currency}</p>
      <button className={primaryBtn} disabled={props.busy || rows.every((r) => !r.item_name.trim())}
        onClick={async () => {
          if ((await upRef.current?.flush()) === false) return;
          props.onSubmit({
            currency,
            due_date: dueDate || undefined,
            guide: guide || undefined,
            items: rows.filter((r) => r.item_name.trim()).map((r) => ({
              item_name: r.item_name.trim(), quantity: Number(r.quantity) || 0, unit_price: Number(r.unit_price) || 0, memo: r.memo || undefined,
            })),
          });
        }}>
        청구하기 (고객 안내 발송)
      </button>
    </div>
  );
}

function PaymentForm(props: {
  busy: boolean; requestId: number; onError: (v: string | null) => void;
  onSubmit: (v: Record<string, string | undefined>) => void;
}) {
  const [depositor, setDepositor] = useState("");
  const [account, setAccount] = useState("");
  const [date, setDate] = useState("");
  const [memo, setMemo] = useState("");
  const upRef = useRef<UploadFieldsHandle>(null);
  return (
    <div className="border-t border-gray-100 pt-4 space-y-2">
      <Labeled label="입금자명 (필수)"><input className={inputCls} value={depositor} onChange={(e) => setDepositor(e.target.value)} /></Labeled>
      <div className="grid grid-cols-2 gap-2">
        <Labeled label="송금 계좌 정보"><input className={inputCls} value={account} onChange={(e) => setAccount(e.target.value)} /></Labeled>
        <Labeled label="입금일자"><input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} /></Labeled>
      </div>
      <Labeled label="메모"><input className={inputCls} value={memo} onChange={(e) => setMemo(e.target.value)} /></Labeled>
      <p className="text-[11px] text-gray-500">입금 증빙 파일을 선택하면 아래 버튼을 누를 때 함께 업로드됩니다.</p>
      <ScrapUpload ref={upRef} requestId={props.requestId} types={["SCRAP_PAYMENT_PROOF"]} onError={props.onError} />
      <button className={primaryBtn} disabled={props.busy || !depositor.trim()}
        onClick={async () => {
          if ((await upRef.current?.flush()) === false) return;
          props.onSubmit({
            depositor_name: depositor, sender_account: account || undefined, payment_date: date || undefined, memo: memo || undefined,
          });
        }}>
        입금 완료
      </button>
    </div>
  );
}

function DgftForm(props: {
  busy: boolean; requestId: number; onError: (v: string | null) => void; submitLabel: string;
  onSubmit: (v: Record<string, string | undefined>, upload: boolean) => void;
}) {
  const [preparedAt, setPreparedAt] = useState("");
  const [submittedAt, setSubmittedAt] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [extRef, setExtRef] = useState("");
  const [customerMemo, setCustomerMemo] = useState("");
  const [internalMemo, setInternalMemo] = useState("");
  const upRef = useRef<UploadFieldsHandle>(null);
  return (
    <div className="border-t border-gray-100 pt-4 space-y-2">
      <p className="text-[11px] text-gray-500">DGFT 제출 문서/증빙을 선택하세요(기본 내부 전용). 아래 버튼을 누를 때 함께 업로드됩니다.</p>
      <ScrapUpload ref={upRef} requestId={props.requestId} types={["SCRAP_DGFT_SUBMISSION_DOCUMENT", "SCRAP_DGFT_REGISTRATION_PROOF", "SCRAP_DGFT_OTHER"]} onError={props.onError} />
      <div className="grid grid-cols-2 gap-2">
        <Labeled label="문서 작성일"><input type="date" className={inputCls} value={preparedAt} onChange={(e) => setPreparedAt(e.target.value)} /></Labeled>
        <Labeled label="등록 신청일"><input type="date" className={inputCls} value={submittedAt} onChange={(e) => setSubmittedAt(e.target.value)} /></Labeled>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Labeled label="DGFT 등록번호"><input className={inputCls} value={regNumber} onChange={(e) => setRegNumber(e.target.value)} /></Labeled>
        <Labeled label="외부 접수번호"><input className={inputCls} value={extRef} onChange={(e) => setExtRef(e.target.value)} /></Labeled>
      </div>
      <Labeled label="고객 공개 메모"><input className={inputCls} value={customerMemo} onChange={(e) => setCustomerMemo(e.target.value)} /></Labeled>
      <Labeled label="내부 메모"><input className={inputCls} value={internalMemo} onChange={(e) => setInternalMemo(e.target.value)} /></Labeled>
      <button className={primaryBtn} disabled={props.busy}
        onClick={async () => {
          if ((await upRef.current?.flush()) === false) return;
          props.onSubmit({
            document_prepared_at: preparedAt || undefined, registration_submitted_at: submittedAt || undefined,
            registration_number: regNumber || undefined, external_reference_number: extRef || undefined,
            customer_memo: customerMemo || undefined, internal_memo: internalMemo || undefined,
          }, true);
        }}>
        {props.submitLabel}
      </button>
    </div>
  );
}

function CompleteDgftForm(props: {
  busy: boolean; requestId: number; onError: (v: string | null) => void;
  onSubmit: (v: Record<string, string | boolean | undefined>) => void;
}) {
  const [submittedAt, setSubmittedAt] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [extRef, setExtRef] = useState("");
  const [showToCustomer, setShowToCustomer] = useState(true);
  const upRef = useRef<UploadFieldsHandle>(null);
  return (
    <div className="border-t border-gray-100 pt-4 space-y-2">
      <p className="text-[11px] text-gray-500">등록 증빙을 선택하면 아래 버튼을 누를 때 함께 업로드됩니다. 최종 필수값을 확인하세요.</p>
      <ScrapUpload ref={upRef} requestId={props.requestId} types={["SCRAP_DGFT_REGISTRATION_PROOF"]} onError={props.onError} />
      <Labeled label="DGFT 등록 신청일 (필수)"><input type="date" className={inputCls} value={submittedAt} onChange={(e) => setSubmittedAt(e.target.value)} /></Labeled>
      <div className="grid grid-cols-2 gap-2">
        <Labeled label="DGFT 등록번호"><input className={inputCls} value={regNumber} onChange={(e) => setRegNumber(e.target.value)} /></Labeled>
        <Labeled label="외부 접수번호"><input className={inputCls} value={extRef} onChange={(e) => setExtRef(e.target.value)} /></Labeled>
      </div>
      <p className="text-[11px] text-gray-400">등록번호 또는 외부 접수번호 중 하나는 필수입니다.</p>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={showToCustomer} onChange={(e) => setShowToCustomer(e.target.checked)} />
        완료 메일에 DGFT 등록번호 표시
      </label>
      <button className={primaryBtn} disabled={props.busy || !submittedAt || (!regNumber.trim() && !extRef.trim())}
        onClick={async () => {
          if ((await upRef.current?.flush()) === false) return;
          props.onSubmit({
            registration_submitted_at: submittedAt, registration_number: regNumber || undefined,
            external_reference_number: extRef || undefined, show_number_to_customer: showToCustomer,
          });
        }}>
        등록확인 (최종 완료 / 고객 안내 발송)
      </button>
    </div>
  );
}

/* --------------------- 업로드 컴포넌트 ------------------------------- */

// 자체 업로드 버튼 없이 flush() 를 노출 → 부모 액션 버튼이 업로드를 함께 처리.
const ScrapUpload = forwardRef<
  UploadFieldsHandle,
  { requestId: number; types: string[]; onError: (v: string | null) => void }
>(function ScrapUpload({ requestId, types, onError }, ref) {
  return (
    <UploadFields
      ref={ref}
      requestId={requestId}
      onError={onError}
      items={types.map((t) => ({ name: `files_${t}`, label: scrapFileTypeLabel(t) }))}
    />
  );
});

// 동적 제출서류 업로드. 필드명 doc_<requirementId>.
const DocUpload = forwardRef<
  UploadFieldsHandle,
  {
    requestId: number;
    requirements: ScrapIndiaDetailBundle["documentRequirements"];
    onError: (v: string | null) => void;
  }
>(function DocUpload({ requestId, requirements, onError }, ref) {
  if (requirements.length === 0) {
    return <p className="text-xs text-gray-400">등록된 제출서류 항목이 없습니다. 담당자에게 문의하세요.</p>;
  }
  return (
    <UploadFields
      ref={ref}
      requestId={requestId}
      onError={onError}
      items={requirements.map((d) => ({
        name: `doc_${d.id}`,
        label: d.display_name,
        required: d.is_required,
        multiple: d.allows_multiple,
      }))}
    />
  );
});

/* ------------------------------- 프리미티브 ------------------------- */

const inputCls = "w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-(--brand) focus:outline-none";
const selectCls = `${inputCls} bg-white`;
const primaryBtn = "rounded-md bg-(--brand) text-white text-sm font-semibold px-4 py-2 disabled:opacity-50";
const dangerBtn = "rounded-md bg-red-600 text-white text-sm font-semibold px-4 py-2 disabled:opacity-50";

function timeRange(a: string | null, b: string | null): string {
  if (!a && !b) return "-";
  return `${a ? a.slice(0, 5) : "-"} ~ ${b ? b.slice(0, 5) : "-"}`;
}
function fmtMoney(amount: string | null, currency: string): string {
  if (amount == null) return "-";
  const n = Number(amount);
  if (currency === "KRW") return `${Math.round(n).toLocaleString("ko-KR")} KRW`;
  return `${n.toLocaleString("ko-KR", { minimumFractionDigits: 2 })} ${currency}`;
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
