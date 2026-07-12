// 워크플로 상태 전이 규칙 단위 테스트 (DB 불필요, 순수 함수).
// 실행: npm test   (node --import tsx --test)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canTransition,
  availableActions,
  TRANSITIONS,
} from "@/src/lib/serviceWorkflow";
import { STATUS, STATUS_STEP } from "@/src/lib/serviceRequestTypes";

test("담당자 지정: REQUESTED 에서 ADMIN 만 가능", () => {
  assert.equal(canTransition("ASSIGN_STAFF", STATUS.REQUESTED, "ADMIN"), true);
  assert.equal(canTransition("ASSIGN_STAFF", STATUS.REQUESTED, "STAFF"), false);
  assert.equal(canTransition("ASSIGN_STAFF", STATUS.REQUESTED, "CUSTOMER"), false);
  // 잘못된 시작 상태
  assert.equal(canTransition("ASSIGN_STAFF", STATUS.QUOTATION, "ADMIN"), false);
});

test("접수/반려: ASSIGNED 에서 STAFF/ADMIN 만, CUSTOMER 불가 (시나리오 5)", () => {
  assert.equal(canTransition("ACCEPT_REQUEST", STATUS.ASSIGNED, "STAFF"), true);
  assert.equal(canTransition("ACCEPT_REQUEST", STATUS.ASSIGNED, "ADMIN"), true);
  assert.equal(canTransition("ACCEPT_REQUEST", STATUS.ASSIGNED, "CUSTOMER"), false);
  assert.equal(canTransition("REJECT_REQUEST", STATUS.ASSIGNED, "STAFF"), true);
  assert.equal(canTransition("REJECT_REQUEST", STATUS.ASSIGNED, "CUSTOMER"), false);
});

test("재제출: REQUEST_REJECTED → ASSIGNED, CUSTOMER 만 (시나리오 7)", () => {
  assert.equal(canTransition("RESUBMIT_REQUEST", STATUS.REQUEST_REJECTED, "CUSTOMER"), true);
  assert.equal(canTransition("RESUBMIT_REQUEST", STATUS.REQUEST_REJECTED, "STAFF"), false);
  assert.equal(TRANSITIONS.RESUBMIT_REQUEST.to, STATUS.ASSIGNED);
});

test("견적 완료: QUOTATION → DEPOSIT_REQUESTED (시나리오 9)", () => {
  assert.equal(canTransition("COMPLETE_QUOTATION", STATUS.QUOTATION, "STAFF"), true);
  assert.equal(TRANSITIONS.COMPLETE_QUOTATION.to, STATUS.DEPOSIT_REQUESTED);
});

test("선금: 제출(고객)→확인/확인불가(담당자) (시나리오 10~12)", () => {
  assert.equal(canTransition("SUBMIT_DEPOSIT", STATUS.DEPOSIT_REQUESTED, "CUSTOMER"), true);
  assert.equal(canTransition("SUBMIT_DEPOSIT", STATUS.DEPOSIT_REQUESTED, "STAFF"), false);
  assert.equal(canTransition("CONFIRM_DEPOSIT", STATUS.DEPOSIT_SUBMITTED, "STAFF"), true);
  assert.equal(TRANSITIONS.CONFIRM_DEPOSIT.to, STATUS.CERTIFICATION_IN_PROGRESS);
  assert.equal(canTransition("REJECT_DEPOSIT", STATUS.DEPOSIT_SUBMITTED, "ADMIN"), true);
  assert.equal(TRANSITIONS.REJECT_DEPOSIT.to, STATUS.DEPOSIT_REJECTED);
  // 확인불가 후 재제출: 6 → 5
  assert.equal(canTransition("RESUME_AFTER_DEPOSIT_REJECTION", STATUS.DEPOSIT_REJECTED, "CUSTOMER"), true);
});

