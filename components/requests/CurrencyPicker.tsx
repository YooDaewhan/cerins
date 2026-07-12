"use client";

import { BILLING_CURRENCIES } from "@/src/lib/billingCurrencies";

// 프리셋 통화(직접입력 제외).
const PRESETS = BILLING_CURRENCIES.filter((c) => c !== "OTHER");

// 청구/입금/평가 금액의 통화 선택 위젯.
// - value: 실제 통화 문자열(예: "KRW", "EUR"). 프리셋에 없으면 자동으로 "직접입력" 모드로 표시.
// - onChange: 선택/입력된 통화 문자열을 그대로 전달.
// 스타일은 각 폼의 기존 클래스를 그대로 넘겨받아 일관성을 유지한다.
export default function CurrencyPicker({
  value,
  onChange,
  selectClassName,
  inputClassName,
}: {
  value: string;
  onChange: (v: string) => void;
  selectClassName: string;
  inputClassName: string;
}) {
  const isPreset = (PRESETS as readonly string[]).includes(value);
  return (
    <div className="space-y-1">
      <select
        className={selectClassName}
        value={isPreset ? value : "OTHER"}
        onChange={(e) => onChange(e.target.value)}
      >
        {BILLING_CURRENCIES.map((c) => (
          <option key={c} value={c}>
            {c === "OTHER" ? "직접입력" : c}
          </option>
        ))}
      </select>
      {!isPreset && (
        <input
          className={inputClassName}
          placeholder="통화 코드 (예: EUR, JPY)"
          maxLength={8}
          value={value === "OTHER" ? "" : value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
        />
      )}
    </div>
  );
}
