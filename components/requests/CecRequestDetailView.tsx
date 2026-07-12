"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import {
  PAYMENT_STATUS_LABELS,
  MESSAGE_TYPE_LABELS,
} from "@/src/lib/serviceRequestTypes";
import {
  CEC_STATUS_LABELS,
  CEC_CUSTOMER_STATUS_LABELS,
  CEC_MILESTONES,
  CEC_PAYMENT_TYPE_LABELS,
  cecFileTypeLabel,
  type CecStatus,
} from "@/src/lib/cecTypes";
import type { CecAction } from "@/src/lib/cecWorkflow";
import type { CecRequestDetailBundle } from "@/src/lib/cecRequestDetail";
import AssigneeInfo from "@/components/requests/AssigneeInfo";
import {
  UploadFields,
  type UploadFieldsHandle,
} from "@/components/requests/UploadFields";

interface StaffCandidate {
  id: number;
  login_id: string;
  email: string;
  user_level: number;
}

interface Props {
  bundle: CecRequestDetailBundle;
}

export default function CecRequestDetailView({ bundle }: Props) {
  const {
    request: r,
    role,
    files,
    inspection,
    valuation,
    quotation,
    payments,
    messages,
    histories,
    block,
    reject,
    actions,
    pricing,
  } = bundle;
  const isInternal = role === "STAFF" || role === "ADMIN";
  const currency = pricing.currency;

  // 최종 인증서 초안(미리보기)/발급본은 상단 전용 섹션에서 강조하고, 일반 첨부파일 목록에서는 제외한다.
  const FINAL_CERT_TYPES = [
    "CEC_FINAL_CERTIFICATE_PREVIEW",
    "CEC_FINAL_CERTIFICATE",
  ];
  const finalCertFiles = files.filter((f) =>
    FINAL_CERT_TYPES.includes(f.file_type),
  );
  const otherFiles = files.filter(
    (f) => !FINAL_CERT_TYPES.includes(f.file_type),
  );
  const hasIssuedCert = finalCertFiles.some(
    (f) => f.file_type === "CEC_FINAL_CERTIFICATE",
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openForm, setOpenForm] = useState<string | null>(null);

  function money(
    v: string | number | null | undefined,
    curOverride?: string,
  ): string {
    if (v == null) return "-";
    const n = Number(v);
    return `${n.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${curOverride || currency}`;
  }

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
      if (!res.ok || !data.ok) {
        setError(data.error ?? "처리에 실패했습니다.");
        return false;
      }
      window.location.reload();
      return true;
    } catch {
      setError("네트워크 오류가 발생했습니다.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const activeMilestone = CEC_MILESTONES.findIndex((m) =>
    m.statuses.includes(r.status as CecStatus),
  );

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-mono text-gray-400">
              {r.request_number ?? "접수번호 미발급"}
            </p>
            <h1 className="text-xl font-bold text-(--brand) mt-1">{r.title}</h1>
            <p className="text-xs text-gray-500 mt-1">CEC India 인증</p>
          </div>
          <span className="rounded-full bg-(--brand)/10 text-(--brand) text-xs font-semibold px-3 py-1">
            {isInternal
              ? `${CEC_STATUS_LABELS[r.status as CecStatus] ?? r.status} (step ${r.workflow_step})`
              : (CEC_CUSTOMER_STATUS_LABELS[r.status as CecStatus] ?? r.status)}
          </span>
        </div>
        <div className="mt-5 flex items-center gap-1">
          {CEC_MILESTONES.map((m, i) => (
            <div key={m.label} className="flex-1">
              <div
                className={`h-1.5 rounded-full ${i <= activeMilestone ? "bg-(--brand)" : "bg-gray-200"}`}
              />
              <p
                className={`text-[10px] mt-1 ${i === activeMilestone ? "text-(--brand) font-semibold" : "text-gray-400"}`}
              >
                {m.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2">
          {error}
        </div>
      )}

      {/* 예외 상태 안내 */}
      {block && (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <b>인증 진행 보완 필요</b>
          {block.needed_docs && (
            <div className="mt-1">필요 자료: {block.needed_docs}</div>
          )}
          {isInternal && block.resume_step != null && (
            <div className="text-[11px] mt-1 text-amber-600">
              해결 후 step {block.resume_step} 로 복귀
            </div>
          )}
        </div>
      )}
      {reject && isInternal && (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          <b>거절 유형: {reject.reject_type}</b>
          {reject.resume_step != null && (
            <span className="text-[11px] ml-2 text-amber-600">
              복귀 step {reject.resume_step}
            </span>
          )}
        </div>
      )}

      {/* 최종 인증서 (초안/발급본) 상단 강조 */}
      {finalCertFiles.length > 0 && (
        <div
          className={`rounded-xl p-6 border ${hasIssuedCert ? "bg-green-50 border-green-300" : "bg-blue-50 border-blue-300"}`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-white text-lg font-bold ${hasIssuedCert ? "bg-green-600" : "bg-blue-600"}`}
            >
              {hasIssuedCert ? "✓" : "★"}
            </span>
            <div>
              <h2
                className={`text-base font-bold ${hasIssuedCert ? "text-green-800" : "text-blue-800"}`}
              >
                {hasIssuedCert ? "최종 인증서 발급 완료" : "최종 인증서 초안"}
              </h2>
              <p
                className={`text-xs ${hasIssuedCert ? "text-green-700" : "text-blue-700"}`}
              >
                {hasIssuedCert
                  ? "아래에서 최종 인증서를 다운로드하실 수 있습니다."
                  : "최종 인증서 초안입니다. 보안상 미리보기만 제공됩니다."}
              </p>
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            {finalCertFiles.map((f) => {
              const isPreview = f.file_type === "CEC_FINAL_CERTIFICATE_PREVIEW";
              return (
                <li
                  key={f.id}
                  className={`flex items-center justify-between gap-3 rounded-lg bg-white border px-4 py-3 ${hasIssuedCert ? "border-green-200" : "border-blue-200"}`}
                >
                  <span className="truncate text-sm">
                    <span className="text-[11px] font-semibold text-gray-400 mr-2">
                      {cecFileTypeLabel(f.file_type)}
                    </span>
                    <span className="font-medium text-gray-800">
                      {f.original_name}
                    </span>
                  </span>
                  {isPreview ? (
                    <a
                      href={`/api/requests/${r.id}/preview/${f.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 rounded-md bg-blue-600 text-white text-sm font-semibold px-4 py-2 hover:opacity-90"
                    >
                      미리보기
                    </a>
                  ) : (
                    <a
                      href={`/api/files/${f.id}`}
                      className="flex-shrink-0 rounded-md bg-green-600 text-white text-sm font-semibold px-4 py-2 hover:opacity-90"
                    >
                      다운로드
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* 신청 정보 */}
      <Card title="신청 정보">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Info label="회사명" value={r.company_name} />
          <Info
            label="담당자(고객)"
            value={`${r.contact_name} / ${r.contact_phone}`}
          />
          <Info label="이메일" value={r.contact_email} />
          <Info label="신청일" value={r.submitted_at ?? r.created_at} />
          {isInternal && (
            <Info
              label="담당 직원"
              value={bundle.assignee?.login_id ?? "미지정"}
            />
          )}
          {r.completed_at && <Info label="완료일" value={r.completed_at} />}
        </dl>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 mb-1">의뢰 내용</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {r.description}
          </p>
        </div>
      </Card>

      {/* 담당자 안내 (고객 전용, 지정된 경우만) */}
      {!isInternal && <AssigneeInfo assignee={bundle.assignee} />}

      {/* 반려/보완 사유 */}
      {messages.filter((m) =>
        ["REJECTION", "PAYMENT_REJECTION", "CERTIFICATION_BLOCKED"].includes(
          m.message_type,
        ),
      ).length > 0 && (
        <Card title="반려 / 보완 사유">
          <ul className="space-y-2">
            {messages
              .filter((m) =>
                [
                  "REJECTION",
                  "PAYMENT_REJECTION",
                  "CERTIFICATION_BLOCKED",
                ].includes(m.message_type),
              )
              .map((m) => (
                <li
                  key={m.id}
                  className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2"
                >
                  <p className="text-[11px] font-semibold text-amber-700">
                    {MESSAGE_TYPE_LABELS[
                      m.message_type as keyof typeof MESSAGE_TYPE_LABELS
                    ] ?? m.message_type}
                  </p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {m.message}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {m.created_at}
                  </p>
                </li>
              ))}
          </ul>
        </Card>
      )}

      {/* 검사 일정 */}
      {inspection && (
        <Card title="검사 일정">
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
            {inspection.requested_start_date && (
              <Info
                label="검사 요청일(고객)"
                value={
                  inspection.requested_start_date ===
                    inspection.requested_end_date ||
                  !inspection.requested_end_date
                    ? inspection.requested_start_date
                    : `${inspection.requested_start_date} ~ ${inspection.requested_end_date}`
                }
              />
            )}
            {inspection.requested_start_time && (
              <Info
                label="요청 시간(고객)"
                value={`${inspection.requested_start_time}${inspection.requested_end_time ? ` ~ ${inspection.requested_end_time}` : ""}`}
              />
            )}
            {inspection.site_contact_name && (
              <Info
                label="현장 담당자"
                value={`${inspection.site_contact_name}${inspection.site_contact_phone ? ` / ${inspection.site_contact_phone}` : ""}`}
              />
            )}
            <Info
              label="검사 시작(예정)"
              value={inspection.planned_start_date ?? "-"}
            />
            <Info
              label="검사 종료(예정)"
              value={inspection.planned_end_date ?? "-"}
            />
            <Info
              label="예정 검사일수"
              value={
                inspection.planned_days != null
                  ? `${inspection.planned_days}일`
                  : "-"
              }
            />
            {inspection.actual_start_date && (
              <Info
                label="검사 시작(실제)"
                value={inspection.actual_start_date}
              />
            )}
            {inspection.actual_end_date && (
              <Info
                label="검사 종료(실제)"
                value={inspection.actual_end_date}
              />
            )}
            {inspection.actual_days != null && (
              <Info
                label="실제 검사일수"
                value={`${inspection.actual_days}일`}
              />
            )}
          </dl>
          {isInternal && inspection.inspection_memo && (
            <p className="text-xs text-gray-500 mt-3 whitespace-pre-wrap">
              {inspection.inspection_memo}
            </p>
          )}
        </Card>
      )}

      {/* 가격평가 (고객은 내부 검사 리포트 제외, 평가 결과만) */}
      {valuation && (
        <Card title="가격평가">
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
            <Info
              label="평가 물건가액"
              value={money(
                valuation.valuation_amount,
                valuation.valuation_currency,
              )}
            />
            <Info
              label="추가 수수료 적용"
              value={valuation.surcharge_applied ? "적용" : "미적용"}
            />
            {valuation.surcharge_applied && (
              <Info
                label="추가 수수료"
                value={money(
                  valuation.surcharge_amount,
                  valuation.valuation_currency,
                )}
              />
            )}
          </dl>
          {valuation.valuation_description && (
            <p className="text-sm text-gray-700 mt-3 whitespace-pre-wrap">
              {valuation.valuation_description}
            </p>
          )}
          {valuation.customer_confirmed_at && (
            <p className="text-[11px] text-green-600 mt-2">
              고객 확인: {valuation.customer_confirmed_at}
            </p>
          )}
        </Card>
      )}

      {/* 최종 견적 */}
      {quotation && (
        <Card title="최종 견적">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                  <th className="py-2">항목</th>
                  <th className="py-2 text-right">수량</th>
                  <th className="py-2 text-right">단가</th>
                  <th className="py-2 text-right">금액</th>
                </tr>
              </thead>
              <tbody>
                {quotation.items.map((it) => (
                  <tr key={it.id} className="border-b border-gray-100">
                    <td className="py-2">{it.item_name}</td>
                    <td className="py-2 text-right">{Number(it.quantity)}</td>
                    <td className="py-2 text-right">{money(it.unit_price)}</td>
                    <td className="py-2 text-right">{money(it.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <dl className="mt-4 space-y-1 text-sm">
            <TotalRow
              label="최종 총액"
              value={money(quotation.quotation.total_amount)}
              strong
            />
            <TotalRow
              label="납부한 선금"
              value={money(quotation.quotation.deposit_amount)}
            />
            <TotalRow
              label="잔금"
              value={money(quotation.quotation.balance_amount)}
            />
          </dl>
        </Card>
      )}

      {/* 입금 정보 */}
      {payments.length > 0 && (
        <Card title="입금 정보">
          <ul className="space-y-2">
            {payments.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between text-sm border border-gray-100 rounded-md px-3 py-2"
              >
                <div>
                  <span className="font-semibold">
                    {CEC_PAYMENT_TYPE_LABELS[
                      p.payment_type as keyof typeof CEC_PAYMENT_TYPE_LABELS
                    ] ?? p.payment_type}
                  </span>
                  <span className="text-gray-500"> · {p.depositor_name}</span>
                  {p.payment_date && (
                    <span className="text-gray-400"> · {p.payment_date}</span>
                  )}
                  {p.expected_amount && (
                    <span className="text-gray-400">
                      {" "}
                      · 예상 {money(p.expected_amount)}
                    </span>
                  )}
                </div>
                <span className="text-xs font-semibold text-gray-600">
                  {PAYMENT_STATUS_LABELS[p.status] ?? p.status}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* 메모 */}
      {messages.filter((m) =>
        ["CUSTOMER_MEMO", "PROGRESS_MEMO", "INTERNAL_MEMO"].includes(
          m.message_type,
        ),
      ).length > 0 && (
        <Card title="메모">
          <ul className="space-y-2">
            {messages
              .filter((m) =>
                ["CUSTOMER_MEMO", "PROGRESS_MEMO", "INTERNAL_MEMO"].includes(
                  m.message_type,
                ),
              )
              .map((m) => (
                <li
                  key={m.id}
                  className={`rounded-md px-3 py-2 border ${m.message_type === "INTERNAL_MEMO" ? "bg-gray-100 border-gray-200" : "bg-white border-gray-100"}`}
                >
                  <p className="text-[11px] font-semibold text-gray-500">
                    {MESSAGE_TYPE_LABELS[
                      m.message_type as keyof typeof MESSAGE_TYPE_LABELS
                    ] ?? m.message_type}
                    {m.message_type === "INTERNAL_MEMO" && " (내부)"}
                  </p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {m.message}
                  </p>
                </li>
              ))}
          </ul>
        </Card>
      )}

      {/* 첨부파일 (최종 인증서 초안/발급본은 상단 전용 섹션에서 표시) */}
      <Card title="첨부파일">
        {otherFiles.length === 0 ? (
          <p className="text-sm text-gray-400">첨부파일이 없습니다.</p>
        ) : (
          <ul className="space-y-1.5">
            {otherFiles.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="truncate">
                  <span className="text-[11px] font-semibold text-gray-400 mr-2">
                    {cecFileTypeLabel(f.file_type)}
                  </span>
                  {f.original_name}
                </span>
                <a
                  href={`/api/files/${f.id}`}
                  className="text-xs font-semibold text-(--brand) underline flex-shrink-0 ml-2"
                >
                  다운로드
                </a>
              </li>
            ))}
          </ul>
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
        status={r.status as CecStatus}
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
                {h.from_status &&
                  h.to_status &&
                  h.from_status !== h.to_status && (
                    <span>
                      {h.from_status} → {h.to_status}
                    </span>
                  )}
                {h.message && (
                  <span className="text-gray-500">· {h.message}</span>
                )}
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
  bundle: CecRequestDetailBundle;
  actions: CecAction[];
  role: string;
  busy: boolean;
  openForm: string | null;
  setOpenForm: (v: string | null) => void;
  runAction: (body: Record<string, unknown>) => Promise<boolean>;
  requestId: number;
  status: CecStatus;
  setError: (v: string | null) => void;
}) {
  const {
    actions,
    role,
    busy,
    openForm,
    setOpenForm,
    runAction,
    requestId,
    status,
    bundle,
  } = props;
  const has = (a: CecAction) => actions.includes(a);
  const currency = bundle.pricing.currency; // 견적 통화(물건가액 입력 표시에 사용)
  const [reason, setReason] = useState("");
  const [neededDocs, setNeededDocs] = useState("");
  const [staff, setStaff] = useState<StaffCandidate[]>([]);
  const [assignee, setAssignee] = useState<number | "">("");
  // 인라인 업로드 블록 공용 ref. openForm 은 한 번에 하나만 열리므로 하나를 공유해도 안전하다.
  const uploadRef = useRef<UploadFieldsHandle>(null);
  // 선택된 파일을 먼저 업로드한 뒤 전이를 실행(메인 버튼 한 번으로 처리).
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

  const canReassign =
    role === "ADMIN" &&
    !!bundle.request.request_number &&
    status !== "CEC_REQUESTED";
  const anyButton =
    actions.length > 0 ||
    (role === "ADMIN" && (status === "CEC_REQUESTED" || canReassign));
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
        {role === "ADMIN" && (status === "CEC_REQUESTED" || canReassign) && (
          <button
            className={ghost}
            disabled={busy}
            onClick={() => toggle("assign")}
          >
            {status === "CEC_REQUESTED" ? "담당자 지정" : "담당자 변경"}
          </button>
        )}
        {has("CEC_REJECT_DOCUMENTS") && (
          <button
            className={danger}
            disabled={busy}
            onClick={() => toggle("rejectDocs")}
          >
            서류 반려
          </button>
        )}
        {has("CEC_ACCEPT_REQUEST") && (
          <button
            className={primary}
            disabled={busy}
            onClick={() => toggle("accept")}
          >
            접수 (검사일정 입력)
          </button>
        )}
        {has("CEC_RESUBMIT_DOCUMENTS") && (
          <button
            className={primary}
            disabled={busy}
            onClick={() => toggle("resubmitDocs")}
          >
            보완 후 재제출
          </button>
        )}

        {has("CEC_SUBMIT_DEPOSIT") && (
          <button
            className={primary}
            disabled={busy}
            onClick={() => toggle("deposit")}
          >
            선금 입금
          </button>
        )}
        {has("CEC_CONFIRM_DEPOSIT") && (
          <button
            className={primary}
            disabled={busy}
            onClick={() => runAction({ action: "CEC_CONFIRM_DEPOSIT" })}
          >
            선금 입금확인
          </button>
        )}
        {has("CEC_REJECT_DEPOSIT") && (
          <button
            className={danger}
            disabled={busy}
            onClick={() => toggle("rejectDeposit")}
          >
            선금 확인불가
          </button>
        )}
        {has("CEC_SCHEDULE_INSPECTION") && (
          <button
            className={primary}
            disabled={busy}
            onClick={() => runAction({ action: "CEC_SCHEDULE_INSPECTION" })}
          >
            검사 예정으로 변경
          </button>
        )}
        {has("CEC_START_INSPECTION") && (
          <button
            className={primary}
            disabled={busy}
            onClick={() => runAction({ action: "CEC_START_INSPECTION" })}
          >
            검사 시작
          </button>
        )}
        {has("CEC_BLOCK_INSPECTION") && (
          <button
            className={danger}
            disabled={busy}
            onClick={() => toggle("blockInspection")}
          >
            검사 진행 불가
          </button>
        )}
        {has("CEC_RESUME_INSPECTION") && (
          <button
            className={primary}
            disabled={busy}
            onClick={() => runAction({ action: "CEC_RESUME_INSPECTION" })}
          >
            검사 재개
          </button>
        )}
        {has("CEC_COMPLETE_VALUATION") && (
          <button
            className={primary}
            disabled={busy}
            onClick={() => toggle("valuation")}
          >
            검사 결과/가격평가 입력
          </button>
        )}

        {has("CEC_APPROVE_VALUATION") && (
          <button
            className={primary}
            disabled={busy}
            onClick={() => runAction({ action: "CEC_APPROVE_VALUATION" })}
          >
            가격평가 확인
          </button>
        )}
        {has("CEC_REJECT_VALUATION") && (
          <button
            className={danger}
            disabled={busy}
            onClick={() => toggle("rejectValuation")}
          >
            가격평가 거절
          </button>
        )}
        {has("CEC_RESUBMIT_VALUATION") && (
          <button
            className={primary}
            disabled={busy}
            onClick={() => toggle("resubmitValuation")}
          >
            평가 수정 재제출
          </button>
        )}

        {has("CEC_UPLOAD_CERTIFICATE_DRAFT") && (
          <button
            className={primary}
            disabled={busy}
            onClick={() => toggle("draft")}
          >
            인증서 초안 업로드
          </button>
        )}
        {has("CEC_APPROVE_DRAFT_SUBMIT_SHIPPING") && (
          <button
            className={primary}
            disabled={busy}
            onClick={() => toggle("shipping")}
          >
            초안 승인 + 선적서류 제출
          </button>
        )}
        {has("CEC_REJECT_CERTIFICATE_DRAFT") && (
          <button
            className={danger}
            disabled={busy}
            onClick={() => toggle("rejectDraft")}
          >
            초안 거절
          </button>
        )}

        {has("CEC_PREPARE_FINAL_DRAFT") && (
          <button
            className={primary}
            disabled={busy}
            onClick={() => toggle("finalDraft")}
          >
            최종 초안 준비 완료
          </button>
        )}
        {has("CEC_BLOCK_CERTIFICATE_ISSUANCE") && (
          <button
            className={danger}
            disabled={busy}
            onClick={() => toggle("blockIssuance")}
          >
            발급 진행 불가
          </button>
        )}
        {has("CEC_RESUME_CERTIFICATION") && (
          <button
            className={primary}
            disabled={busy}
            onClick={() => runAction({ action: "CEC_RESUME_CERTIFICATION" })}
          >
            보완 완료 (복귀)
          </button>
        )}

        {has("CEC_SUBMIT_BALANCE") && (
          <button
            className={primary}
            disabled={busy}
            onClick={() => toggle("balance")}
          >
            초안 확인 후 잔금 입금
          </button>
        )}
        {has("CEC_REJECT_FINAL_DRAFT") && (
          <button
            className={danger}
            disabled={busy}
            onClick={() => toggle("rejectFinalDraft")}
          >
            최종 초안 거절
          </button>
        )}
        {has("CEC_REWORK_FINAL_DRAFT") && (
          <button
            className={primary}
            disabled={busy}
            onClick={() => runAction({ action: "CEC_REWORK_FINAL_DRAFT" })}
          >
            최종 초안 재작업 (복귀)
          </button>
        )}
        {has("CEC_CONFIRM_BALANCE") && (
          <button
            className={primary}
            disabled={busy}
            onClick={() => runAction({ action: "CEC_CONFIRM_BALANCE" })}
          >
            잔금 입금확인
          </button>
        )}
        {has("CEC_REJECT_BALANCE") && (
          <button
            className={danger}
            disabled={busy}
            onClick={() => toggle("rejectBalance")}
          >
            잔금 확인불가
          </button>
        )}
        {has("CEC_COMPLETE_CERTIFICATION") && (
          <button
            className={primary}
            disabled={busy}
            onClick={() => toggle("complete")}
          >
            최종 인증서 등록/완료
          </button>
        )}
      </div>

      {/* 사유 입력형 */}
      {openForm === "rejectDocs" && (
        <ReasonForm
          label="서류 반려 사유"
          busy={busy}
          value={reason}
          onChange={setReason}
          onSubmit={() => runAction({ action: "CEC_REJECT_DOCUMENTS", reason })}
        />
      )}
      {openForm === "rejectDeposit" && (
        <ReasonForm
          label="선금 확인불가 사유"
          busy={busy}
          value={reason}
          onChange={setReason}
          onSubmit={() => runAction({ action: "CEC_REJECT_DEPOSIT", reason })}
        />
      )}
      {openForm === "rejectValuation" && (
        <ReasonForm
          label="가격평가 거절 사유"
          busy={busy}
          value={reason}
          onChange={setReason}
          onSubmit={() => runAction({ action: "CEC_REJECT_VALUATION", reason })}
        />
      )}
      {openForm === "rejectDraft" && (
        <ReasonForm
          label="인증서 초안 거절 사유"
          busy={busy}
          value={reason}
          onChange={setReason}
          onSubmit={() =>
            runAction({ action: "CEC_REJECT_CERTIFICATE_DRAFT", reason })
          }
        />
      )}
      {openForm === "rejectFinalDraft" && (
        <ReasonForm
          label="최종 초안 거절 사유"
          busy={busy}
          value={reason}
          onChange={setReason}
          onSubmit={() =>
            runAction({ action: "CEC_REJECT_FINAL_DRAFT", reason })
          }
        />
      )}
      {openForm === "rejectBalance" && (
        <ReasonForm
          label="잔금 확인불가 사유"
          busy={busy}
          value={reason}
          onChange={setReason}
          onSubmit={() => runAction({ action: "CEC_REJECT_BALANCE", reason })}
        />
      )}
      {(openForm === "blockInspection" || openForm === "blockIssuance") && (
        <BlockForm
          busy={busy}
          reason={reason}
          setReason={setReason}
          neededDocs={neededDocs}
          setNeededDocs={setNeededDocs}
          onSubmit={() =>
            runAction({
              action:
                openForm === "blockInspection"
                  ? "CEC_BLOCK_INSPECTION"
                  : "CEC_BLOCK_CERTIFICATE_ISSUANCE",
              reason,
              needed_docs: neededDocs,
            })
          }
        />
      )}

      {openForm === "accept" && (
        <AcceptForm
          busy={busy}
          onSubmit={(cec_accept) =>
            runAction({ action: "CEC_ACCEPT_REQUEST", cec_accept })
          }
        />
      )}
      {openForm === "deposit" && (
        <PaymentForm
          busy={busy}
          onSubmit={(payment) =>
            runAction({ action: "CEC_SUBMIT_DEPOSIT", payment })
          }
        />
      )}
      {openForm === "balance" && (
        <PaymentForm
          busy={busy}
          onSubmit={(payment) =>
            runAction({ action: "CEC_SUBMIT_BALANCE", payment })
          }
        />
      )}
      {openForm === "resubmitDocs" && (
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <p className="text-xs text-gray-500">
            필요 시 파일을 선택하고 재제출하세요. 선택한 파일은 재제출 시 함께
            업로드됩니다. (기존 파일 유지)
          </p>
          <CecUpload
            ref={uploadRef}
            requestId={requestId}
            types={[
              "CEC_PURCHASE_RECEIPT",
              "CEC_NAMEPLATE",
              "CEC_PRODUCT_PHOTO",
              "CEC_REQUEST_OTHER",
            ]}
            onError={props.setError}
          />
          <button
            className={primary}
            disabled={busy}
            onClick={() =>
              runActionWithFiles({ action: "CEC_RESUBMIT_DOCUMENTS" })
            }
          >
            재제출 (담당자 재검토 요청)
          </button>
        </div>
      )}

      {openForm === "valuation" && (
        <ValuationForm
          busy={busy}
          requestId={requestId}
          withReport
          currency={currency}
          onError={props.setError}
          submitLabel="검사 결과/가격평가 제출"
          onSubmit={(cec_valuation) =>
            runAction({ action: "CEC_COMPLETE_VALUATION", cec_valuation })
          }
        />
      )}
      {openForm === "resubmitValuation" && (
        <ValuationForm
          busy={busy}
          requestId={requestId}
          currency={currency}
          onError={props.setError}
          submitLabel="평가 재제출"
          onSubmit={(cec_valuation) =>
            runAction({ action: "CEC_RESUBMIT_VALUATION", cec_valuation })
          }
        />
      )}

      {openForm === "draft" && (
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <p className="text-xs text-gray-500">
            인증서 초안을 선택하면 아래 버튼을 누를 때 함께 업로드됩니다.
          </p>
          <CecUpload
            ref={uploadRef}
            requestId={requestId}
            types={["CEC_CERTIFICATE_DRAFT"]}
            onError={props.setError}
          />
          <button
            className={primary}
            disabled={busy}
            onClick={() =>
              runActionWithFiles({ action: "CEC_UPLOAD_CERTIFICATE_DRAFT" })
            }
          >
            초안 업로드 완료 (고객 안내)
          </button>
        </div>
      )}
      {openForm === "shipping" && (
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <p className="text-xs text-gray-500">
            인보이스는 필수입니다. 파일을 선택하면 아래 버튼을 누를 때 함께
            업로드됩니다.
          </p>
          <CecUpload
            ref={uploadRef}
            requestId={requestId}
            types={[
              "CEC_SHIPPING_INVOICE",
              "CEC_BILL_OF_LADING",
              "CEC_SHIPPING_OTHER",
            ]}
            onError={props.setError}
          />
          <button
            className={primary}
            disabled={busy}
            onClick={() =>
              runActionWithFiles({
                action: "CEC_APPROVE_DRAFT_SUBMIT_SHIPPING",
              })
            }
          >
            초안 승인 + 선적서류 제출
          </button>
        </div>
      )}
      {openForm === "finalDraft" && (
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <p className="text-xs text-gray-500">
            최종 인증서 초안(워터마크 PDF, 미리보기 전용)과 세금계산서를
            선택하면 아래 버튼을 누를 때 함께 업로드됩니다.
          </p>
          <CecUpload
            ref={uploadRef}
            requestId={requestId}
            types={["CEC_FINAL_CERTIFICATE_PREVIEW", "CEC_TAX_INVOICE"]}
            accept={{ CEC_FINAL_CERTIFICATE_PREVIEW: "application/pdf" }}
            onError={props.setError}
          />
          <button
            className={primary}
            disabled={busy}
            onClick={() =>
              runActionWithFiles({ action: "CEC_PREPARE_FINAL_DRAFT" })
            }
          >
            최종 초안 준비 완료 (잔금 안내)
          </button>
        </div>
      )}
      {openForm === "complete" && (
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <p className="text-xs text-gray-500">
            최종 인증서(PDF)를 선택하고 완료 처리하세요. 선택한 파일은 완료 처리
            시 함께 업로드됩니다. 잔금 확인 + PDF 가 있어야 완료됩니다.
          </p>
          <CecUpload
            ref={uploadRef}
            requestId={requestId}
            types={["CEC_FINAL_CERTIFICATE"]}
            accept={{ CEC_FINAL_CERTIFICATE: "application/pdf" }}
            onError={props.setError}
          />
          <button
            className={primary}
            disabled={busy}
            onClick={() =>
              runActionWithFiles({ action: "CEC_COMPLETE_CERTIFICATION" })
            }
          >
            완료 처리
          </button>
        </div>
      )}

      {openForm === "assign" && (
        <div className="border-t border-gray-100 pt-4 space-y-2">
          <label className="text-xs font-semibold text-gray-600">
            담당 직원 선택
          </label>
          <select
            className={selectCls}
            value={assignee}
            onChange={(e) =>
              setAssignee(e.target.value ? Number(e.target.value) : "")
            }
          >
            <option value="">직원 선택...</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.login_id} ({s.email})
              </option>
            ))}
          </select>
          <button
            className={primary}
            disabled={busy || !assignee}
            onClick={() =>
              runAction({
                action:
                  status === "CEC_REQUESTED"
                    ? "CEC_ASSIGN_STAFF"
                    : "CEC_REASSIGN_STAFF",
                assignee_user_id: assignee,
              })
            }
          >
            {status === "CEC_REQUESTED"
              ? "지정 (접수번호 발급)"
              : "담당자 변경"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------- 하위 폼 ---------------------------- */

function ReasonForm(props: {
  label: string;
  busy: boolean;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="border-t border-gray-100 pt-4 space-y-2">
      <label className="text-xs font-semibold text-gray-600">
        {props.label} (필수)
      </label>
      <textarea
        className={`${inputCls} min-h-24`}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      />
      <button
        className="rounded-md bg-red-600 text-white text-sm font-semibold px-4 py-2 disabled:opacity-50"
        disabled={props.busy || !props.value.trim()}
        onClick={props.onSubmit}
      >
        제출
      </button>
    </div>
  );
}

function BlockForm(props: {
  busy: boolean;
  reason: string;
  setReason: (v: string) => void;
  neededDocs: string;
  setNeededDocs: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="border-t border-gray-100 pt-4 space-y-2">
      <Labeled label="문제/사유 (필수)">
        <textarea
          className={`${inputCls} min-h-20`}
          value={props.reason}
          onChange={(e) => props.setReason(e.target.value)}
        />
      </Labeled>
      <Labeled label="필요한 추가자료 (선택)">
        <textarea
          className={`${inputCls} min-h-16`}
          value={props.neededDocs}
          onChange={(e) => props.setNeededDocs(e.target.value)}
        />
      </Labeled>
      <button
        className="rounded-md bg-red-600 text-white text-sm font-semibold px-4 py-2 disabled:opacity-50"
        disabled={props.busy || !props.reason.trim()}
        onClick={props.onSubmit}
      >
        제출
      </button>
    </div>
  );
}

function AcceptForm(props: {
  busy: boolean;
  onSubmit: (v: {
    inspection_start_date: string;
    inspection_end_date: string;
    inspection_location?: string;
    inspection_memo?: string;
    quotation_memo?: string;
  }) => void;
}) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [memo, setMemo] = useState("");
  const [qmemo, setQmemo] = useState("");
  const days =
    start && end
      ? Math.max(
          0,
          Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1,
        )
      : 0;
  return (
    <div className="border-t border-gray-100 pt-4 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Labeled label="검사 시작일 (필수)">
          <input
            type="date"
            className={inputCls}
            value={start}
            onChange={(e) => {
              const v = e.target.value;
              setStart(v);
              // 보통 하루 검사라 종료일이 비었거나 시작일보다 빠르면 시작일과 같은 날로 맞춘다.
              if (v && (!end || end < v)) setEnd(v);
            }}
          />
        </Labeled>
        <Labeled label="검사 종료일 (필수)">
          <input
            type="date"
            className={inputCls}
            value={end}
            min={start || undefined}
            onChange={(e) => setEnd(e.target.value)}
          />
        </Labeled>
      </div>
      {days > 0 && (
        <p className="text-xs text-gray-500">
          예정 검사일수: {days}일 · 예상 검사비{" "}
          {(days * 250).toLocaleString("en-US")} USD · 선금 900 USD
        </p>
      )}
      <Labeled label="검사 관련 메모">
        <input
          className={inputCls}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />
      </Labeled>
      <Labeled label="견적 메모 (고객 안내)">
        <input
          className={inputCls}
          value={qmemo}
          onChange={(e) => setQmemo(e.target.value)}
        />
      </Labeled>
      <button
        className="rounded-md bg-(--brand) text-white text-sm font-semibold px-4 py-2 disabled:opacity-50"
        disabled={props.busy || !start || !end}
        onClick={() =>
          props.onSubmit({
            inspection_start_date: start,
            inspection_end_date: end,
            inspection_memo: memo,
            quotation_memo: qmemo,
          })
        }
      >
        접수 (선금 900 USD 안내 발송)
      </button>
    </div>
  );
}

function PaymentForm(props: {
  busy: boolean;
  onSubmit: (p: {
    depositor_name: string;
    sender_account?: string;
    payment_date?: string;
    memo?: string;
  }) => void;
}) {
  const [depositor, setDepositor] = useState("");
  const [account, setAccount] = useState("");
  const [date, setDate] = useState("");
  const [memo, setMemo] = useState("");
  return (
    <div className="border-t border-gray-100 pt-4 space-y-2">
      <Labeled label="입금자명 (필수)">
        <input
          className={inputCls}
          value={depositor}
          onChange={(e) => setDepositor(e.target.value)}
        />
      </Labeled>
      <Labeled label="입금/송금 계좌 정보">
        <input
          className={inputCls}
          value={account}
          onChange={(e) => setAccount(e.target.value)}
        />
      </Labeled>
      <Labeled label="입금일자">
        <input
          type="date"
          className={inputCls}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </Labeled>
      <Labeled label="메모">
        <input
          className={inputCls}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />
      </Labeled>
      <button
        className="rounded-md bg-(--brand) text-white text-sm font-semibold px-4 py-2 disabled:opacity-50"
        disabled={props.busy || !depositor.trim()}
        onClick={() =>
          props.onSubmit({
            depositor_name: depositor,
            sender_account: account,
            payment_date: date || undefined,
            memo,
          })
        }
      >
        입금완료
      </button>
      <p className="text-[11px] text-gray-400">
        등록 후 담당자 확인 전까지 &quot;입금 확인 중&quot;으로 표시됩니다.
      </p>
    </div>
  );
}

function ValuationForm(props: {
  busy: boolean;
  requestId: number;
  withReport?: boolean;
  submitLabel: string;
  currency: string;
  onError: (v: string | null) => void;
  onSubmit: (v: {
    actual_start_date: string;
    actual_end_date: string;
    internal_memo?: string;
    customer_memo?: string;
    valuation_amount: number;
    valuation_currency?: string;
    valuation_description?: string;
    surcharge_applied: boolean;
    notes?: string;
  }) => void;
}) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [surcharge, setSurcharge] = useState(false);
  // CEC 는 견적 총액(기본비+검사비+물건가액 0.5% 수수료)이 모두 pricing.currency 로
  // 합산되므로, 물건가액 통화도 견적 통화(props.currency)로 고정한다. (통화 혼용 방지)
  const currency = props.currency;
  const [internalMemo, setInternalMemo] = useState("");
  const [customerMemo, setCustomerMemo] = useState("");
  const upRef = useRef<UploadFieldsHandle>(null);
  const amt = Number(amount) || 0;
  return (
    <div className="border-t border-gray-100 pt-4 space-y-2">
      {props.withReport && (
        <>
          <p className="text-[11px] text-gray-500">
            내부 검사 리포트를 선택하세요(고객 비공개). 아래 제출 버튼을 누를 때
            함께 업로드됩니다.
          </p>
          <CecUpload
            ref={upRef}
            requestId={props.requestId}
            types={["CEC_INSPECTION_REPORT"]}
            onError={props.onError}
          />
          <div className="grid grid-cols-2 gap-2">
            <Labeled label="실제 검사 시작일 (필수)">
              <input
                type="date"
                className={inputCls}
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </Labeled>
            <Labeled label="실제 검사 종료일 (필수)">
              <input
                type="date"
                className={inputCls}
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </Labeled>
          </div>
        </>
      )}
      <Labeled label={`평가 물건가액 (${currency}, 필수)`}>
        <input
          type="number"
          className={inputCls}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </Labeled>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={surcharge}
          onChange={(e) => setSurcharge(e.target.checked)}
        />
        추가 수수료 0.5% 적용{" "}
        {surcharge && amt > 0 && (
          <span className="text-gray-500">
            (= {(amt * 0.005).toLocaleString("en-US")} {currency})
          </span>
        )}
      </label>
      <Labeled label="평가 설명 (고객 공개)">
        <textarea
          className={`${inputCls} min-h-16`}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
      </Labeled>
      {props.withReport && (
        <>
          <Labeled label="내부 메모 (비공개)">
            <input
              className={inputCls}
              value={internalMemo}
              onChange={(e) => setInternalMemo(e.target.value)}
            />
          </Labeled>
          <Labeled label="고객 공개 메모">
            <input
              className={inputCls}
              value={customerMemo}
              onChange={(e) => setCustomerMemo(e.target.value)}
            />
          </Labeled>
        </>
      )}
      <button
        className="rounded-md bg-(--brand) text-white text-sm font-semibold px-4 py-2 disabled:opacity-50"
        disabled={
          props.busy || (props.withReport && (!start || !end)) || !amount
        }
        onClick={async () => {
          if ((await upRef.current?.flush()) === false) return;
          props.onSubmit({
            actual_start_date: start,
            actual_end_date: end,
            internal_memo: internalMemo || undefined,
            customer_memo: customerMemo || undefined,
            valuation_amount: amt,
            valuation_currency: currency,
            valuation_description: desc || undefined,
            surcharge_applied: surcharge,
          });
        }}
      >
        {props.submitLabel}
      </button>
    </div>
  );
}

// CEC 파일 업로드. types 배열의 각 종류별 입력을 렌더. accept 로 종류별 MIME 제한.
// 자체 업로드 버튼 없이 flush() 를 노출 → 부모 액션 버튼이 업로드를 함께 처리.
const CecUpload = forwardRef<
  UploadFieldsHandle,
  {
    requestId: number;
    types: string[];
    accept?: Record<string, string>;
    onError: (v: string | null) => void;
  }
>(function CecUpload({ requestId, types, accept, onError }, ref) {
  return (
    <UploadFields
      ref={ref}
      requestId={requestId}
      onError={onError}
      items={types.map((t) => ({
        name: `files_${t}`,
        label: cecFileTypeLabel(t),
        accept: accept?.[t],
      }))}
    />
  );
});

/* ------------------------------- 프리미티브 ------------------------- */

const inputCls =
  "w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-(--brand) focus:outline-none";
const selectCls = `${inputCls} bg-white`;

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
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
      <dt className="text-[11px] font-semibold text-gray-400 uppercase">
        {label}
      </dt>
      <dd className="text-sm text-gray-800">{value}</dd>
    </div>
  );
}
function TotalRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={strong ? "font-bold text-(--brand)" : "text-gray-700"}>
        {value}
      </span>
    </div>
  );
}
function Labeled({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
