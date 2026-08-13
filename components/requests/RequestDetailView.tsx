"use client";

import { useEffect, useRef, useState } from "react";
import {
  SERVICE_TYPE_LABELS,
  STATUS_LABELS,
  CUSTOMER_STATUS_LABELS,
  PAYMENT_TYPE_LABELS,
  PAYMENT_STATUS_LABELS,
  MESSAGE_TYPE_LABELS,
  QUOTATION_FILE_TYPES,
  QUOTATION_FILE_LABELS,
  fileTypeLabel,
  FINAL_FILE_TYPE,
  type ServiceType,
  type RequestStatus,
  type QuotationFileType,
} from "@/src/lib/serviceRequestTypes";
import type { RequestDetailBundle } from "@/src/lib/requestDetail";
import AssigneeInfo from "@/components/requests/AssigneeInfo";
import {
  UploadFields,
  type UploadFieldsHandle,
  type UploadFieldItem,
} from "@/components/requests/UploadFields";

const REQUEST_RESUBMIT_TYPES = [
  "MANUAL",
  "DRAWING",
  "JOS",
  "EXISTING_CERTIFICATE",
  "TEST_REPORT",
  "AUTHORIZATION",
  "OTHER",
] as const;

interface StaffCandidate {
  id: number;
  login_id: string;
  email: string;
  user_level: number;
}

interface Props {
  bundle: RequestDetailBundle;
}

// 고객에게 보여줄 진행 단계 마일스톤(내부 번호 대신 흐름으로 표시).
const MILESTONES: { statuses: RequestStatus[]; label: string }[] = [
  {
    statuses: ["REQUESTED", "ASSIGNED", "REQUEST_REJECTED"],
    label: "접수/검토",
  },
  {
    statuses: [
      "QUOTATION",
      "DEPOSIT_REQUESTED",
      "DEPOSIT_SUBMITTED",
      "DEPOSIT_REJECTED",
    ],
    label: "견적/선금",
  },
  {
    statuses: ["CERTIFICATION_IN_PROGRESS", "CERTIFICATION_BLOCKED"],
    label: "인증 진행",
  },
  { statuses: ["BALANCE_REQUESTED", "BALANCE_SUBMITTED"], label: "잔금" },
  { statuses: ["FINAL_DOCUMENT_PENDING", "COMPLETED"], label: "최종 발행" },
];