test("인증: 진행→완료/보완, 보완→진행 (시나리오 13~14)", () => {
  assert.equal(canTransition("BLOCK_CERTIFICATION", STATUS.CERTIFICATION_IN_PROGRESS, "STAFF"), true);
  assert.equal(TRANSITIONS.BLOCK_CERTIFICATION.to, STATUS.CERTIFICATION_BLOCKED);
  assert.equal(canTransition("RESUME_CERTIFICATION", STATUS.CERTIFICATION_BLOCKED, "STAFF"), true);
  assert.equal(canTransition("COMPLETE_CERTIFICATION", STATUS.CERTIFICATION_IN_PROGRESS, "STAFF"), true);
  assert.equal(TRANSITIONS.COMPLETE_CERTIFICATION.to, STATUS.BALANCE_REQUESTED);
});

test("잔금 제출: BALANCE_REQUESTED → BALANCE_SUBMITTED, 고객만 (시나리오 15)", () => {
  assert.equal(canTransition("SUBMIT_BALANCE", STATUS.BALANCE_REQUESTED, "CUSTOMER"), true);
  assert.equal(canTransition("SUBMIT_BALANCE", STATUS.BALANCE_REQUESTED, "STAFF"), false);
  assert.equal(TRANSITIONS.SUBMIT_BALANCE.to, STATUS.BALANCE_SUBMITTED);
});

test("잔금 확인: BALANCE_SUBMITTED → FINAL_DOCUMENT_PENDING, 담당자만 (시나리오 16)", () => {
  assert.equal(canTransition("CONFIRM_BALANCE", STATUS.BALANCE_SUBMITTED, "STAFF"), true);
  assert.equal(canTransition("CONFIRM_BALANCE", STATUS.BALANCE_SUBMITTED, "ADMIN"), true);
  assert.equal(canTransition("CONFIRM_BALANCE", STATUS.BALANCE_SUBMITTED, "CUSTOMER"), false);
  assert.equal(TRANSITIONS.CONFIRM_BALANCE.to, STATUS.FINAL_DOCUMENT_PENDING);
});

test("최종: FINAL_DOCUMENT_PENDING → COMPLETED, step 11 유지 (시나리오 17)", () => {
  assert.equal(canTransition("COMPLETE_FINAL_DOCUMENT", STATUS.FINAL_DOCUMENT_PENDING, "STAFF"), true);
  assert.equal(TRANSITIONS.COMPLETE_FINAL_DOCUMENT.to, STATUS.COMPLETED);
  // 두 상태 모두 step 11, step 10 은 잔금 확인 중(BALANCE_SUBMITTED)
  assert.equal(STATUS_STEP.FINAL_DOCUMENT_PENDING, 11);
  assert.equal(STATUS_STEP.COMPLETED, 11);
  assert.equal(STATUS_STEP.BALANCE_SUBMITTED, 10);
});

test("availableActions: 각 상태에서 역할별 가능한 행동", () => {
  assert.deepEqual(availableActions(STATUS.ASSIGNED, "STAFF").sort(), ["ACCEPT_REQUEST", "REJECT_REQUEST"].sort());
  assert.deepEqual(availableActions(STATUS.DEPOSIT_REQUESTED, "CUSTOMER"), ["SUBMIT_DEPOSIT"]);
  // 완료 상태에서는 더 이상 전이 없음
  assert.deepEqual(availableActions(STATUS.COMPLETED, "ADMIN"), []);
});

test("허용되지 않은 전이는 모두 false", () => {
  // 임의의 잘못된 조합
  assert.equal(canTransition("COMPLETE_FINAL_DOCUMENT", STATUS.REQUESTED, "ADMIN"), false);
  assert.equal(canTransition("SUBMIT_DEPOSIT", STATUS.COMPLETED, "CUSTOMER"), false);
  assert.equal(canTransition("CONFIRM_DEPOSIT", STATUS.QUOTATION, "STAFF"), false);
});
