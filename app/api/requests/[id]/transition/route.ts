// 워크플로 전이 단일 디스패치 엔드포인트. 모든 상태 변경 액션을 여기로 받아
// RequestWorkflowService 로 위임한다. 권한/상태 검증은 서비스가 수행한다.
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import type { User } from "@/src/lib/types";
import { WorkflowError } from "@/src/lib/serviceWorkflow";
import { MESSAGE_TYPES, type MessageType } from "@/src/lib/serviceRequestTypes";
import * as wf from "@/src/lib/requestWorkflowService";
import * as cec from "@/src/lib/cecWorkflowService";
import * as pi from "@/src/lib/productInspectionWorkflowService";
import * as scrap from "@/src/lib/scrapIndiaWorkflowService";

export const runtime = "nodejs";

interface Ctx {
  params: Promise<{ id: string }>;
}

interface Body {
  action?: string;
  reason?: string;
  note?: string;
  needed_docs?: string;
  needed_action?: string;
  customer_visible?: boolean;
  problem_type?: string;
  expected_amount?: number;
  confirmed_amount?: number;
  message?: string;
  message_type?: string;
  assignee_user_id?: number;
  quotation?: wf.CompleteQuotationInput;
  payment?: wf.PaymentInput;
  cec_accept?: cec.AcceptCecInput;
  cec_valuation?: cec.CompleteCecValuationInput;
  pi_schedule?: pi.ConfirmScheduleInput;
  pi_schedule_update?: pi.UpdateScheduleInput;
  pi_complete?: pi.CompleteInspectionInput;
  pi_report?: pi.SubmitReportInput;
  pi_payment?: pi.RecordPaymentInput;
  scrap_schedule?: scrap.ConfirmScrapScheduleInput;
  scrap_schedule_revision?: scrap.RequestScrapScheduleRevisionInput;
  scrap_schedule_resubmit?: scrap.ResubmitScrapScheduleInput;
  scrap_complete?: scrap.CompleteScrapInspectionInput;
  scrap_billing?: scrap.IssueScrapBillingInput;
  scrap_payment?: scrap.ScrapPaymentInput;
  scrap_payment_confirm?: scrap.ConfirmScrapPaymentInput;
  scrap_dgft_start?: scrap.StartDgftRegistrationInput;
  scrap_dgft_complete?: scrap.CompleteDgftRegistrationInput;
}

