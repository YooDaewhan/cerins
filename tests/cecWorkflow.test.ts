// CEC India 워크플로 상태 전이 규칙 단위 테스트 (DB 불필요, 순수 함수).
// 실행: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canCecTransition,
  availableCecActions,
  CEC_TRANSITIONS,
} from "@/src/lib/cecWorkflow";
import { CEC_STATUS, CEC_STATUS_STEP } from "@/src/lib/cecTypes";

const S = CEC_STATUS;

test("step + status: 각 상태의 step 번호(step 12 미사용, 3·11 공유, 완료 13)", () => {
  assert.equal(CEC_STATUS_STEP.CEC_REQUESTED, 0);
  assert.equal(CEC_STATUS_STEP.CEC_ASSIGNED, 1);
  assert.equal(CEC_STATUS_STEP.CEC_DOCUMENT_REJECTED, 2);
  // step 3 sub-status 모두 3
  for (const s of ["DEPOSIT_REQUESTED", "DEPOSIT_SUBMITTED", "DEPOSIT_REJECTED", "DEPOSIT_CONFIRMED", "INSPECTION_SCHEDULED", "INSPECTION_IN_PROGRESS"] as const) {
    assert.equal(CEC_STATUS_STEP[s], 3, s);
  }
  assert.equal(CEC_STATUS_STEP.CEC_INSPECTION_BLOCKED, 4);
  assert.equal(CEC_STATUS_STEP.CEC_VALUATION_REVIEW, 5);
  assert.equal(CEC_STATUS_STEP.CEC_VALUATION_REJECTED, 6);
  assert.equal(CEC_STATUS_STEP.CEC_CERTIFICATE_DRAFT, 7);
  assert.equal(CEC_STATUS_STEP.CEC_CERTIFICATION_BLOCKED, 8);
  assert.equal(CEC_STATUS_STEP.CEC_FINAL_DRAFT_PREPARATION, 9);
  assert.equal(CEC_STATUS_STEP.CEC_FINAL_OR_PAYMENT_REJECTED, 10);
  // step 11 sub-status 모두 11
  for (const s of ["BALANCE_REQUESTED", "BALANCE_SUBMITTED", "BALANCE_CONFIRMED"] as const) {
    assert.equal(CEC_STATUS_STEP[s], 11, s);
  }
  assert.equal(CEC_STATUS_STEP.CEC_COMPLETED, 13);
  assert.equal(Object.values(CEC_STATUS_STEP).includes(12), false);
});

test("담당자 지정: REQUESTED 에서 ADMIN 만", () => {
  assert.equal(canCecTransition("CEC_ASSIGN_STAFF", S.REQUESTED, "ADMIN"), true);
  assert.equal(canCecTransition("CEC_ASSIGN_STAFF", S.REQUESTED, "STAFF"), false);
  assert.equal(canCecTransition("CEC_ASSIGN_STAFF", S.REQUESTED, "CUSTOMER"), false);
  assert.equal(CEC_TRANSITIONS.CEC_ASSIGN_STAFF.to, S.ASSIGNED);
});

test("서류 반려/재제출: 반려는 담당자, 재제출은 고객 (시나리오 5,6)", () => {
  assert.equal(canCecTransition("CEC_REJECT_DOCUMENTS", S.ASSIGNED, "STAFF"), true);
  assert.equal(canCecTransition("CEC_REJECT_DOCUMENTS", S.ASSIGNED, "CUSTOMER"), false);
  assert.equal(CEC_TRANSITIONS.CEC_REJECT_DOCUMENTS.to, S.DOCUMENT_REJECTED); // step 2
  assert.equal(canCecTransition("CEC_RESUBMIT_DOCUMENTS", S.DOCUMENT_REJECTED, "CUSTOMER"), true);
  assert.equal(canCecTransition("CEC_RESUBMIT_DOCUMENTS", S.DOCUMENT_REJECTED, "STAFF"), false);
  assert.equal(CEC_TRANSITIONS.CEC_RESUBMIT_DOCUMENTS.to, S.ASSIGNED); // step 1 로 복귀
});

test("접수: ASSIGNED → DEPOSIT_REQUESTED (담당자)", () => {
  assert.equal(canCecTransition("CEC_ACCEPT_REQUEST", S.ASSIGNED, "STAFF"), true);
  assert.equal(CEC_TRANSITIONS.CEC_ACCEPT_REQUEST.to, S.DEPOSIT_REQUESTED);
});

