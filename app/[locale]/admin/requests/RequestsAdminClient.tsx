"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { common } from "@/src/lib/adminMessages";
import { useAdminLocale } from "@/src/lib/useAdminLocale";
import {
  STATUS,
  STATUS_LABELS,
  SERVICE_TYPE_LABELS,
  SERVICE_TYPES,
  statusLabel,
  type ServiceType,
  type RequestStatus,
} from "@/src/lib/serviceRequestTypes";
import type { ServiceRequest } from "@/src/lib/serviceRequestTypes";

interface ListResult {
  items: ServiceRequest[];
  total: number;
  page: number;
  pageSize: number;
}

const SORTS = [
  { v: "recent", label: "최근 신청순" },
  { v: "updated", label: "최근 변경순" },
  { v: "oldest", label: "오래된 요청순" },
  { v: "request_number", label: "접수번호순" },
];

export default function RequestsAdminClient() {
  const t = common(useAdminLocale());
  const [data, setData] = useState<ListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [serviceType, setServiceType] = useState("");
  const [status, setStatus] = useState("");
  const [company, setCompany] = useState("");
  const [reqNo, setReqNo] = useState("");
  const [completed, setCompleted] = useState("");
  const [sort, setSort] = useState("recent");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sp = new URLSearchParams();
      if (serviceType) sp.set("service_type", serviceType);
      if (status) sp.set("status", status);
      if (company) sp.set("company_name", company);
      if (reqNo) sp.set("request_number", reqNo);
      if (completed) sp.set("completed", completed);
      if (fromDate) sp.set("from_date", fromDate);
      if (toDate) sp.set("to_date", toDate);
      sp.set("sort", sort);
      sp.set("page", String(page));
      const res = await fetch(`/api/admin/requests?${sp.toString()}`, { cache: "no-store" });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? "불러오기 실패"); return; }
      setData(d as ListResult);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [serviceType, status, company, reqNo, completed, sort, fromDate, toDate, page]);

  useEffect(() => { void load(); }, [load]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-4">
      {/* 상단 액션 */}
      <div className="flex justify-end">
        <Link
          href="/admin/requests/dashboard"
          className="inline-flex items-center gap-1.5 rounded-md bg-(--brand) px-3.5 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          📊 의뢰 현황 대시보드
        </Link>
      </div>

      {/* 필터 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
        <Select label="서비스" value={serviceType} onChange={(v) => { setPage(1); setServiceType(v); }} options={[["", "전체"], ...SERVICE_TYPES.map((s) => [s, SERVICE_TYPE_LABELS[s as ServiceType]] as [string, string])]} />
        <Select label="상태" value={status} onChange={(v) => { setPage(1); setStatus(v); }} options={[["", "전체"], ...(Object.keys(STATUS) as RequestStatus[]).map((s) => [s, STATUS_LABELS[s]] as [string, string])]} />
        <Select label="완료여부" value={completed} onChange={(v) => { setPage(1); setCompleted(v); }} options={[["", "전체"], ["0", "진행중"], ["1", "완료"]]} />
        <Select label="정렬" value={sort} onChange={setSort} options={SORTS.map((s) => [s.v, s.label])} />
        <Text label="회사명" value={company} onChange={(v) => { setPage(1); setCompany(v); }} />
        <Text label="접수번호" value={reqNo} onChange={(v) => { setPage(1); setReqNo(v); }} />
        <Text label="신청일 From" type="date" value={fromDate} onChange={(v) => { setPage(1); setFromDate(v); }} />
        <Text label="신청일 To" type="date" value={toDate} onChange={(v) => { setPage(1); setToDate(v); }} />
      </div>

      {error && <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2">{error}</div>}

      {loading ? (
        <p className="text-sm text-gray-400">{t.loading}</p>
      ) : !data || data.items.length === 0 ? (
        <p className="text-sm text-gray-400">조건에 맞는 의뢰가 없습니다.</p>
      ) : (
        <>
          <p className="text-xs text-gray-500">총 {data.total}건</p>
          <div className="overflow-x-auto bg-white border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                  <th className="px-3 py-2">접수번호</th>
                  <th className="px-3 py-2">서비스</th>
                  <th className="px-3 py-2">회사명</th>
                  <th className="px-3 py-2">제목</th>
                  <th className="px-3 py-2">상태</th>
                  <th className="px-3 py-2">신청일</th>
                  <th className="px-3 py-2">변경일</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs">
                      <Link href={`/admin/requests/${r.id}`} className="text-(--brand) underline">
                        {r.request_number ?? "미발급"}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-xs">{SERVICE_TYPE_LABELS[r.service_type as ServiceType]}</td>
                    <td className="px-3 py-2">{r.company_name}</td>
                    <td className="px-3 py-2">{r.title}</td>
                    <td className="px-3 py-2">
                      <span className="rounded-full bg-(--brand)/10 text-(--brand) text-xs font-semibold px-2 py-0.5">
                        {statusLabel(r.status)} ({r.workflow_step})
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">{(r.submitted_at ?? r.created_at)?.slice(0, 10)}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">{r.updated_at?.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-center gap-2">
            <button className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>이전</button>
            <span className="text-sm text-gray-500">{data.page} / {totalPages}</span>
            <button className="rounded border border-gray-300 px-3 py-1 text-sm disabled:opacity-40" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>다음</button>
          </div>
        </>
      )}
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold text-gray-500">{label}</span>
      <select className="rounded border border-gray-300 px-2 py-1.5 text-sm bg-white" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}
function Text({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold text-gray-500">{label}</span>
      <input type={type} className="rounded border border-gray-300 px-2 py-1.5 text-sm" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
