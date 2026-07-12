// 견적 서버 재계산 단위 테스트 (시나리오 8: 합계가 서버에서 정확히 계산됨).
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeQuotation } from "@/src/lib/quotationMath";

test("공급가액 = 수량 × 단가, 총액/선금/잔금 계산", () => {
  const r = computeQuotation([
    { item_name: "패스포트", quantity: 2, unit_price: 100000 },
    { item_name: "강도계산서", quantity: 1, unit_price: 300000 },
  ]);
  assert.equal(r.items[0].amount, "200000.00");
  assert.equal(r.items[1].amount, "300000.00");
  assert.equal(r.totalAmount, "500000.00");
  assert.equal(r.depositAmount, "250000.00");
  assert.equal(r.balanceAmount, "250000.00");
});

test("선금 + 잔금 = 총액 (홀수 반올림에도 보존)", () => {
  const r = computeQuotation([{ item_name: "인증서", quantity: 1, unit_price: 12345.67 }]);
  const total = Number(r.totalAmount);
  const deposit = Number(r.depositAmount);
  const balance = Number(r.balanceAmount);
  assert.equal(r.totalAmount, "12345.67");
  // 반올림 오차가 있어도 선금+잔금은 정확히 총액과 일치
  assert.equal(Math.round((deposit + balance) * 100), Math.round(total * 100));
});

test("소수 수량/단가도 2자리로 정확히 계산", () => {
  const r = computeQuotation([{ item_name: "기타", quantity: 3, unit_price: 33.33 }]);
  assert.equal(r.items[0].amount, "99.99");
  assert.equal(r.totalAmount, "99.99");
});

test("빈 가격표는 0 원", () => {
  const r = computeQuotation([]);
  assert.equal(r.totalAmount, "0.00");
  assert.equal(r.depositAmount, "0.00");
  assert.equal(r.balanceAmount, "0.00");
});