test("선금: 최초 제출 + 확인불가 후 재제출 모두 고객, DEPOSIT_SUBMITTED 로", () => {
  assert.equal(canCecTransition("CEC_SUBMIT_DEPOSIT", S.DEPOSIT_REQUESTED, "CUSTOMER"), true);
  assert.equal(canCecTransition("CEC_SUBMIT_DEPOSIT", S.DEPOSIT_REJECTED, "CUSTOMER"), true); // 재제출
  assert.equal(canCecTransition("CEC_SUBMIT_DEPOSIT", S.DEPOSIT_REQUESTED, "STAFF"), false);
  assert.equal(canCecTransition("CEC_CONFIRM_DEPOSIT", S.DEPOSIT_SUBMITTED, "STAFF"), true);
  assert.equal(CEC_TRANSITIONS.CEC_CONFIRM_DEPOSIT.to, S.DEPOSIT_CONFIRMED);
  assert.equal(canCecTransition("CEC_REJECT_DEPOSIT", S.DEPOSIT_SUBMITTED, "ADMIN"), true);
});

test("검사: 예정 → 시작 → 진행불가/재개", () => {
  assert.equal(canCecTransition("CEC_SCHEDULE_INSPECTION", S.DEPOSIT_CONFIRMED, "STAFF"), true);
  assert.equal(canCecTransition("CEC_START_INSPECTION", S.INSPECTION_SCHEDULED, "STAFF"), true);
  assert.equal(canCecTransition("CEC_BLOCK_INSPECTION", S.INSPECTION_IN_PROGRESS, "STAFF"), true);
  assert.equal(CEC_TRANSITIONS.CEC_BLOCK_INSPECTION.to, S.INSPECTION_BLOCKED); // step 4
  assert.equal(canCecTransition("CEC_RESUME_INSPECTION", S.INSPECTION_BLOCKED, "STAFF"), true);
  assert.equal(CEC_TRANSITIONS.CEC_RESUME_INSPECTION.to, S.INSPECTION_IN_PROGRESS); // 3 으로 복귀
});

test("가격평가: 완료(3→5), 고객 확인(5→7)/거절(5→6), 재제출(6→5) (시나리오 12,13)", () => {
  assert.equal(canCecTransition("CEC_COMPLETE_VALUATION", S.INSPECTION_IN_PROGRESS, "STAFF"), true);
  assert.equal(CEC_TRANSITIONS.CEC_COMPLETE_VALUATION.to, S.VALUATION_REVIEW);
  assert.equal(canCecTransition("CEC_APPROVE_VALUATION", S.VALUATION_REVIEW, "CUSTOMER"), true);
  assert.equal(CEC_TRANSITIONS.CEC_APPROVE_VALUATION.to, S.CERTIFICATE_DRAFT); // step 7
  assert.equal(canCecTransition("CEC_REJECT_VALUATION", S.VALUATION_REVIEW, "CUSTOMER"), true);
  assert.equal(CEC_TRANSITIONS.CEC_REJECT_VALUATION.to, S.VALUATION_REJECTED); // step 6
  assert.equal(canCecTransition("CEC_RESUBMIT_VALUATION", S.VALUATION_REJECTED, "STAFF"), true);
  assert.equal(CEC_TRANSITIONS.CEC_RESUBMIT_VALUATION.to, S.VALUATION_REVIEW);
  // 고객은 확인만, 담당자는 재제출만.
  assert.equal(canCecTransition("CEC_APPROVE_VALUATION", S.VALUATION_REVIEW, "STAFF"), false);
});

test("인증서 초안: 승인+선적(7→9)/거절(7→8) (시나리오 15)", () => {
  assert.equal(canCecTransition("CEC_APPROVE_DRAFT_SUBMIT_SHIPPING", S.CERTIFICATE_DRAFT, "CUSTOMER"), true);
  assert.equal(CEC_TRANSITIONS.CEC_APPROVE_DRAFT_SUBMIT_SHIPPING.to, S.FINAL_DRAFT_PREPARATION); // step 9
  assert.equal(canCecTransition("CEC_REJECT_CERTIFICATE_DRAFT", S.CERTIFICATE_DRAFT, "CUSTOMER"), true);
  assert.equal(CEC_TRANSITIONS.CEC_REJECT_CERTIFICATE_DRAFT.to, S.CERTIFICATION_BLOCKED); // step 8
  // 초안 업로드는 담당자만, 상태 유지.
  assert.equal(canCecTransition("CEC_UPLOAD_CERTIFICATE_DRAFT", S.CERTIFICATE_DRAFT, "STAFF"), true);
  assert.equal(canCecTransition("CEC_UPLOAD_CERTIFICATE_DRAFT", S.CERTIFICATE_DRAFT, "CUSTOMER"), false);
});