export async function POST(req: Request, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const { id: idRaw } = await ctx.params;
  const id = Number(idRaw);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "잘못된 의뢰 ID 입니다." }, { status: 400 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  const action = body.action;
  try {
    let result:
      | cec.CecWorkflowResult
      | wf.WorkflowResult
      | pi.PiWorkflowResult
      | scrap.ScrapWorkflowResult
      | void;
    if (action && action.startsWith("CEC_")) {
      result = await dispatchCec(action, user, id, body);
    } else if (action && action.startsWith("PI_")) {
      result = await dispatchPi(action, user, id, body);
    } else if (action && action.startsWith("SCRAP_")) {
      result = await dispatchScrap(action, user, id, body);
    } else
    switch (action) {
      case "ASSIGN_STAFF":
        if (!body.assignee_user_id) throw new WorkflowError("담당자를 선택하세요.", "VALIDATION", 400);
        result = await wf.assignStaff(user, id, body.assignee_user_id);
        break;
      case "REASSIGN_STAFF":
        if (!body.assignee_user_id) throw new WorkflowError("담당자를 선택하세요.", "VALIDATION", 400);
        result = await wf.reassignStaff(user, id, body.assignee_user_id);
        break;
      case "ACCEPT_REQUEST":
        result = await wf.acceptRequest(user, id);
        break;
      case "REJECT_REQUEST":
        result = await wf.rejectRequest(user, id, body.reason ?? "");
        break;
      case "RESUBMIT_REQUEST":
        result = await wf.resubmitRequest(user, id, [], body.note);
        break;
      case "COMPLETE_QUOTATION":
        if (!body.quotation) throw new WorkflowError("견적 데이터가 없습니다.", "VALIDATION", 400);
        result = await wf.completeQuotation(user, id, body.quotation);
        break;
      case "SUBMIT_DEPOSIT":
        if (!body.payment) throw new WorkflowError("입금 정보가 없습니다.", "VALIDATION", 400);
        result = await wf.submitDeposit(user, id, body.payment);
        break;
      case "CONFIRM_DEPOSIT":
        result = await wf.confirmDeposit(user, id);
        break;
      case "REJECT_DEPOSIT":
        result = await wf.rejectDeposit(user, id, body.reason ?? "");
        break;
      case "RESUME_AFTER_DEPOSIT_REJECTION":
        if (!body.payment) throw new WorkflowError("입금 정보가 없습니다.", "VALIDATION", 400);
        result = await wf.resumeAfterDepositRejection(user, id, body.payment);
        break;
      case "COMPLETE_CERTIFICATION":
        result = await wf.completeCertification(user, id);
        break;
      case "BLOCK_CERTIFICATION":
        result = await wf.blockCertification(user, id, body.reason ?? "");
        break;
      case "RESUME_CERTIFICATION":
        result = await wf.resumeCertification(user, id, body.note);
        break;
      case "SUBMIT_BALANCE":
        if (!body.payment) throw new WorkflowError("입금 정보가 없습니다.", "VALIDATION", 400);
        result = await wf.submitBalance(user, id, body.payment);
        break;
      case "CONFIRM_BALANCE":
        result = await wf.confirmBalance(user, id);
        break;
      case "COMPLETE_FINAL_DOCUMENT":
        result = await wf.completeFinalDocument(user, id);
        break;
      case "ADD_MESSAGE": {
        const mt = body.message_type;
        if (!mt || !(MESSAGE_TYPES as readonly string[]).includes(mt)) {
          throw new WorkflowError("메모 종류가 올바르지 않습니다.", "VALIDATION", 400);
        }
        await wf.addMessage(user, id, mt as MessageType, body.message ?? "");
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ error: "알 수 없는 작업입니다." }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      status: result?.request.status,
      step: result?.request.workflow_step,
      request_number: result?.request.request_number,
      mail: result?.mail,
    });
  } catch (err) {
    if (err instanceof WorkflowError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.httpStatus });
    }
    console.error("transition error", action, err);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

