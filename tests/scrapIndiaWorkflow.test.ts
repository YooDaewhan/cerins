// 스크랩 India 워크플로 상태 전이 규칙 단위 테스트 (DB 불필요, 순수 함수).
// 실행: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canScrapTransition,
  availableScrapActions,
  SCRAP_TRANSITIONS,
} from "@/src/lib/scrapIndiaWorkflow";
import { SCRAP_STATUS, SCRAP_STATUS_STEP } from "@/src/lib/scrapIndiaTypes";

const S = SCRAP_STATUS;

test("step + status: 각 상태의 step 번호(같은 step 을 공유하는 sub-status 포함)", () => {
  assert.equal(SCRAP_STATUS_STEP.SCRAP_REQUESTED, 0);
  assert.equal(SCRAP_STATUS_STEP.SCRAP_ASSIGNED, 1);
  assert.equal(SCRAP_STATUS_STEP.SCRAP_SCHEDULE_REVISION_REQUIRED, 2);
  assert.equal(SCRAP_STATUS_STEP.SCRAP_INSPECTION_SCHEDULED, 3);
  assert.equal(SCRAP_STATUS_STEP.SCRAP_INSPECTION_IN_PROGRESS, 3);
  assert.equal(SCRAP_STATUS_STEP.SCRAP_INSPECTION_BLOCKED, 4);
  assert.equal(SCRAP_STATUS_STEP.SCRAP_CUSTOMER_DOCUMENTS_PENDING, 5);
  assert.equal(SCRAP_STATUS_STEP.SCRAP_CUSTOMER_DOCUMENTS_SUBMITTED, 5);
  assert.equal(SCRAP_STATUS_STEP.SCRAP_DOCUMENTS_REVISION_REQUIRED, 6);
  assert.equal(SCRAP_STATUS_STEP.SCRAP_REPORT_PREPARING, 7);
  assert.equal(SCRAP_STATUS_STEP.SCRAP_REPORT_COMPLETED, 7);
  assert.equal(SCRAP_STATUS_STEP.SCRAP_REPORT_BLOCKED, 8);
  assert.equal(SCRAP_STATUS_STEP.SCRAP_PAYMENT_REQUESTED, 9);
  assert.equal(SCRAP_STATUS_STEP.SCRAP_PAYMENT_SUBMITTED, 9);
  assert.equal(SCRAP_STATUS_STEP.SCRAP_PAYMENT_REJECTED, 10);
  assert.equal(SCRAP_STATUS_STEP.SCRAP_PAYMENT_CONFIRMED, 11);
  assert.equal(SCRAP_STATUS_STEP.SCRAP_DGFT_DOCUMENT_PREPARING, 11);
  assert.equal(SCRAP_STATUS_STEP.SCRAP_DGFT_REGISTRATION_IN_PROGRESS, 11);
  assert.equal(SCRAP_STATUS_STEP.SCRAP_DGFT_REGISTRATION_BLOCKED, 12);
  assert.equal(SCRAP_STATUS_STEP.SCRAP_COMPLETED, 13);
});

test("담당자 지정: REQUESTED 에서 ADMIN 만 (시나리오 5)", () => {
  assert.equal(canScrapTransition("SCRAP_ASSIGN_STAFF", S.REQUESTED, "ADMIN"), true);
  assert.equal(canScrapTransition("SCRAP_ASSIGN_STAFF", S.REQUESTED, "STAFF"), false);
  assert.equal(canScrapTransition("SCRAP_ASSIGN_STAFF", S.REQUESTED, "CUSTOMER"), false);
  assert.equal(SCRAP_TRANSITIONS.SCRAP_ASSIGN_STAFF.to, S.ASSIGNED);
});

