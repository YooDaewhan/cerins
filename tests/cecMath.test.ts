// CEC India 금액 계산 단위 테스트 (DB 불필요, 순수 함수).
// 실행: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  inspectionDays,
  computeCecEstimate,
  computeCecFinal,
  computeSurcharge,
} from "@/src/lib/cecMath";
import { formatCecNumber, CEC_SEQ_START } from "@/src/lib/requestNumberService";

// 고정 가격(환경변수와 무관하게 재현 가능하도록 명세 기본값을 주입).
const PRICING = { baseFee: 1800, inspectionDailyFee: 250, deposit: 900, surchargeRate: 0.005, currency: "USD" };

test("검사일수: 시작일과 종료일이 같으면 1일 (시나리오 7)", () => {
  assert.equal(inspectionDays("2026-07-11", "2026-07-11"), 1);
});

test("검사일수: 종료 - 시작 + 1", () => {
  assert.equal(inspectionDays("2026-07-01", "2026-07-05"), 5);
  assert.equal(inspectionDays("2026-07-01", "2026-07-02"), 2);
});

test("검사일수: 잘못된 입력/역순은 null", () => {
  assert.equal(inspectionDays("2026-07-05", "2026-07-01"), null);
  assert.equal(inspectionDays("bad", "2026-07-01"), null);
});

test("예상 견적: 선금은 항상 900 USD, 총액 = 기본 + 검사비 (시나리오 8)", () => {
  const e = computeCecEstimate(3, PRICING);
  assert.equal(e.inspectionFee, "750.00"); // 3 × 250
  assert.equal(e.baseFee, "1800.00");
  assert.equal(e.totalAmount, "2550.00"); // 1800 + 750
  assert.equal(e.deposit, "900.00");
  // 검사일수 0 이어도 선금은 900.
  assert.equal(computeCecEstimate(0, PRICING).deposit, "900.00");
});

test("추가 수수료: 평가금액 × 0.5%, 미적용 시 0 (시나리오 11)", () => {
  assert.equal(computeSurcharge(100000, true, PRICING), "500.00"); // 100000 × 0.005
  assert.equal(computeSurcharge(100000, false, PRICING), "0.00");
  assert.equal(computeSurcharge(12345.67, true, PRICING), "61.73"); // 61.72835 → 반올림
});

test("최종 금액: 총액 = 기본 + 실제검사비 + 추가수수료, 잔금 = 총액 - 900", () => {
  // 검사 4일, 평가 200,000 물건가액, 추가 수수료 적용.
  const f = computeCecFinal({ actualDays: 4, surchargeApplied: true, valuationAmount: 200000 }, PRICING);
  assert.equal(f.inspectionFee, "1000.00"); // 4 × 250
  assert.equal(f.surchargeAmount, "1000.00"); // 200000 × 0.005
  assert.equal(f.totalAmount, "3800.00"); // 1800 + 1000 + 1000
  assert.equal(f.deposit, "900.00");
  assert.equal(f.balanceAmount, "2900.00"); // 3800 - 900
});

test("최종 금액: 추가 수수료 미적용 시 항목에서 제외", () => {
  const f = computeCecFinal({ actualDays: 2, surchargeApplied: false, valuationAmount: 999999 }, PRICING);
  assert.equal(f.surchargeAmount, "0.00");
  assert.equal(f.totalAmount, "2300.00"); // 1800 + 500 + 0
  assert.equal(f.balanceAmount, "1400.00");
  // quotation_items: 기본/검사 2개만(수수료 미적용).
  assert.deepEqual(f.items.map((i) => i.item_type), ["CEC_BASE_FEE", "CEC_INSPECTION_FEE"]);
});

test("최종 금액: 추가 수수료 적용 시 항목 3개", () => {
  const f = computeCecFinal({ actualDays: 1, surchargeApplied: true, valuationAmount: 50000 }, PRICING);
  assert.deepEqual(f.items.map((i) => i.item_type), ["CEC_BASE_FEE", "CEC_INSPECTION_FEE", "CEC_VALUE_SURCHARGE"]);
});

test("CEC 접수번호: 매년 1000 부터, cert-YY-NNNN 형식 (시나리오 3)", () => {
  assert.equal(CEC_SEQ_START, 1000);
  assert.equal(formatCecNumber(26, 1000), "cert-26-1000");
  assert.equal(formatCecNumber(26, 1001), "cert-26-1001");
  assert.equal(formatCecNumber(7, 1000), "cert-07-1000");
});