export default function RequestDetailView({ bundle }: Props) {
  const {
    request: r,
    role,
    files,
    quotation,
    payments,
    messages,
    histories,
    actions,
  } = bundle;
  const isInternal = role === "STAFF" || role === "ADMIN";
  const currency = quotation?.quotation.currency ?? "KRW";

  // 최종 인증서는 상단 전용 섹션에서 강조 표시하고, 일반 첨부파일 목록에서는 제외한다.
  const finalCerts = files.filter((f) => f.file_type === FINAL_FILE_TYPE);
  const otherFiles = files.filter((f) => f.file_type !== FINAL_FILE_TYPE);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openForm, setOpenForm] = useState<string | null>(null);

  function money(v: string | null | undefined): string {
    if (v == null) return "-";
    const n = Number(v);
    return currency === "KRW"
      ? `${Math.round(n).toLocaleString("ko-KR")} KRW`
      : `${n.toLocaleString("ko-KR", { minimumFractionDigits: 2 })} ${currency}`;
  }

  async function runAction(body: Record<string, unknown>) {
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

  const activeMilestone = MILESTONES.findIndex((m) =>
    m.statuses.includes(r.status as RequestStatus),
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
            <p className="text-xs text-gray-500 mt-1">
              {SERVICE_TYPE_LABELS[r.service_type as ServiceType]}
            </p>
          </div>
          <span className="rounded-full bg-(--brand)/10 text-(--brand) text-xs font-semibold px-3 py-1">
            {isInternal
              ? `${STATUS_LABELS[r.status as RequestStatus]} (step ${r.workflow_step})`
              : CUSTOMER_STATUS_LABELS[r.status as RequestStatus]}
          </span>
        </div>

        {/* 진행 단계 */}
        <div className="mt-5 flex items-center gap-1">
          {MILESTONES.map((m, i) => (
            <div key={m.label} className="flex-1">
              <div
                className={`h-1.5 rounded-full ${
                  i <= activeMilestone ? "bg-(--brand)" : "bg-gray-200"
                }`}
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

      {/* 최종 인증서 (발급 시 상단 강조) */}
      {finalCerts.length > 0 && (
        <div className="bg-green-50 border border-green-300 rounded-xl p-6">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-white text-lg font-bold">
              ✓
            </span>
            <div>
              <h2 className="text-base font-bold text-green-800">
                최종 인증서 발급 완료
              </h2>
              <p className="text-xs text-green-700">
                아래에서 최종 인증서를 다운로드하실 수 있습니다.
              </p>
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            {finalCerts.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-white border border-green-200 px-4 py-3"
              >
                <span className="truncate text-sm font-medium text-gray-800">
                  {f.original_name}
                </span>
                <a
                  href={`/api/files/${f.id}`}
                  className="flex-shrink-0 rounded-md bg-green-600 text-white text-sm font-semibold px-4 py-2 hover:opacity-90"
                >
                  다운로드
                </a>
              </li>
            ))}
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
          {r.product_name && <Info label="제품명" value={r.product_name} />}
          {r.hs_code && <Info label="HS코드" value={r.hs_code} />}
          {r.product_use && <Info label="제품 용도" value={r.product_use} />}
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

      {/* 사유(반려/확인불가/보완) */}
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
                    {MESSAGE_TYPE_LABELS[m.message_type]}
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

      {/* 견적 */}
      {quotation && (
        <Card title="견적">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                  <th className="py-2">항목</th>
                  <th className="py-2 text-right">수량</th>
                  <th className="py-2 text-right">단가</th>
                  <th className="py-2 text-right">공급가액</th>
                  <th className="py-2">비고</th>
                </tr>
              </thead>
              <tbody>
                {quotation.items.map((it) => (
                  <tr key={it.id} className="border-b border-gray-100">
                    <td className="py-2">{it.item_name}</td>
                    <td className="py-2 text-right">{Number(it.quantity)}</td>
                    <td className="py-2 text-right">{money(it.unit_price)}</td>
                    <td className="py-2 text-right">{money(it.amount)}</td>
                    <td className="py-2 text-gray-500">{it.memo ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <dl className="mt-4 space-y-1 text-sm">
            <TotalRow
              label="총금액"
              value={money(quotation.quotation.total_amount)}
              strong
            />
            <TotalRow
              label="선금 (50%)"
              value={money(quotation.quotation.deposit_amount)}
            />
            <TotalRow
              label="잔금 (50%)"
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
                    {PAYMENT_TYPE_LABELS[p.payment_type]}
                  </span>
                  <span className="text-gray-500"> · {p.depositor_name}</span>
                  {p.payment_date && (
                    <span className="text-gray-400"> · {p.payment_date}</span>
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

      {/* 공개 메모 / 진행 메모 */}
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
                    {MESSAGE_TYPE_LABELS[m.message_type]}
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

      {/* 첨부파일 */}
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
                    {fileTypeLabel(f.file_type)}
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
        status={r.status as RequestStatus}
        setError={setError}
      />

      {/* 이력 (직원/관리자) */}
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
  bundle: RequestDetailBundle;
  actions: string[];
  role: string;
  busy: boolean;
  openForm: string | null;
  setOpenForm: (v: string | null) => void;
  runAction: (body: Record<string, unknown>) => Promise<boolean>;
  requestId: number;
  status: RequestStatus;
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
  } = props;
  const [reason, setReason] = useState("");
  const [staff, setStaff] = useState<StaffCandidate[]>([]);
  const [assignee, setAssignee] = useState<number | "">("");

  // 관리자 담당자 후보 로드.
  useEffect(() => {
    if (role !== "ADMIN") return;
    fetch("/api/admin/requests/staff-candidates", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { staff: [] }))
      .then((d: { staff: StaffCandidate[] }) => setStaff(d.staff ?? []))
      .catch(() => setStaff([]));
  }, [role]);

  const hasAny =
    actions.length > 0 ||
    (role === "ADMIN" && status === "REQUESTED") ||
    (role === "ADMIN" && !!props.bundle.request.request_number);

  if (!hasAny && role !== "ADMIN") return null;

  const btn = "rounded-md text-sm font-semibold px-4 py-2 disabled:opacity-50";
  const primary = `${btn} bg-(--brand) text-white hover:opacity-90`;
  const danger = `${btn} bg-red-600 text-white hover:opacity-90`;
  const ghost = `${btn} border border-gray-300 hover:bg-gray-50`;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
      <h2 className="text-sm font-bold text-gray-800">처리</h2>
      <div className="flex flex-wrap gap-2">
        {actions.includes("ACCEPT_REQUEST") && (
          <button
            className={primary}
            disabled={busy}
            onClick={() => runAction({ action: "ACCEPT_REQUEST" })}
          >
            접수
          </button>
        )}
        {actions.includes("REJECT_REQUEST") && (
          <button
            className={danger}
            disabled={busy}
            onClick={() => setOpenForm(openForm === "reject" ? null : "reject")}
          >
            반려
          </button>
        )}
        {actions.includes("CONFIRM_DEPOSIT") && (
          <button
            className={primary}
            disabled={busy}
            onClick={() => runAction({ action: "CONFIRM_DEPOSIT" })}
          >
            입금확인
          </button>
        )}
        {actions.includes("REJECT_DEPOSIT") && (
          <button
            className={danger}
            disabled={busy}
            onClick={() =>
              setOpenForm(openForm === "rejectDeposit" ? null : "rejectDeposit")
            }
          >
            확인불가
          </button>
        )}
        {actions.includes("CONFIRM_BALANCE") && (
          <button
            className={primary}
            disabled={busy}
            onClick={() => runAction({ action: "CONFIRM_BALANCE" })}
          >
            잔금확인
          </button>
        )}
        {actions.includes("COMPLETE_CERTIFICATION") && (
          <button
            className={primary}
            disabled={busy}
            onClick={() => runAction({ action: "COMPLETE_CERTIFICATION" })}
          >
            인증완료
          </button>
        )}
        {actions.includes("BLOCK_CERTIFICATION") && (
          <button
            className={danger}
            disabled={busy}
            onClick={() => setOpenForm(openForm === "block" ? null : "block")}
          >
            인증불가/보완
          </button>
        )}
        {actions.includes("RESUME_CERTIFICATION") && (
          <button
            className={primary}
            disabled={busy}
            onClick={() => runAction({ action: "RESUME_CERTIFICATION" })}
          >
            인증 재개
          </button>
        )}
        {actions.includes("COMPLETE_QUOTATION") && (
          <button
            className={primary}
            disabled={busy}
            onClick={() =>
              setOpenForm(openForm === "quotation" ? null : "quotation")
            }
          >
            견적 작성
          </button>
        )}
        {actions.includes("SUBMIT_DEPOSIT") && (
          <button
            className={primary}
            disabled={busy}
            onClick={() =>
              setOpenForm(openForm === "deposit" ? null : "deposit")
            }
          >
            선금 입금
          </button>
        )}
        {actions.includes("RESUME_AFTER_DEPOSIT_REJECTION") && (
          <button
            className={primary}
            disabled={busy}
            onClick={() =>
              setOpenForm(openForm === "deposit" ? null : "deposit")
            }
          >
            선금 정보 재제출
          </button>
        )}
        {actions.includes("SUBMIT_BALANCE") && (
          <button
            className={primary}
            disabled={busy}
            onClick={() =>
              setOpenForm(openForm === "balance" ? null : "balance")
            }
          >
            초안 확인 후 잔금 입금
          </button>
        )}
        {actions.includes("RESUBMIT_REQUEST") && (
          <button
            className={primary}
            disabled={busy}
            onClick={() =>
              setOpenForm(openForm === "resubmit" ? null : "resubmit")
            }
          >
            보완 후 재제출
          </button>
        )}
        {actions.includes("COMPLETE_FINAL_DOCUMENT") && (
          <button
            className={primary}
            disabled={busy}
            onClick={() => setOpenForm(openForm === "final" ? null : "final")}
          >
            최종 인증서 등록/완료
          </button>
        )}
        {/* 고객 보완자료(인증 보완 단계) */}
        {role === "CUSTOMER" && status === "CERTIFICATION_BLOCKED" && (
          <button
            className={ghost}
            disabled={busy}
            onClick={() =>
              setOpenForm(openForm === "supplement" ? null : "supplement")
            }
          >
            보완 자료 업로드
          </button>
        )}
        {/* 관리자 담당자 지정/변경 */}
        {role === "ADMIN" && (
          <button
            className={ghost}
            disabled={busy}
            onClick={() => setOpenForm(openForm === "assign" ? null : "assign")}
          >
            {status === "REQUESTED" ? "담당자 지정" : "담당자 변경"}
          </button>
        )}
      </div>

      {/* 사유 입력형 폼 */}
      {(openForm === "reject" ||
        openForm === "rejectDeposit" ||
        openForm === "block") && (
        <ReasonForm
          label={
            openForm === "block"
              ? "보완/인증불가 사유"
              : openForm === "rejectDeposit"
                ? "입금 확인불가 사유"
                : "반려 사유"
          }
          busy={busy}
          value={reason}
          onChange={setReason}
          onSubmit={() => {
            const action =
              openForm === "block"
                ? "BLOCK_CERTIFICATION"
                : openForm === "rejectDeposit"
                  ? "REJECT_DEPOSIT"
                  : "REJECT_REQUEST";
            runAction({ action, reason });
          }}
        />
      )}

      {openForm === "quotation" && (
        <QuotationForm
          busy={busy}
          onSubmit={(q) =>
            runAction({ action: "COMPLETE_QUOTATION", quotation: q })
          }
          requestId={requestId}
          onError={props.setError}
        />
      )}
      {openForm === "deposit" && (
        <PaymentForm
          busy={busy}
          onSubmit={(p) =>
            runAction({
              action:
                status === "DEPOSIT_REJECTED"
                  ? "RESUME_AFTER_DEPOSIT_REJECTION"
                  : "SUBMIT_DEPOSIT",
              payment: p,
            })
          }
        />
      )}
      {openForm === "balance" && (
        <PaymentForm
          busy={busy}
          onSubmit={(p) => runAction({ action: "SUBMIT_BALANCE", payment: p })}
        />
      )}
      {openForm === "resubmit" && (
        <ResubmitForm
          busy={busy}
          requestId={requestId}
          onDone={() => runAction({ action: "RESUBMIT_REQUEST" })}
          onError={props.setError}
        />
      )}
      {openForm === "supplement" && (
        <SupplementForm
          busy={busy}
          requestId={requestId}
          onError={props.setError}
          onDone={() => window.location.reload()}
        />
      )}
      {openForm === "final" && (
        <FinalCertForm
          busy={busy}
          requestId={requestId}
          onError={props.setError}
          onComplete={() => runAction({ action: "COMPLETE_FINAL_DOCUMENT" })}
        />
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
                  status === "REQUESTED" ? "ASSIGN_STAFF" : "REASSIGN_STAFF",
                assignee_user_id: assignee,
              })
            }
          >
            {status === "REQUESTED" ? "지정 (접수번호 발급)" : "담당자 변경"}
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

interface QItem {
  item_type: QuotationFileType;
  item_name: string;
  quantity: number;
  unit_price: number;
  memo: string;
}

function QuotationForm(props: {
  busy: boolean;
  requestId: number;
  onSubmit: (q: { currency: string; notes?: string; items: QItem[] }) => void;
  onError: (v: string | null) => void;
}) {
  const [rows, setRows] = useState<QItem[]>(
    QUOTATION_FILE_TYPES.filter((t) => t !== "CERTIFICATE_DRAFT").map((t) => ({
      item_type: t,
      item_name: QUOTATION_FILE_LABELS[t],
      quantity: 1,
      unit_price: 0,
      memo: "",
    })),
  );
  const [notes, setNotes] = useState("");
  const total = rows.reduce((s, r) => s + r.quantity * r.unit_price, 0);

  function update(i: number, patch: Partial<QItem>) {
    setRows((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
    );
  }
  return (
    <div className="border-t border-gray-100 pt-4 space-y-3">
      <p className="text-xs font-semibold text-gray-600">가격표</p>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="grid grid-cols-12 gap-1 items-center">
            <input
              className={`${inputCls} col-span-3`}
              value={row.item_name}
              onChange={(e) => update(i, { item_name: e.target.value })}
              placeholder="항목명"
            />
            <input
              type="number"
              className={`${inputCls} col-span-2`}
              value={row.quantity}
              onChange={(e) => update(i, { quantity: Number(e.target.value) })}
              placeholder="수량"
            />
            <input
              type="number"
              className={`${inputCls} col-span-3`}
              value={row.unit_price}
              onChange={(e) =>
                update(i, { unit_price: Number(e.target.value) })
              }
              placeholder="단가"
            />
            <input
              className={`${inputCls} col-span-3`}
              value={row.memo}
              onChange={(e) => update(i, { memo: e.target.value })}
              placeholder="비고"
            />
            <button
              className="col-span-1 text-red-500 text-xs"
              onClick={() =>
                setRows((prev) => prev.filter((_, idx) => idx !== i))
              }
            >
              삭제
            </button>
          </div>
        ))}
      </div>
      <button
        className="text-xs font-semibold text-(--brand)"
        onClick={() =>
          setRows((p) => [
            ...p,
            {
              item_type: "QUOTATION_OTHER",
              item_name: "",
              quantity: 1,
              unit_price: 0,
              memo: "",
            },
          ])
        }
      >
        + 행 추가
      </button>
      <p className="text-sm font-semibold text-right">
        총금액: {Math.round(total).toLocaleString("ko-KR")} (선금{" "}
        {Math.round(total * 0.5).toLocaleString("ko-KR")})
      </p>
      <textarea
        className={`${inputCls} min-h-16`}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="비고 (선택)"
      />
      <button
        className="rounded-md bg-(--brand) text-white text-sm font-semibold px-4 py-2 disabled:opacity-50"
        disabled={props.busy || rows.length === 0}
        onClick={() => props.onSubmit({ currency: "KRW", notes, items: rows })}
      >
        견적 완료 (고객에게 선금 요청 발송)
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

function ResubmitForm(props: {
  busy: boolean;
  requestId: number;
  onDone: () => void;
  onError: (v: string | null) => void;
}) {
  const upRef = useRef<UploadFieldsHandle>(null);
  return (
    <div className="border-t border-gray-100 pt-4 space-y-3">
      <p className="text-xs text-gray-500">
        필요 시 파일을 선택하고 재제출하세요. 선택한 파일은 재제출 시 함께
        업로드됩니다. (기존 파일은 유지됩니다)
      </p>
      <UploadFields
        ref={upRef}
        requestId={props.requestId}
        onError={props.onError}
        items={REQUEST_RESUBMIT_TYPES.map((t) => ({
          name: `files_${t}`,
          label: fileTypeLabel(t),
        }))}
      />
      <button
        className="rounded-md bg-(--brand) text-white text-sm font-semibold px-4 py-2 disabled:opacity-50"
        disabled={props.busy}
        onClick={async () => {
          if ((await upRef.current?.flush()) === false) return;
          props.onDone();
        }}
      >
        재제출 (담당자 재검토 요청)
      </button>
    </div>
  );
}

function FinalCertForm(props: {
  busy: boolean;
  requestId: number;
  onError: (v: string | null) => void;
  onComplete: () => void;
}) {
  const upRef = useRef<UploadFieldsHandle>(null);
  return (
    <div className="border-t border-gray-100 pt-4 space-y-3">
      <p className="text-xs text-gray-500">
        최종 인증서(PDF)를 선택하고 완료 처리하세요. 선택한 파일은 완료 처리 시
        함께 업로드됩니다. PDF가 없으면 완료할 수 없습니다.
      </p>
      <UploadFields
        ref={upRef}
        requestId={props.requestId}
        onError={props.onError}
        items={[
          {
            name: `files_${FINAL_FILE_TYPE}`,
            label: "최종 인증서 (PDF)",
            accept: "application/pdf",
          },
        ]}
      />
      <button
        className="rounded-md bg-(--brand) text-white text-sm font-semibold px-4 py-2 disabled:opacity-50"
        disabled={props.busy}
        onClick={async () => {
          if ((await upRef.current?.flush()) === false) return;
          props.onComplete();
        }}
      >
        완료 처리
      </button>
    </div>
  );
}

// 고객 보완 자료 업로드(인증 보완 단계). 파일 선택 후 버튼 한 번으로 업로드된다.
function SupplementForm(props: {
  busy: boolean;
  requestId: number;
  onError: (v: string | null) => void;
  onDone: () => void;
}) {
  const upRef = useRef<UploadFieldsHandle>(null);
  const [fileCount, setFileCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const items: UploadFieldItem[] = [
    { name: "files_CUSTOMER_SUPPLEMENT", label: "보완 자료" },
  ];
  async function submit() {
    setSubmitting(true);
    try {
      if ((await upRef.current?.flush()) === false) return;
      props.onDone();
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <div className="border-t border-gray-100 pt-4 space-y-3">
      <UploadFields
        ref={upRef}
        requestId={props.requestId}
        onError={props.onError}
        onCountChange={setFileCount}
        items={items}
      />
      <button
        className="rounded-md bg-(--brand) text-white text-sm font-semibold px-4 py-2 disabled:opacity-50"
        disabled={props.busy || submitting || fileCount === 0}
        onClick={submit}
      >
        보완 자료 제출
      </button>
    </div>
  );
}

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
