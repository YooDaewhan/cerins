"use client";

import { useCallback, useEffect, useState } from "react";
import {
  SATISFACTION_ITEMS,
  STAFF_EVAL_ITEMS,
  RATING_MAX,
  type RatingItem,
} from "@/src/lib/reviewTypes";

type Kind = "inquiry" | "satisfaction" | "staff";

interface Row {
  id: number;
  created_at: string;
  // inquiry
  category?: string | null;
  name?: string;
  company?: string | null;
  department?: string | null;
  country?: string | null;
  email?: string | null;
  website?: string | null;
  phone?: string | null;
  subject?: string | null;
  message?: string | null;
  // review
  user_id?: number | null;
  login_id?: string | null;
  ratings?: unknown;
  comment?: string | null;
}

interface Props {
  kind: Kind;
  endpoint: string;
}

function parseRatings(raw: unknown): Record<string, number> {
  if (raw && typeof raw === "object") return raw as Record<string, number>;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, number>;
    } catch {
      return {};
    }
  }
  return {};
}

export default function FeedbackAdminClient({ kind, endpoint }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpoint, { cache: "no-store" });
      const data = (await res.json()) as { items?: Row[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? "목록을 불러오지 못했습니다.");
        return;
      }
      setRows(data.items ?? []);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    void load();
  }, [load]);

  const items: RatingItem[] =
    kind === "satisfaction" ? SATISFACTION_ITEMS : kind === "staff" ? STAFF_EVAL_ITEMS : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">총 {rows.length}건</p>
        <button type="button" onClick={load} className="text-xs text-(--brand) hover:underline">
          새로고침
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-gray-400 py-6 text-center">불러오는 중...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">아직 접수된 내역이 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="font-semibold text-gray-800">
                    {r.name}
                    {r.login_id && (
                      <span className="ml-2 text-xs text-gray-400">@{r.login_id}</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {kind === "inquiry" && (
                      <>
                        {[r.company, r.department, r.country].filter(Boolean).join(" · ")}
                        {r.email ? ` · ${r.email}` : ""}
                        {r.phone ? ` · ${r.phone}` : ""}
                      </>
                    )}
                    {kind === "satisfaction" && (
                      <>{[r.company, r.email].filter(Boolean).join(" · ")}</>
                    )}
                    {kind === "staff" && <>{r.department ?? ""}</>}
                  </p>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">{r.created_at}</span>
              </div>

              {kind === "inquiry" ? (
                <div>
                  {r.category && (
                    <span className="inline-block mb-1.5 text-[11px] font-semibold text-(--brand) bg-(--brand)/10 rounded px-2 py-0.5">
                      {r.category}
                    </span>
                  )}
                  <p className="text-sm font-semibold text-(--brand) mb-1">{r.subject}</p>
                  <p className="text-sm text-gray-600 whitespace-pre-line">{r.message}</p>
                  {r.website && (
                    <p className="text-xs text-gray-400 mt-2">웹사이트: {r.website}</p>
                  )}
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 mb-3">
                    {items.map((it) => {
                      const score = parseRatings(r.ratings)[it.key];
                      return (
                        <div key={it.key} className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">{it.label}</span>
                          <Stars score={score ?? 0} />
                        </div>
                      );
                    })}
                  </div>
                  {r.comment && (
                    <p className="text-sm text-gray-600 whitespace-pre-line border-t border-gray-100 pt-2">
                      {r.comment}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stars({ score }: { score: number }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-[#f5b301] tracking-tight" aria-hidden>
        {Array.from({ length: RATING_MAX }, (_, i) => (i < score ? "★" : "☆")).join("")}
      </span>
      <span className="text-xs text-gray-400">{score || "-"}</span>
    </span>
  );
}