test("일정 검토: 확인(1→3) / 조정요청(1→2) / 고객 재제출(2→1) (시나리오 8,10,11)", () => {
  assert.equal(canScrapTransition("SCRAP_CONFIRM_SCHEDULE", S.ASSIGNED, "STAFF"), true);
  assert.equal(SCRAP_TRANSITIONS.SCRAP_CONFIRM_SCHEDULE.to, S.INSPECTION_SCHEDULED); // step 3
  assert.equal(canScrapTransition("SCRAP_REQUEST_SCHEDULE_REVISION", S.ASSIGNED, "STAFF"), true);
  assert.equal(SCRAP_TRANSITIONS.SCRAP_REQUEST_SCHEDULE_REVISION.to, S.SCHEDULE_REVISION_REQUIRED); // step 2
  assert.equal(canScrapTransition("SCRAP_RESUBMIT_SCHEDULE", S.SCHEDULE_REVISION_REQUIRED, "CUSTOMER"), true);
  assert.equal(canScrapTransition("SCRAP_RESUBMIT_SCHEDULE", S.SCHEDULE_REVISION_REQUIRED, "STAFF"), false);
  assert.equal(SCRAP_TRANSITIONS.SCRAP_RESUBMIT_SCHEDULE.to, S.ASSIGNED); // step 1 로 복귀
});

test("현장검사: 시작(3) / 진행문제(3→4) / 재개(동적) / 완료(3→5) (시나리오 12,13,14,16)", () => {
  assert.equal(canScrapTransition("SCRAP_START_INSPECTION", S.INSPECTION_SCHEDULED, "STAFF"), true);
  assert.equal(SCRAP_TRANSITIONS.SCRAP_START_INSPECTION.to, S.INSPECTION_IN_PROGRESS);
  assert.equal(canScrapTransition("SCRAP_BLOCK_INSPECTION", S.INSPECTION_SCHEDULED, "STAFF"), true);
  assert.equal(canScrapTransition("SCRAP_BLOCK_INSPECTION", S.INSPECTION_IN_PROGRESS, "STAFF"), true);
  assert.equal(SCRAP_TRANSITIONS.SCRAP_BLOCK_INSPECTION.to, S.INSPECTION_BLOCKED); // step 4
  assert.equal(SCRAP_TRANSITIONS.SCRAP_RESUME_INSPECTION.to, null); // 동적 복귀
  assert.equal(canScrapTransition("SCRAP_COMPLETE_INSPECTION", S.INSPECTION_SCHEDULED, "STAFF"), true);
  assert.equal(canScrapTransition("SCRAP_COMPLETE_INSPECTION", S.INSPECTION_IN_PROGRESS, "STAFF"), true);
  assert.equal(SCRAP_TRANSITIONS.SCRAP_COMPLETE_INSPECTION.to, S.CUSTOMER_DOCUMENTS_PENDING); // step 5
});

test("고객 서류: 제출(고객,5) / 보완요청(5→6) / 재제출(6→5) / 확인(5→7) (시나리오 19,20,21)", () => {
  assert.equal(canScrapTransition("SCRAP_SUBMIT_DOCUMENTS", S.CUSTOMER_DOCUMENTS_PENDING, "CUSTOMER"), true);
  assert.equal(canScrapTransition("SCRAP_SUBMIT_DOCUMENTS", S.CUSTOMER_DOCUMENTS_PENDING, "STAFF"), false);
  assert.equal(SCRAP_TRANSITIONS.SCRAP_SUBMIT_DOCUMENTS.to, S.CUSTOMER_DOCUMENTS_SUBMITTED); // step 5 유지
  assert.equal(canScrapTransition("SCRAP_REQUEST_DOCUMENT_REVISION", S.CUSTOMER_DOCUMENTS_SUBMITTED, "STAFF"), true);
  assert.equal(SCRAP_TRANSITIONS.SCRAP_REQUEST_DOCUMENT_REVISION.to, S.DOCUMENTS_REVISION_REQUIRED); // step 6
  assert.equal(canScrapTransition("SCRAP_RESUBMIT_DOCUMENTS", S.DOCUMENTS_REVISION_REQUIRED, "CUSTOMER"), true);
  assert.equal(SCRAP_TRANSITIONS.SCRAP_RESUBMIT_DOCUMENTS.to, S.CUSTOMER_DOCUMENTS_SUBMITTED); // step 5 복귀
  assert.equal(canScrapTransition("SCRAP_APPROVE_DOCUMENTS", S.CUSTOMER_DOCUMENTS_SUBMITTED, "STAFF"), true);
  assert.equal(SCRAP_TRANSITIONS.SCRAP_APPROVE_DOCUMENTS.to, S.REPORT_PREPARING); // step 7
});