// CEC India 전용 액션 디스패치. 권한/상태/필수값 검증은 cecWorkflowService 가 수행한다.
async function dispatchCec(
  action: string,
  user: User,
  id: number,
  body: Body,
): Promise<cec.CecWorkflowResult> {
  switch (action) {
    case "CEC_ASSIGN_STAFF":
      if (!body.assignee_user_id) throw new WorkflowError("담당자를 선택하세요.", "VALIDATION", 400);
      return cec.assignCecStaff(user, id, body.assignee_user_id);
    case "CEC_REASSIGN_STAFF":
      if (!body.assignee_user_id) throw new WorkflowError("담당자를 선택하세요.", "VALIDATION", 400);
      return cec.reassignCecStaff(user, id, body.assignee_user_id);
    case "CEC_REJECT_DOCUMENTS":
      return cec.rejectCecDocuments(user, id, body.reason ?? "");
    case "CEC_RESUBMIT_DOCUMENTS":
      return cec.resubmitCecDocuments(user, id, body.note);
    case "CEC_ACCEPT_REQUEST":
      if (!body.cec_accept) throw new WorkflowError("검사 일정 정보가 없습니다.", "VALIDATION", 400);
      return cec.acceptCecRequest(user, id, body.cec_accept);
    case "CEC_SUBMIT_DEPOSIT":
      if (!body.payment) throw new WorkflowError("입금 정보가 없습니다.", "VALIDATION", 400);
      return cec.submitCecDeposit(user, id, body.payment);
    case "CEC_CONFIRM_DEPOSIT":
      return cec.confirmCecDeposit(user, id);
    case "CEC_REJECT_DEPOSIT":
      return cec.rejectCecDeposit(user, id, body.reason ?? "");
    case "CEC_SCHEDULE_INSPECTION":
      return cec.scheduleCecInspection(user, id);
    case "CEC_START_INSPECTION":
      return cec.startCecInspection(user, id);
    case "CEC_BLOCK_INSPECTION":
      return cec.blockCecInspection(user, id, body.reason ?? "", body.needed_docs);
    case "CEC_RESUME_INSPECTION":
      return cec.resumeCecInspection(user, id, body.note);
    case "CEC_COMPLETE_VALUATION":
      if (!body.cec_valuation) throw new WorkflowError("검사 결과/가격평가 정보가 없습니다.", "VALIDATION", 400);
      return cec.completeCecValuation(user, id, body.cec_valuation);
    case "CEC_APPROVE_VALUATION":
      return cec.approveCecValuation(user, id);
    case "CEC_REJECT_VALUATION":
      return cec.rejectCecValuation(user, id, body.reason ?? "");
    case "CEC_RESUBMIT_VALUATION":
      if (!body.cec_valuation) throw new WorkflowError("가격평가 정보가 없습니다.", "VALIDATION", 400);
      return cec.resubmitCecValuation(user, id, body.cec_valuation);
    case "CEC_UPLOAD_CERTIFICATE_DRAFT":
      return cec.uploadCecCertificateDraft(user, id);
    case "CEC_APPROVE_DRAFT_SUBMIT_SHIPPING":
      return cec.approveCecDraftAndSubmitShippingDocuments(user, id);
    case "CEC_REJECT_CERTIFICATE_DRAFT":
      return cec.rejectCecCertificateDraft(user, id, body.reason ?? "");
    case "CEC_PREPARE_FINAL_DRAFT":
      return cec.prepareCecFinalDraft(user, id);
    case "CEC_BLOCK_CERTIFICATE_ISSUANCE":
      return cec.blockCecCertificateIssuance(user, id, body.reason ?? "", body.needed_docs);
    case "CEC_RESUME_CERTIFICATION":
      return cec.resumeCecCertification(user, id, body.note);
    case "CEC_SUBMIT_BALANCE":
      if (!body.payment) throw new WorkflowError("입금 정보가 없습니다.", "VALIDATION", 400);
      return cec.submitCecBalance(user, id, body.payment);
    case "CEC_REJECT_FINAL_DRAFT":
      return cec.rejectCecFinalDraft(user, id, body.reason ?? "");
    case "CEC_REWORK_FINAL_DRAFT":
      return cec.reworkCecFinalDraft(user, id, body.note);
    case "CEC_CONFIRM_BALANCE":
      return cec.confirmCecBalance(user, id);
    case "CEC_REJECT_BALANCE":
      return cec.rejectCecBalance(user, id, body.reason ?? "");
    case "CEC_COMPLETE_CERTIFICATION":
      return cec.completeCecCertification(user, id);
    default:
      throw new WorkflowError("알 수 없는 CEC 작업입니다.", "VALIDATION", 400);
  }
}

