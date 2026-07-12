// 제품검사 워크플로 상태 전이 규칙 단위 테스트 (DB 불필요, 순수 함수).
// 실행: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canPiTransition,
  availablePiActions,
  PI_TRANSITIONS,
} from "@/src/lib/productInspectionWorkflow";
import { PI_STATUS, PI_STATUS_STEP } from "@/src/lib/productInspectionTypes";

const S = PI_STATUS;

test("step + status: 각 상태의 step 번호(3 은 SCHEDULED/IN_PROGRESS 공유)", () => {
  assert.equal(PI_STATUS_STEP.PRODUCT_INSPECTION_REQUESTED, 0);
  assert.equal(PI_STATUS_STEP.PRODUCT_INSPECTION_ASSIGNED, 1);
  assert.equal(PI_STATUS_STEP.PRODUCT_INSPECTION_REQUEST_REJECTED, 2);
  assert.equal(PI_STATUS_STEP.PRODUCT_INSPECTION_SCHEDULED, 3);
  assert.equal(PI_STATUS_STEP.PRODUCT_INSPECTION_IN_PROGRESS, 3);
  assert.equal(PI_STATUS_STEP.PRODUCT_INSPECTION_BLOCKED, 4);
  assert.equal(PI_STATUS_STEP.PRODUCT_INSPECTION_COMPLETED, 5);
  assert.equal(PI_STATUS_STEP.PRODUCT_INSPECTION_REPORT_BLOCKED, 6);
  assert.equal(PI_STATUS_STEP.PRODUCT_INSPECTION_REPORT_SUBMITTED, 7);
  assert.equal(PI_STATUS_STEP.PRODUCT_INSPECTION_PAYMENT_BLOCKED, 8);
  assert.equal(PI_STATUS_STEP.PRODUCT_INSPECTION_FINISHED, 9);
});

test("담당자 지정: REQUESTED 에서 ADMIN 만 (시나리오 5)", () => {
  assert.equal(canPiTransition("PI_ASSIGN_STAFF", S.REQUESTED, "ADMIN"), true);
  assert.equal(canPiTransition("PI_ASSIGN_STAFF", S.REQUESTED, "STAFF"), false);
  assert.equal(canPiTransition("PI_ASSIGN_STAFF", S.REQUESTED, "CUSTOMER"), false);
  assert.equal(PI_TRANSITIONS.PI_ASSIGN_STAFF.to, S.ASSIGNED);
});

test("보완 요청/재제출: 요청은 담당자, 재제출은 고객 (시나리오 8,9)", () => {
  assert.equal(canPiTransition("PI_REJECT_REQUEST", S.ASSIGNED, "STAFF"), true);
  assert.equal(canPiTransition("PI_REJECT_REQUEST", S.ASSIGNED, "CUSTOMER"), false);
  assert.equal(PI_TRANSITIONS.PI_REJECT_REQUEST.to, S.REQUEST_REJECTED); // step 2
  assert.equal(canPiTransition("PI_RESUBMIT_REQUEST", S.REQUEST_REJECTED, "CUSTOMER"), true);
  assert.equal(canPiTransition("PI_RESUBMIT_REQUEST", S.REQUEST_REJECTED, "STAFF"), false);
  assert.equal(PI_TRANSITIONS.PI_RESUBMIT_REQUEST.to, S.ASSIGNED); // step 1 로 복귀
});

test("검사 일정 확정: ASSIGNED → SCHEDULED (담당자) (시나리오 10)", () => {
  assert.equal(canPiTransition("PI_CONFIRM_SCHEDULE", S.ASSIGNED, "STAFF"), true);
  assert.equal(PI_TRANSITIONS.PI_CONFIRM_SCHEDULE.to, S.SCHEDULED); // step 3
  // 일정 변경은 상태 유지.
  assert.equal(canPiTransition("PI_UPDATE_SCHEDULE", S.SCHEDULED, "STAFF"), true);
  assert.equal(PI_TRANSITIONS.PI_UPDATE_SCHEDULE.to, S.SCHEDULED);
});

test("검사 진행: 시작(3) / 진행불가(4) / 재개(동적) (시나리오 14,15)", () => {
  assert.equal(canPiTransition("PI_START_INSPECTION", S.SCHEDULED, "STAFF"), true);
  assert.equal(PI_TRANSITIONS.PI_START_INSPECTION.to, S.IN_PROGRESS);
  // 진행 불가는 SCHEDULED / IN_PROGRESS 모두에서 가능.
  assert.equal(canPiTransition("PI_BLOCK_INSPECTION", S.SCHEDULED, "STAFF"), true);
  assert.equal(canPiTransition("PI_BLOCK_INSPECTION", S.IN_PROGRESS, "STAFF"), true);
  assert.equal(PI_TRANSITIONS.PI_BLOCK_INSPECTION.to, S.BLOCKED); // step 4
  // 재개는 목적지가 동적(resume_status)이므로 to=null.
  assert.equal(canPiTransition("PI_RESUME_INSPECTION", S.BLOCKED, "STAFF"), true);
  assert.equal(PI_TRANSITIONS.PI_RESUME_INSPECTION.to, null);
});

