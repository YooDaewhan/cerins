"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { buildLocalizedPath } from "@/src/lib/i18n";
import type { LocaleCode, SearchMode, SearchOp, SearchScope } from "@/src/lib/types";

interface Row {
  op: SearchOp; // 앞 조건과의 결합 (첫 행은 무시)
  scope: SearchScope;
  text: string;
  mode: SearchMode;
}

const OP_OPTIONS: [SearchOp, string][] = [
  ["and", "AND"],
  ["or", "OR"],
  ["not", "NOT"],
];
const SCOPE_OPTIONS: [SearchScope, string][] = [
  ["all", "전체"],
  ["certification", "인증"],
  ["inspection", "검사"],
];
const MODE_OPTIONS: [SearchMode, string][] = [
  ["near", "유사"],
  ["exact", "정확히 일치"],
  ["begin", "~로 시작"],
];

const newRow = (op: SearchOp = "and"): Row => ({ op, scope: "all", text: "", mode: "near" });

const SELECT_CLS =
  "shrink-0 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-(--brand) focus:outline-none";

export default function AdvancedSearchModal({
  locale,
  open,
  onClose,
}: {
  locale: LocaleCode;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([newRow()]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function setRow(i: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }
  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, j) => j !== i));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const conditions = rows
      .map((r) => ({ op: r.op, scope: r.scope, mode: r.mode, text: r.text.trim() }))
      .filter((r) => r.text);
    if (conditions.length === 0) return;
    const sp = new URLSearchParams({ terms: JSON.stringify(conditions) });
    router.push(buildLocalizedPath(locale, `/search?${sp.toString()}`));
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 p-4 pt-20"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="상세검색"
    >
      <div
        className="w-full max-w-3xl rounded-lg bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-xl font-bold text-gray-800">상세검색</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="text-gray-400 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-5">
          <div className="rounded-lg bg-gray-100 p-4 space-y-3">
            {/* 조건 행: [연산자][범위][검색어][매칭모드][삭제] */}
            {rows.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                {i === 0 ? (
                  <span className="w-20 shrink-0 text-center text-sm font-bold text-gray-600">
                    조건
                  </span>
                ) : (
                  <select
                    value={row.op}
                    onChange={(e) => setRow(i, { op: e.target.value as SearchOp })}
                    aria-label="연산자"
                    className={`${SELECT_CLS} w-20 font-semibold`}
                  >
                    {OP_OPTIONS.map(([v, label]) => (
                      <option key={v} value={v}>
                        {label}
                      </option>
                    ))}
                  </select>
                )}
                <select
                  value={row.scope}
                  onChange={(e) => setRow(i, { scope: e.target.value as SearchScope })}
                  aria-label="검색 범위"
                  className={SELECT_CLS}
                >
                  {SCOPE_OPTIONS.map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
                <input
                  type="search"
                  autoFocus={i === 0}
                  value={row.text}
                  onChange={(e) => setRow(i, { text: e.target.value })}
                  placeholder="검색어"
                  className="flex-1 min-w-0 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-(--brand) focus:outline-none"
                />
                <select
                  value={row.mode}
                  onChange={(e) => setRow(i, { mode: e.target.value as SearchMode })}
                  aria-label="매칭 방식"
                  className={SELECT_CLS}
                >
                  {MODE_OPTIONS.map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  disabled={rows.length === 1}
                  aria-label="조건 삭제"
                  className="shrink-0 w-6 text-gray-400 hover:text-red-600 disabled:opacity-0 text-xl leading-none"
                >
                  ×
                </button>
              </div>
            ))}

            {/* 조건 추가: 선택하면 아래에 행이 하나 더 생김 */}
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  setRows((prev) => [...prev, newRow(e.target.value as SearchOp)]);
                }
                e.currentTarget.value = "";
              }}
              className="rounded-md border border-dashed border-gray-400 bg-white px-3 py-2 text-sm text-gray-600"
            >
              <option value="">+ 조건 추가…</option>
              {OP_OPTIONS.map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-(--brand) px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
              </svg>
              검색
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
