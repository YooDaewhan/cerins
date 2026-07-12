"use client";

import { useEffect, useState, useCallback } from "react";
import type { ServiceDocumentRequirement } from "@/src/lib/scrapIndiaTypes";

interface Props {
  serviceType: string;
  workflowStep: number;
}

export default function DocumentRequirementsClient({ serviceType, workflowStep }: Props) {
  const [items, setItems] = useState<ServiceDocumentRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // 신규 등록 폼.
  const [newName, setNewName] = useState("");
  const [newRequired, setNewRequired] = useState(true);
  const [newMultiple, setNewMultiple] = useState(true);
  const [newDesc, setNewDesc] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/requests/document-requirements?service_type=${encodeURIComponent(serviceType)}&step=${workflowStep}`,
        { cache: "no-store" },
      );
      const d = (await res.json()) as { items?: ServiceDocumentRequirement[]; error?: string };
      if (!res.ok) { setError(d.error ?? "불러오기 실패"); return; }
      setItems(d.items ?? []);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [serviceType, workflowStep]);

  useEffect(() => { void load(); }, [load]);

  async function create() {
    if (!newName.trim()) { setError("서류 표시명을 입력하세요."); return; }
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/admin/requests/document-requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_type: serviceType,
          workflow_step: workflowStep,
          display_name: newName.trim(),
          description: newDesc.trim() || null,
          is_required: newRequired,
          allows_multiple: newMultiple,
        }),
      });
      const d = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !d.ok) { setError(d.error ?? "등록 실패"); return; }
      setNewName(""); setNewDesc(""); setNewRequired(true); setNewMultiple(true);
      await load();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function patch(id: number, body: Record<string, unknown>) {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/admin/requests/document-requirements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !d.ok) { setError(d.error ?? "수정 실패"); return; }
      await load();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  const inputCls = "rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-(--brand) focus:outline-none";

  return (
    <div className="space-y-6">
      {error && <div className="rounded-md bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2">{error}</div>}

      {/* 신규 등록 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-gray-800">서류 항목 추가</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-gray-600">
            서류 표시명
            <input className={`${inputCls} w-full mt-1`} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="예: 통관 서류" />
          </label>
          <label className="text-xs font-semibold text-gray-600">
            설명 (선택)
            <input className={`${inputCls} w-full mt-1`} value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
          </label>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={newRequired} onChange={(e) => setNewRequired(e.target.checked)} /> 필수</label>
          <label className="flex items-center gap-1.5"><input type="checkbox" checked={newMultiple} onChange={(e) => setNewMultiple(e.target.checked)} /> 여러 파일 허용</label>
          <button className="rounded-md bg-(--brand) text-white text-sm font-semibold px-4 py-1.5 disabled:opacity-50" disabled={busy || !newName.trim()} onClick={create}>추가</button>
        </div>
      </div>

      {/* 목록 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-bold text-gray-800 mb-3">등록된 항목 (step {workflowStep})</h3>
        {loading ? (
          <p className="text-sm text-gray-400">불러오는 중...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-400">등록된 서류 항목이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {items.map((it) => (
              <li key={it.id} className={`py-3 flex items-center justify-between gap-3 ${it.is_active ? "" : "opacity-50"}`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <input
                      className={`${inputCls} font-semibold`}
                      defaultValue={it.display_name}
                      onBlur={(e) => { if (e.target.value.trim() && e.target.value !== it.display_name) void patch(it.id, { display_name: e.target.value }); }}
                    />
                    <span className="text-[10px] font-mono text-gray-400">{it.document_code}</span>
                  </div>
                  {it.description && <p className="text-xs text-gray-400 mt-0.5">{it.description}</p>}
                </div>
                <div className="flex items-center gap-3 text-xs flex-shrink-0">
                  <label className="flex items-center gap-1"><input type="checkbox" checked={it.is_required} disabled={busy} onChange={(e) => void patch(it.id, { is_required: e.target.checked })} /> 필수</label>
                  <label className="flex items-center gap-1"><input type="checkbox" checked={it.allows_multiple} disabled={busy} onChange={(e) => void patch(it.id, { allows_multiple: e.target.checked })} /> 다중</label>
                  <label className="flex items-center gap-1"><input type="checkbox" checked={it.is_active} disabled={busy} onChange={(e) => void patch(it.id, { is_active: e.target.checked })} /> 활성</label>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
