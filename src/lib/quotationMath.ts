// 견적 금액 계산(순수 함수). 클라이언트가 보낸 합계를 신뢰하지 않고 서버에서 재계산한다.
// 부동소수점 오차를 피하려고 "센트(1/100) 정수" 단위로 계산한 뒤 문자열 금액으로 되돌린다.
// DB 에는 DECIMAL(15,2) 로 저장하므로 소수점 2자리 문자열을 사용한다.

import { DEPOSIT_RATE } from "@/src/lib/requestSettings";

export interface QuotationItemInput {
  item_type?: string | null;
  item_name: string;
  quantity: number;
  unit_price: number;
  memo?: string | null;
}

export interface ComputedItem extends QuotationItemInput {
  amount: string; // 공급가액 = 수량 × 단가
}

export interface ComputedQuotation {
  items: ComputedItem[];
  totalAmount: string;
  depositAmount: string;
  balanceAmount: string;
}

// 숫자를 센트 정수로. 소수 2자리 반올림.
function toCents(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}
function centsToStr(cents: number): string {
  const neg = cents < 0;
  const abs = Math.abs(cents);
  const won = Math.floor(abs / 100);
  const rem = abs % 100;
  return `${neg ? "-" : ""}${won}.${rem.toString().padStart(2, "0")}`;
}

// 가격표를 받아 각 행 공급가액, 총금액, 선금(50%), 잔금(나머지)을 계산.
// 잔금 = 총액 - 선금 으로 계산하여 반올림 오차가 나도 선금+잔금 = 총액 을 보장한다.
export function computeQuotation(items: QuotationItemInput[]): ComputedQuotation {
  const computed: ComputedItem[] = items.map((it) => {
    const amountCents = toCents(it.quantity) * toCents(it.unit_price);
    // (센트×센트) = 1/10000 단위 → 다시 센트로 반올림
    const amount = Math.round(amountCents / 100);
    return { ...it, amount: centsToStr(amount) };
  });

  const totalCents = computed.reduce((sum, it) => {
    return sum + Math.round(toCents(it.quantity) * toCents(it.unit_price) / 100);
  }, 0);
  const depositCents = Math.round(totalCents * DEPOSIT_RATE);
  const balanceCents = totalCents - depositCents;

  return {
    items: computed,
    totalAmount: centsToStr(totalCents),
    depositAmount: centsToStr(depositCents),
    balanceAmount: centsToStr(balanceCents),
  };
}