test("최종 초안 준비: 9→11, 발급 문제: 9→8, 복귀는 동적(to=null) (시나리오 16)", () => {
  assert.equal(canCecTransition("CEC_PREPARE_FINAL_DRAFT", S.FINAL_DRAFT_PREPARATION, "STAFF"), true);
  assert.equal(CEC_TRANSITIONS.CEC_PREPARE_FINAL_DRAFT.to, S.BALANCE_REQUESTED); // step 11
  assert.equal(canCecTransition("CEC_BLOCK_CERTIFICATE_ISSUANCE", S.FINAL_DRAFT_PREPARATION, "STAFF"), true);
  assert.equal(CEC_TRANSITIONS.CEC_BLOCK_CERTIFICATE_ISSUANCE.to, S.CERTIFICATION_BLOCKED);
  // resume 는 resume_step(7/9)에 따라 서비스에서 목적지 확정 → to=null.
  assert.equal(canCecTransition("CEC_RESUME_CERTIFICATION", S.CERTIFICATION_BLOCKED, "STAFF"), true);
  assert.equal(CEC_TRANSITIONS.CEC_RESUME_CERTIFICATION.to, null);
});

test("잔금/최종초안: 제출(고객), 최종초안 거절(고객), 재작업(담당자), 확인/확인불가(담당자) (시나리오 24)", () => {
  // 잔금 제출: 최초(11) + 재제출(10, reject_type 은 서비스에서 검증)
  assert.equal(canCecTransition("CEC_SUBMIT_BALANCE", S.BALANCE_REQUESTED, "CUSTOMER"), true);
  assert.equal(canCecTransition("CEC_SUBMIT_BALANCE", S.FINAL_OR_PAYMENT_REJECTED, "CUSTOMER"), true);
  // 최종 초안 거절: 11 → 10 (고객)
  assert.equal(canCecTransition("CEC_REJECT_FINAL_DRAFT", S.BALANCE_REQUESTED, "CUSTOMER"), true);
  assert.equal(CEC_TRANSITIONS.CEC_REJECT_FINAL_DRAFT.to, S.FINAL_OR_PAYMENT_REJECTED); // step 10
  // 재작업: 10 → 9 (담당자)
  assert.equal(canCecTransition("CEC_REWORK_FINAL_DRAFT", S.FINAL_OR_PAYMENT_REJECTED, "STAFF"), true);
  assert.equal(CEC_TRANSITIONS.CEC_REWORK_FINAL_DRAFT.to, S.FINAL_DRAFT_PREPARATION); // step 9
  // 잔금 확인/확인불가
  assert.equal(canCecTransition("CEC_CONFIRM_BALANCE", S.BALANCE_SUBMITTED, "STAFF"), true);
  assert.equal(CEC_TRANSITIONS.CEC_CONFIRM_BALANCE.to, S.BALANCE_CONFIRMED);
  assert.equal(canCecTransition("CEC_REJECT_BALANCE", S.BALANCE_SUBMITTED, "STAFF"), true);
  assert.equal(CEC_TRANSITIONS.CEC_REJECT_BALANCE.to, S.FINAL_OR_PAYMENT_REJECTED); // step 10
});

test("완료: BALANCE_CONFIRMED → COMPLETED (담당자), 잔금확인만으로는 완료 아님 (시나리오 19,21)", () => {
  // 확인(11) 만으로 완료 전이가 되지 않음: BALANCE_SUBMITTED 에서 완료 불가.
  assert.equal(canCecTransition("CEC_COMPLETE_CERTIFICATION", S.BALANCE_SUBMITTED, "STAFF"), false);
  // BALANCE_CONFIRMED 에서만 완료 가능(+ 서비스에서 최종 PDF 검증).
  assert.equal(canCecTransition("CEC_COMPLETE_CERTIFICATION", S.BALANCE_CONFIRMED, "STAFF"), true);
  assert.equal(CEC_TRANSITIONS.CEC_COMPLETE_CERTIFICATION.to, S.COMPLETED); // step 13
});

test("availableCecActions: 상태·역할별 가능한 행동", () => {
  assert.deepEqual(availableCecActions(S.ASSIGNED, "STAFF").sort(), ["CEC_ACCEPT_REQUEST", "CEC_REJECT_DOCUMENTS"].sort());
  assert.deepEqual(availableCecActions(S.DEPOSIT_REQUESTED, "CUSTOMER"), ["CEC_SUBMIT_DEPOSIT"]);
  assert.deepEqual(availableCecActions(S.COMPLETED, "ADMIN"), []);
  // 고객은 검사 진행 단계에서 취할 수 있는 전이가 없다.
  assert.deepEqual(availableCecActions(S.INSPECTION_IN_PROGRESS, "CUSTOMER"), []);
});

test("허용되지 않은 전이는 모두 false", () => {
  assert.equal(canCecTransition("CEC_COMPLETE_CERTIFICATION", S.REQUESTED, "ADMIN"), false);
  assert.equal(canCecTransition("CEC_SUBMIT_DEPOSIT", S.COMPLETED, "CUSTOMER"), false);
  assert.equal(canCecTransition("CEC_CONFIRM_DEPOSIT", S.CERTIFICATE_DRAFT, "STAFF"), false);
});