test("리포트/청구: 완료(7) / 문제(7→8) / 해결(동적) / 청구(7→9) (시나리오 24)", () => {
  assert.equal(canScrapTransition("SCRAP_COMPLETE_REPORT", S.REPORT_PREPARING, "STAFF"), true);
  assert.equal(SCRAP_TRANSITIONS.SCRAP_COMPLETE_REPORT.to, S.REPORT_COMPLETED);
  assert.equal(canScrapTransition("SCRAP_BLOCK_REPORT", S.REPORT_PREPARING, "STAFF"), true);
  assert.equal(canScrapTransition("SCRAP_BLOCK_REPORT", S.REPORT_COMPLETED, "STAFF"), true);
  assert.equal(SCRAP_TRANSITIONS.SCRAP_BLOCK_REPORT.to, S.REPORT_BLOCKED); // step 8
  assert.equal(SCRAP_TRANSITIONS.SCRAP_RESUME_REPORT.to, null);
  assert.equal(canScrapTransition("SCRAP_ISSUE_BILLING", S.REPORT_COMPLETED, "STAFF"), true);
  assert.equal(SCRAP_TRANSITIONS.SCRAP_ISSUE_BILLING.to, S.PAYMENT_REQUESTED); // step 9
  // 청구는 리포트 완료 전(작성 중)에는 불가.
  assert.equal(canScrapTransition("SCRAP_ISSUE_BILLING", S.REPORT_PREPARING, "STAFF"), false);
});

test("입금: 제출(고객,9) / 확인(9→11) / 확인불가(9→10) / 재제출(10→9) (시나리오 26,27,28,29)", () => {
  assert.equal(canScrapTransition("SCRAP_SUBMIT_PAYMENT", S.PAYMENT_REQUESTED, "CUSTOMER"), true);
  assert.equal(SCRAP_TRANSITIONS.SCRAP_SUBMIT_PAYMENT.to, S.PAYMENT_SUBMITTED); // step 9 유지
  assert.equal(canScrapTransition("SCRAP_CONFIRM_PAYMENT", S.PAYMENT_SUBMITTED, "STAFF"), true);
  assert.equal(SCRAP_TRANSITIONS.SCRAP_CONFIRM_PAYMENT.to, S.PAYMENT_CONFIRMED); // step 11
  assert.equal(canScrapTransition("SCRAP_REJECT_PAYMENT", S.PAYMENT_SUBMITTED, "STAFF"), true);
  assert.equal(SCRAP_TRANSITIONS.SCRAP_REJECT_PAYMENT.to, S.PAYMENT_REJECTED); // step 10
  assert.equal(canScrapTransition("SCRAP_RESUBMIT_PAYMENT", S.PAYMENT_REJECTED, "CUSTOMER"), true);
  assert.equal(SCRAP_TRANSITIONS.SCRAP_RESUBMIT_PAYMENT.to, S.PAYMENT_SUBMITTED); // step 9 복귀
});