// 제품검사 전용 액션 디스패치. 권한/상태/필수값 검증은 productInspectionWorkflowService 가 수행한다.
async function dispatchPi(
  action: string,
  user: User,
  id: number,
  body: Body,
): Promise<pi.PiWorkflowResult> {
  switch (action) {
    case "PI_ASSIGN_STAFF":
      if (!body.assignee_user_id) throw new WorkflowError("담당자를 선택하세요.", "VALIDATION", 400);
      return pi.assignProductInspectionStaff(user, id, body.assignee_user_id);
    case "PI_REASSIGN_STAFF":
      if (!body.assignee_user_id) throw new WorkflowError("담당자를 선택하세요.", "VALIDATION", 400);
      return pi.reassignProductInspectionStaff(user, id, body.assignee_user_id);
    case "PI_REJECT_REQUEST":
      return pi.rejectProductInspectionRequest(user, id, body.reason ?? "", body.needed_docs);
    case "PI_RESUBMIT_REQUEST":
      return pi.resubmitProductInspectionRequest(user, id, body.note);
    case "PI_CONFIRM_SCHEDULE":
      if (!body.pi_schedule) throw new WorkflowError("검사 일정 정보가 없습니다.", "VALIDATION", 400);
      return pi.confirmProductInspectionSchedule(user, id, body.pi_schedule);
    case "PI_UPDATE_SCHEDULE":
      if (!body.pi_schedule_update) throw new WorkflowError("변경할 검사 일정 정보가 없습니다.", "VALIDATION", 400);
      return pi.updateProductInspectionSchedule(user, id, body.pi_schedule_update);
    case "PI_START_INSPECTION":
      return pi.startProductInspection(user, id);
    case "PI_BLOCK_INSPECTION":
      return pi.blockProductInspection(user, id, body.reason ?? "", {
        neededAction: body.needed_action,
        customerVisible: body.customer_visible,
      });
    case "PI_RESUME_INSPECTION":
      return pi.resumeProductInspection(user, id, body.note);
    case "PI_COMPLETE_INSPECTION":
      if (!body.pi_complete) throw new WorkflowError("검사 완료 정보가 없습니다.", "VALIDATION", 400);
      return pi.completeProductInspection(user, id, body.pi_complete);
    case "PI_SUBMIT_REPORT":
      if (!body.pi_report) throw new WorkflowError("리포트 제출 정보가 없습니다.", "VALIDATION", 400);
      return pi.submitProductInspectionReport(user, id, body.pi_report);
    case "PI_BLOCK_REPORT":
      return pi.blockProductInspectionReport(user, id, body.reason ?? "", {
        problemType: body.problem_type,
        neededAction: body.needed_action,
      });
    case "PI_RESUME_REPORT":
      return pi.resumeProductInspectionReport(user, id, body.note);
    case "PI_RECORD_PAYMENT":
      if (!body.pi_payment) throw new WorkflowError("입금 정보가 없습니다.", "VALIDATION", 400);
      return pi.recordExternalAgencyPayment(user, id, body.pi_payment);
    case "PI_BLOCK_PAYMENT":
      return pi.blockExternalAgencyPayment(user, id, body.reason ?? "", {
        problemType: body.problem_type,
        expectedAmount: body.expected_amount,
        confirmedAmount: body.confirmed_amount,
      });
    case "PI_RESUME_PAYMENT":
      return pi.resumeExternalAgencyPayment(user, id, body.note);
    case "PI_COMPLETE":
      return pi.completeProductInspectionProcess(user, id);
    default:
      throw new WorkflowError("알 수 없는 제품검사 작업입니다.", "VALIDATION", 400);
  }
}