test("검사 완료: SCHEDULED/IN_PROGRESS → COMPLETED (시나리오 17)", () => {
  assert.equal(canPiTransition("PI_COMPLETE_INSPECTION", S.IN_PROGRESS, "STAFF"), true);
  assert.equal(canPiTransition("PI_COMPLETE_INSPECTION", S.SCHEDULED, "STAFF"), true); // 시작 미사용 케이스
  assert.equal(PI_TRANSITIONS.PI_COMPLETE_INSPECTION.to, S.COMPLETED); // step 5
  assert.equal(canPiTransition("PI_COMPLETE_INSPECTION", S.IN_PROGRESS, "CUSTOMER"), false);
});

test("리포트: 제출(5→7) / 문제(5·7→6) / 해결(동적) (시나리오 20)", () => {
  assert.equal(canPiTransition("PI_SUBMIT_REPORT", S.COMPLETED, "STAFF"), true);
  assert.equal(PI_TRANSITIONS.PI_SUBMIT_REPORT.to, S.REPORT_SUBMITTED); // step 7
  // 리포트 문제는 COMPLETED(5) 와 REPORT_SUBMITTED(7) 모두에서 가능.
  assert.equal(canPiTransition("PI_BLOCK_REPORT", S.COMPLETED, "STAFF"), true);
  assert.equal(canPiTransition("PI_BLOCK_REPORT", S.REPORT_SUBMITTED, "STAFF"), true);
  assert.equal(PI_TRANSITIONS.PI_BLOCK_REPORT.to, S.REPORT_BLOCKED); // step 6
  assert.equal(canPiTransition("PI_RESUME_REPORT", S.REPORT_BLOCKED, "STAFF"), true);
  assert.equal(PI_TRANSITIONS.PI_RESUME_REPORT.to, null);
});

test("외부 입금: 기록(7 유지) / 문제(7→8) / 해결(8→7) (시나리오 25)", () => {
  assert.equal(canPiTransition("PI_RECORD_PAYMENT", S.REPORT_SUBMITTED, "STAFF"), true);
  assert.equal(PI_TRANSITIONS.PI_RECORD_PAYMENT.to, S.REPORT_SUBMITTED); // 상태 유지
  assert.equal(canPiTransition("PI_BLOCK_PAYMENT", S.REPORT_SUBMITTED, "STAFF"), true);
  assert.equal(PI_TRANSITIONS.PI_BLOCK_PAYMENT.to, S.PAYMENT_BLOCKED); // step 8
  assert.equal(canPiTransition("PI_RESUME_PAYMENT", S.PAYMENT_BLOCKED, "STAFF"), true);
  assert.equal(PI_TRANSITIONS.PI_RESUME_PAYMENT.to, S.REPORT_SUBMITTED);
});

test("최종 완료: REPORT_SUBMITTED → FINISHED (담당자) (시나리오 26)", () => {
  assert.equal(canPiTransition("PI_COMPLETE", S.REPORT_SUBMITTED, "STAFF"), true);
  assert.equal(canPiTransition("PI_COMPLETE", S.REPORT_SUBMITTED, "CUSTOMER"), false);
  assert.equal(PI_TRANSITIONS.PI_COMPLETE.to, S.FINISHED); // step 9
  // 아직 리포트를 제출하지 않은 단계(COMPLETED)에서는 완료 불가.
  assert.equal(canPiTransition("PI_COMPLETE", S.COMPLETED, "STAFF"), false);
});

test("availablePiActions: 상태·역할별 가능한 행동", () => {
  assert.deepEqual(availablePiActions(S.ASSIGNED, "STAFF").sort(), ["PI_CONFIRM_SCHEDULE", "PI_REJECT_REQUEST"].sort());
  assert.deepEqual(availablePiActions(S.REQUEST_REJECTED, "CUSTOMER"), ["PI_RESUBMIT_REQUEST"]);
  assert.deepEqual(availablePiActions(S.FINISHED, "ADMIN"), []);
  // 고객은 검사 진행/외부기관 단계에서 취할 수 있는 전이가 없다.
  assert.deepEqual(availablePiActions(S.IN_PROGRESS, "CUSTOMER"), []);
  assert.deepEqual(availablePiActions(S.REPORT_SUBMITTED, "CUSTOMER"), []);
});

test("허용되지 않은 전이는 모두 false (시나리오 7,28 권한 격리)", () => {
  assert.equal(canPiTransition("PI_COMPLETE", S.REQUESTED, "ADMIN"), false);
  assert.equal(canPiTransition("PI_CONFIRM_SCHEDULE", S.COMPLETED, "STAFF"), false);
  assert.equal(canPiTransition("PI_START_INSPECTION", S.ASSIGNED, "STAFF"), false);
});