test("DGFT: 문서(11) / 등록(11) / 문제(11→12) / 해결(동적) / 완료(11→13) (시나리오 30,31,32,34)", () => {
  // 입금 확인 전에는 DGFT 등록을 시작할 수 없다(시나리오 30).
  assert.equal(canScrapTransition("SCRAP_START_DGFT_DOCUMENT", S.PAYMENT_SUBMITTED, "STAFF"), false);
  assert.equal(canScrapTransition("SCRAP_START_DGFT_DOCUMENT", S.PAYMENT_CONFIRMED, "STAFF"), true);
  assert.equal(SCRAP_TRANSITIONS.SCRAP_START_DGFT_DOCUMENT.to, S.DGFT_DOCUMENT_PREPARING);
  assert.equal(canScrapTransition("SCRAP_START_DGFT_REGISTRATION", S.DGFT_DOCUMENT_PREPARING, "STAFF"), true);
  assert.equal(SCRAP_TRANSITIONS.SCRAP_START_DGFT_REGISTRATION.to, S.DGFT_REGISTRATION_IN_PROGRESS);
  assert.equal(canScrapTransition("SCRAP_BLOCK_DGFT", S.DGFT_DOCUMENT_PREPARING, "STAFF"), true);
  assert.equal(canScrapTransition("SCRAP_BLOCK_DGFT", S.DGFT_REGISTRATION_IN_PROGRESS, "STAFF"), true);
  assert.equal(SCRAP_TRANSITIONS.SCRAP_BLOCK_DGFT.to, S.DGFT_REGISTRATION_BLOCKED); // step 12
  assert.equal(SCRAP_TRANSITIONS.SCRAP_RESUME_DGFT.to, null);
  assert.equal(canScrapTransition("SCRAP_COMPLETE_DGFT", S.DGFT_REGISTRATION_IN_PROGRESS, "STAFF"), true);
  assert.equal(SCRAP_TRANSITIONS.SCRAP_COMPLETE_DGFT.to, S.COMPLETED); // step 13
  // 등록 진행 전(문서 작성 중)에는 최종 완료 불가.
  assert.equal(canScrapTransition("SCRAP_COMPLETE_DGFT", S.DGFT_DOCUMENT_PREPARING, "STAFF"), false);
});

test("availableScrapActions: 상태·역할별 가능한 행동", () => {
  assert.deepEqual(
    availableScrapActions(S.ASSIGNED, "STAFF").sort(),
    ["SCRAP_CONFIRM_SCHEDULE", "SCRAP_REQUEST_SCHEDULE_REVISION"].sort(),
  );
  assert.deepEqual(availableScrapActions(S.CUSTOMER_DOCUMENTS_PENDING, "CUSTOMER"), ["SCRAP_SUBMIT_DOCUMENTS"]);
  assert.deepEqual(availableScrapActions(S.PAYMENT_REQUESTED, "CUSTOMER"), ["SCRAP_SUBMIT_PAYMENT"]);
  assert.deepEqual(availableScrapActions(S.COMPLETED, "ADMIN"), []);
  // 고객은 검사/리포트/DGFT 내부 단계에서 취할 수 있는 전이가 없다.
  assert.deepEqual(availableScrapActions(S.INSPECTION_IN_PROGRESS, "CUSTOMER"), []);
  assert.deepEqual(availableScrapActions(S.DGFT_REGISTRATION_IN_PROGRESS, "CUSTOMER"), []);
});

test("권한/상태 격리: 허용되지 않은 전이는 모두 false (시나리오 7)", () => {
  assert.equal(canScrapTransition("SCRAP_CONFIRM_SCHEDULE", S.ASSIGNED, "CUSTOMER"), false);
  assert.equal(canScrapTransition("SCRAP_COMPLETE_DGFT", S.REQUESTED, "ADMIN"), false);
  assert.equal(canScrapTransition("SCRAP_START_INSPECTION", S.ASSIGNED, "STAFF"), false);
  assert.equal(canScrapTransition("SCRAP_APPROVE_DOCUMENTS", S.CUSTOMER_DOCUMENTS_PENDING, "STAFF"), false);
});
