// CEC India 금액 계산(순수 함수). 프론트에서 자동 계산하더라도 서버에서 반드시 재계산한다.
// 부동소수점 오차를 피하려고 "센트(1/100) 정수" 단위로 계산한 뒤 소수 2자리 문자열로 되돌린다.
// (quotations/quotation_items 는 DECIMAL(15,2) 에 저장한다.)
//
// 계산식(명세 §5):
//   예정 검사일수  = 검사 종료일 - 검사 시작일 + 1  (같은 날이면 1일)
//   예상 검사비    = 예정 검사일수 × 1일당 검사비
//   예상 기본 총액 = 기본 인증비 + 예상 검사비
//   선금           = 900 USD (고정)
//   실제 검사비    = 실제 검사일수 × 1일당 검사비
//   추가 수수료    = 평가금액 × 0.005   (적용 여부 true 인 경우에만)
//   최종 총액      = 기본 인증비 + 실제 검사비 + 추가 수수료
//   잔금           = 최종 총액 - 선금

import { getCecPricing, type CecPricing } from "@/src/lib/requestSettings";
import { CEC_QUOTATION_ITEM_TYPES } from "@/src/lib/cecTypes";

function toCents(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}
export function centsToStr(cents: number): string {
  const neg = cents < 0;
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const rem = abs % 100;
  return `${neg ? "-" : ""}${whole}.${rem.toString().padStart(2, "0")}`;
}

// YYYY-MM-DD 두 날짜 사이의 검사일수 = (종료 - 시작) + 1. 같은 날이면 1.
// 잘못된 입력(파싱 실패, 종료<시작)은 null 을 반환한다.
export function inspectionDays(startDate: string, endDate: string): number | null {
  const s = parseDay(startDate);
  const e = parseDay(endDate);
  if (s == null || e == null) return null;
  const diff = Math.round((e - s) / 86400000);
  if (diff < 0) return null;
  return diff + 1;
}

function parseDay(s: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec((s ?? "").trim());
  if (!m) return null;
  // UTC 자정 기준(시간대 영향 제거).
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export interface CecQuotationItem {
  item_type: string;
  item_name: string;
  quantity: string; // 검사일수 등
  unit_price: string;
  amount: string;
}

export interface CecEstimate {
  currency: string;
  inspectionDays: number;
  inspectionFee: string; // 예상 검사비
  baseFee: string;
  totalAmount: string; // 예상 기본 총액 (추가 수수료 미포함)
  deposit: string; // 900 고정
}

// 최초 접수 단계의 예상 견적(물건가액 추가 수수료 미확정).
export function computeCecEstimate(days: number, pricing: CecPricing = getCecPricing()): CecEstimate {
  const d = Math.max(0, Math.floor(days));
  const baseCents = toCents(pricing.baseFee);
  const inspectionCents = toCents(pricing.inspectionDailyFee) * d;
  const totalCents = baseCents + inspectionCents;
  return {
    currency: pricing.currency,
    inspectionDays: d,
    inspectionFee: centsToStr(inspectionCents),
    baseFee: centsToStr(baseCents),
    totalAmount: centsToStr(totalCents),
    deposit: centsToStr(toCents(pricing.deposit)),
  };
}

export interface CecFinalInput {
  actualDays: number;
  surchargeApplied: boolean;
  valuationAmount: number; // 평가 물건가액
}

export interface CecFinal {
  currency: string;
  actualDays: number;
  inspectionFee: string; // 실제 검사비
  baseFee: string;
  surchargeApplied: boolean;
  surchargeRate: number;
  surchargeAmount: string; // 추가 수수료 (미적용 시 "0.00")
  totalAmount: string; // 최종 총액
  deposit: string; // 900 고정
  balanceAmount: string; // 잔금 = 총액 - 선금
  items: CecQuotationItem[]; // quotation_items 로 저장할 항목
}

// 검사 완료 후 최종 금액. 추가 수수료는 적용 여부 true 인 경우에만 포함한다.
export function computeCecFinal(input: CecFinalInput, pricing: CecPricing = getCecPricing()): CecFinal {
  const d = Math.max(0, Math.floor(input.actualDays));
  const baseCents = toCents(pricing.baseFee);
  const inspectionCents = toCents(pricing.inspectionDailyFee) * d;

  // 추가 수수료 = 평가금액 × rate. 센트 단위로 계산 후 반올림.
  const surchargeCents = input.surchargeApplied
    ? Math.round(toCents(input.valuationAmount) * pricing.surchargeRate)
    : 0;

  const totalCents = baseCents + inspectionCents + surchargeCents;
  const depositCents = toCents(pricing.deposit);
  const balanceCents = totalCents - depositCents;

  const items: CecQuotationItem[] = [
    {
      item_type: CEC_QUOTATION_ITEM_TYPES.BASE_FEE,
      item_name: "기본 인증비",
      quantity: "1",
      unit_price: centsToStr(baseCents),
      amount: centsToStr(baseCents),
    },
    {
      item_type: CEC_QUOTATION_ITEM_TYPES.INSPECTION_FEE,
      item_name: `검사비 (${d}일)`,
      quantity: String(d),
      unit_price: centsToStr(toCents(pricing.inspectionDailyFee)),
      amount: centsToStr(inspectionCents),
    },
  ];
  if (input.surchargeApplied) {
    items.push({
      item_type: CEC_QUOTATION_ITEM_TYPES.VALUE_SURCHARGE,
      item_name: `물건가액 추가 수수료 (${(pricing.surchargeRate * 100).toFixed(2)}%)`,
      quantity: "1",
      unit_price: centsToStr(surchargeCents),
      amount: centsToStr(surchargeCents),
    });
  }

  return {
    currency: pricing.currency,
    actualDays: d,
    inspectionFee: centsToStr(inspectionCents),
    baseFee: centsToStr(baseCents),
    surchargeApplied: input.surchargeApplied,
    surchargeRate: pricing.surchargeRate,
    surchargeAmount: centsToStr(surchargeCents),
    totalAmount: centsToStr(totalCents),
    deposit: centsToStr(depositCents),
    balanceAmount: centsToStr(balanceCents),
    items,
  };
}

// 추가 수수료만 계산(가격평가 입력 검증/저장용).
export function computeSurcharge(
  valuationAmount: number,
  applied: boolean,
  pricing: CecPricing = getCecPricing(),
): string {
  if (!applied) return centsToStr(0);
  return centsToStr(Math.round(toCents(valuationAmount) * pricing.surchargeRate));
}