// 스크랩 India 전용 액션 디스패치. 권한/상태/필수값 검증은 scrapIndiaWorkflowService 가 수행한다.
async function dispatchScrap(
  action: string,
  user: User,
  id: number,
  body: Body,
): Promise<scrap.ScrapWorkflowResult> {
  switch (action) {
    case "SCRAP_ASSIGN_STAFF":
      if (!body.assignee_user_id) throw new WorkflowError("담당자를 선택하세요.", "VALIDATION", 400);
      return scrap.assignScrapStaff(user, id, body.assignee_user_id);
    case "SCRAP_REASSIGN_STAFF":
      if (!body.assignee_user_id) throw new WorkflowError("담당자를 선택하세요.", "VALIDATION", 400);
      return scrap.reassignScrapStaff(user, id, body.assignee_user_id);
    case "SCRAP_CONFIRM_SCHEDULE":
      if (!body.scrap_schedule) throw new WorkflowError("확정 검사 일정 정보가 없습니다.", "VALIDATION", 400);
      return scrap.confirmScrapInspectionSchedule(user, id, body.scrap_schedule);
    case "SCRAP_REQUEST_SCHEDULE_REVISION":
      if (!body.scrap_schedule_revision) throw new WorkflowError("일정 조정 요청 정보가 없습니다.", "VALIDATION", 400);
      return scrap.requestScrapScheduleRevision(user, id, body.scrap_schedule_revision);
    case "SCRAP_RESUBMIT_SCHEDULE":
      return scrap.resubmitScrapSchedule(user, id, body.scrap_schedule_resubmit ?? {});
    case "SCRAP_START_INSPECTION":
      return scrap.startScrapInspection(user, id);
    case "SCRAP_BLOCK_INSPECTION":
      return scrap.blockScrapInspection(user, id, body.reason ?? "", {
        problemType: body.problem_type,
        neededAction: body.needed_action,
        customerVisible: body.customer_visible,
      });
    case "SCRAP_RESUME_INSPECTION":
      return scrap.resumeScrapInspection(user, id, body.note);
    case "SCRAP_COMPLETE_INSPECTION":
      if (!body.scrap_complete) throw new WorkflowError("검사 완료 정보가 없습니다.", "VALIDATION", 400);
      return scrap.completeScrapInspection(user, id, body.scrap_complete);
    case "SCRAP_SUBMIT_DOCUMENTS":
      return scrap.submitScrapCustomerDocuments(user, id, body.note);
    case "SCRAP_RESUBMIT_DOCUMENTS":
      return scrap.resubmitScrapCustomerDocuments(user, id, body.note);
    case "SCRAP_REQUEST_DOCUMENT_REVISION":
      return scrap.requestScrapDocumentRevision(user, id, body.reason ?? "", body.needed_docs);
    case "SCRAP_APPROVE_DOCUMENTS":
      return scrap.approveScrapCustomerDocuments(user, id);
    case "SCRAP_COMPLETE_REPORT":
      return scrap.completeScrapInternalReport(user, id, { internal_memo: body.note });
    case "SCRAP_BLOCK_REPORT":
      return scrap.blockScrapReport(user, id, body.reason ?? "", {
        problemType: body.problem_type,
        neededAction: body.needed_action,
        customerVisible: body.customer_visible,
      });
    case "SCRAP_RESUME_REPORT":
      return scrap.resumeScrapReport(user, id, body.note);
    case "SCRAP_ISSUE_BILLING":
      if (!body.scrap_billing) throw new WorkflowError("청구 정보가 없습니다.", "VALIDATION", 400);
      return scrap.issueScrapBilling(user, id, body.scrap_billing);
    case "SCRAP_SUBMIT_PAYMENT":
      if (!body.scrap_payment) throw new WorkflowError("입금 정보가 없습니다.", "VALIDATION", 400);
      return scrap.submitScrapPayment(user, id, body.scrap_payment);
    case "SCRAP_RESUBMIT_PAYMENT":
      if (!body.scrap_payment) throw new WorkflowError("입금 정보가 없습니다.", "VALIDATION", 400);
      return scrap.resubmitScrapPayment(user, id, body.scrap_payment);
    case "SCRAP_CONFIRM_PAYMENT":
      return scrap.confirmScrapPayment(user, id, body.scrap_payment_confirm);
    case "SCRAP_REJECT_PAYMENT":
      return scrap.rejectScrapPayment(user, id, body.reason ?? "", {
        expectedAmount: body.expected_amount,
        confirmedAmount: body.confirmed_amount,
      });
    case "SCRAP_START_DGFT_DOCUMENT":
      return scrap.startDgftDocumentPreparation(user, id);
    case "SCRAP_START_DGFT_REGISTRATION":
      return scrap.startDgftRegistration(user, id, body.scrap_dgft_start);
    case "SCRAP_BLOCK_DGFT":
      return scrap.blockDgftRegistration(user, id, body.reason ?? "", {
        problemType: body.problem_type,
        neededAction: body.needed_action,
        customerVisible: body.customer_visible,
      });
    case "SCRAP_RESUME_DGFT":
      return scrap.resumeDgftRegistration(user, id, body.note);
    case "SCRAP_COMPLETE_DGFT":
      return scrap.completeDgftRegistration(user, id, body.scrap_dgft_complete);
    default:
      throw new WorkflowError("알 수 없는 스크랩 India 작업입니다.", "VALIDATION", 400);
  }
}
